import { adminClient, corsHeaders, json, sha256Hex } from "../_shared/me.ts";

type Item = { variant_id: string; quantity: number };

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? undefined;
  if (req.method === "OPTIONS") return new Response("ok", { headers: { ...corsHeaders(origin), "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  if (Number(req.headers.get("content-length") ?? 0) > 16_000) return json({ error: "Requisição muito grande." }, 413, origin);
  try {
    const body = await req.json();
    const code = String(body?.code ?? "").trim().toUpperCase();
    const items = body?.items as Item[];
    if (!/^[A-Z0-9_-]{2,40}$/.test(code) || !Array.isArray(items) || items.length < 1 || items.length > 50
      || items.some((item) => !item || !/^[0-9a-f-]{36}$/i.test(item.variant_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
      return json({ error: "Informe um cupom e um carrinho válidos." }, 400, origin);
    }
    const client = adminClient();
    const pepper = Deno.env.get("RATE_LIMIT_PEPPER") ?? "";
    if (pepper.length < 32) return json({ error: "Validação de cupom temporariamente indisponível." }, 503, origin);
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { data: permitted, error: rateError } = await client.rpc("me_check_quote_rate_limit", { p_key_hash: await sha256Hex(`${pepper}:${ip}`) });
    if (rateError) throw new Error("rate_limit_unavailable");
    if (!permitted) return json({ error: "Muitas tentativas. Aguarde um minuto e tente novamente." }, 429, origin);
    const merged = new Map<string, number>();
    for (const item of items) merged.set(item.variant_id, (merged.get(item.variant_id) ?? 0) + item.quantity);
    const ids = [...merged.keys()];
    const { data: variants, error: variantError } = await client.from("product_variants")
      .select("id,price_cents,products!inner(is_active,archived_at)").in("id", ids).eq("is_active", true).eq("products.is_active", true).is("products.archived_at", null);
    if (variantError || !variants || variants.length !== ids.length) return json({ error: "Um ou mais produtos não estão disponíveis." }, 409, origin);
    const subtotal = variants.reduce((sum, variant) => sum + variant.price_cents * (merged.get(variant.id) ?? 0), 0);
    const { data: coupon, error: couponError } = await client.from("coupons")
      .select("id,code,discount_type,discount_value,minimum_subtotal_cents,usage_limit,usage_count,starts_at,ends_at,is_active")
      .eq("code", code).maybeSingle();
    if (couponError || !coupon || !coupon.is_active || (coupon.starts_at && Date.parse(coupon.starts_at) > Date.now())
      || (coupon.ends_at && Date.parse(coupon.ends_at) <= Date.now())) return json({ error: "Cupom inválido ou fora do período de validade." }, 422, origin);
    if (subtotal < coupon.minimum_subtotal_cents) return json({ error: `O pedido precisa ter subtotal mínimo de R$ ${(coupon.minimum_subtotal_cents / 100).toFixed(2).replace(".", ",")}.` }, 422, origin);
    if (coupon.usage_limit !== null) {
      const { count, error } = await client.from("coupon_redemptions").select("order_id", { count: "exact", head: true }).eq("coupon_id", coupon.id).eq("status", "reserved");
      if (error) throw new Error("coupon_capacity_check_failed");
      if (coupon.usage_count + (count ?? 0) >= coupon.usage_limit) return json({ error: "Este cupom atingiu o limite de usos." }, 422, origin);
    }
    const discount = coupon.discount_type === "percent" ? Math.floor(subtotal * coupon.discount_value / 100) : Math.min(coupon.discount_value, subtotal);
    if (discount < 1) return json({ error: "Este cupom não gera desconto para o carrinho atual." }, 422, origin);
    return json({ code: coupon.code, discount_cents: discount, subtotal_cents: subtotal }, 200, origin);
  } catch (error) {
    console.error("validate-coupon", error instanceof Error ? error.message : "unknown");
    return json({ error: "Não foi possível validar o cupom agora." }, 500, origin);
  }
});
