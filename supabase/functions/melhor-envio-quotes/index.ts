import { accessToken, adminClient, apiBase, appUserAgent, corsHeaders, getDimensions, json, normalizedCep, sha256Hex } from "../_shared/me.ts";

type CartItem = { variant_id: string; quantity: number };
type Variant = {
  id: string; price_cents: number; stock_on_hand: number; stock_reserved: number;
  weight_grams: number | null; dimensions_mm: Record<string, unknown>;
  products: { name: string; is_active: boolean; archived_at: string | null };
};

function toCents(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric * 100) : null;
}

function getServices(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  for (const key of ["services", "data", "shipping"]) {
    if (Array.isArray(p[key])) return (p[key] as unknown[]).filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  }
  return [];
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? undefined;
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);

  try {
    const body = await req.json();
    const cep = normalizedCep(body?.postal_code ?? body?.cep);
    const items = body?.items as CartItem[];
    if (!/^\d{8}$/.test(cep) || !Array.isArray(items) || items.length < 1 || items.length > 50) {
      return json({ error: "Informe CEP e itens válidos para calcular o frete." }, 400, origin);
    }
    const merged = new Map<string, number>();
    for (const item of items) {
      if (!item || typeof item.variant_id !== "string" || !/^[0-9a-f-]{36}$/i.test(item.variant_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        return json({ error: "Carrinho inválido." }, 400, origin);
      }
      merged.set(item.variant_id, (merged.get(item.variant_id) ?? 0) + item.quantity);
      if ((merged.get(item.variant_id) ?? 0) > 20) return json({ error: "Quantidade acima do limite por item." }, 400, origin);
    }

    const pepper = Deno.env.get("RATE_LIMIT_PEPPER") ?? "";
    if (pepper.length < 32) return json({ error: "Cotação temporariamente indisponível." }, 503, origin);
    const sourceIp = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const client = adminClient();
    const { data: permitted, error: rateError } = await client.rpc("me_check_quote_rate_limit", { p_key_hash: await sha256Hex(`${pepper}:${sourceIp}`) });
    if (rateError) throw new Error("rate_limit_unavailable");
    if (!permitted) return json({ error: "Muitas cotações em sequência. Aguarde um minuto e tente novamente." }, 429, origin);

    const itemList = [...merged].map(([variant_id, quantity]) => ({ variant_id, quantity }));
    const { data: variants, error: variantError } = await client.from("product_variants")
      .select("id,price_cents,stock_on_hand,stock_reserved,weight_grams,dimensions_mm,products!inner(name,is_active,archived_at)")
      .in("id", itemList.map((x) => x.variant_id)).eq("is_active", true).eq("products.is_active", true).is("products.archived_at", null);
    if (variantError || !variants || variants.length !== itemList.length) return json({ error: "Um ou mais produtos não estão disponíveis." }, 409, origin);

    const cartProducts = [];
    for (const variant of variants as unknown as Variant[]) {
      const quantity = merged.get(variant.id) ?? 0;
      if (variant.stock_on_hand - variant.stock_reserved < quantity) return json({ error: `${variant.products.name} não tem estoque suficiente.` }, 409, origin);
      if (!variant.weight_grams || variant.weight_grams < 1) return json({ error: "O peso de um produto ainda precisa ser cadastrado." }, 422, origin);
      const dimensions = getDimensions(variant.dimensions_mm);
      cartProducts.push({
        id: variant.id,
        ...dimensions,
        weight: Number((variant.weight_grams / 1000).toFixed(3)),
        insurance_value: Number((variant.price_cents / 100).toFixed(2)),
        quantity,
      });
    }

    const fromCep = normalizedCep(Deno.env.get("STORE_ORIGIN_POSTAL_CODE"));
    if (!/^\d{8}$/.test(fromCep)) return json({ error: "CEP de origem da loja ainda não foi configurado." }, 503, origin);
    const fingerprintResult = await client.rpc("me_cart_fingerprint", { p_items: itemList });
    if (fingerprintResult.error || typeof fingerprintResult.data !== "string") throw new Error("cart_fingerprint_failed");
    const token = await accessToken(client);
    const quoteResponse = await fetch(`${apiBase}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", "User-Agent": appUserAgent },
      body: JSON.stringify({ from: { postal_code: fromCep }, to: { postal_code: cep }, products: cartProducts, options: { receipt: false, own_hand: false } }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!quoteResponse.ok) return json({ error: "Não foi possível calcular o frete agora." }, quoteResponse.status === 401 ? 503 : 502, origin);
    const services = getServices(await quoteResponse.json());
    const quoteGroupId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const records = services.flatMap((service) => {
      const company = service.company && typeof service.company === "object" ? service.company as Record<string, unknown> : {};
      const serviceId = String(service.id ?? service.service_id ?? "");
      const companyId = String(company.id ?? service.company_id ?? "");
      const price = toCents(service.custom_price ?? service.price);
      const serviceName = String(service.name ?? service.service_name ?? "").trim();
      const companyName = String(company.name ?? service.company_name ?? "").trim();
      if (!serviceId || !companyId || !serviceName || !companyName || price === null) return [];
      const delivery = Number(service.custom_delivery_time ?? service.delivery_time ?? service.delivery_days);
      const days = Number.isFinite(delivery) && delivery >= 0 ? Math.ceil(delivery) : null;
      return [{
        quote_group_id: quoteGroupId,
        cart_fingerprint: fingerprintResult.data,
        recipient_postal_code: cep,
        company_id: companyId,
        company_name: companyName,
        service_id: serviceId,
        service_name: serviceName,
        price_cents: price,
        delivery_days: days,
        packages: Array.isArray(service.packages) ? service.packages : [],
        provider_metadata: {},
        expires_at: expiresAt,
      }];
    });
    const deduplicated = [...new Map(records.map((record) => [`${record.company_id}:${record.service_id}`, record])).values()];
    if (!deduplicated.length) return json({ error: "Nenhuma opção de frete disponível para este CEP." }, 200, origin);
    const cleanup = await client.from("shipping_quote_options").delete().lt("expires_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString());
    if (cleanup.error) throw new Error("quote_cleanup_failed");
    const { data: saved, error: saveError } = await client.from("shipping_quote_options").insert(deduplicated).select("id,company_name,service_name,price_cents,delivery_days,expires_at");
    if (saveError || !saved) throw new Error("quote_persist_failed");
    return json({ quotes: saved, expires_at: expiresAt }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "quote_failed";
    const status = message === "melhor_envio_authorization_missing" || message.includes("not_configured") ? 503 : 502;
    return json({ error: status === 503 ? "A integração de frete ainda não está conectada." : "Não foi possível calcular o frete agora." }, status, origin);
  }
});
