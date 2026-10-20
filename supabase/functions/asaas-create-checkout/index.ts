import { adminClient, corsHeaders, json } from "../_shared/me.ts";
import { buildAsaasCallbacks, buildAsaasCheckoutUrl, normalizeAsaasApiBase, normalizePublicSiteOrigin } from "../_shared/asaas.ts";
import { normalizeBrazilianPhone } from "../_shared/customer.ts";

type CartItem = { variant_id: string; quantity: number };
type CheckoutRequest = {
  idempotency_key: string;
  shipping_quote_option_id: string;
  customer: { name: string; email: string; phone: string };
  shipping_address: Record<string, unknown>;
  items: CartItem[];
  coupon_code?: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function validRequest(body: unknown): body is CheckoutRequest {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  const customer = value.customer as Record<string, unknown> | null;
  const items = value.items;
  return typeof value.idempotency_key === "string" && value.idempotency_key.length >= 16 && value.idempotency_key.length <= 128
    && typeof value.shipping_quote_option_id === "string" && UUID.test(value.shipping_quote_option_id)
    && !!customer && typeof customer.name === "string" && customer.name.trim().length >= 2 && customer.name.length <= 120
    && typeof customer.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) && customer.email.length <= 254
    && typeof customer.phone === "string" && customer.phone.length <= 30 && normalizeBrazilianPhone(customer.phone) !== null
    && !!value.shipping_address && typeof value.shipping_address === "object" && !Array.isArray(value.shipping_address)
    && Array.isArray(items) && items.length > 0 && items.length <= 50
    && items.every((item) => !!item && typeof item.variant_id === "string" && UUID.test(item.variant_id)
      && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 20)
    && (value.coupon_code === undefined || value.coupon_code === null || (typeof value.coupon_code === "string" && /^[A-Za-z0-9_-]{2,40}$/.test(value.coupon_code)));
}

function requestHash(value: CheckoutRequest): Promise<string> {
  const canonical = JSON.stringify({
    quote: value.shipping_quote_option_id,
    customer: { name: value.customer.name.trim(), email: value.customer.email.trim().toLowerCase(), phone: normalizeBrazilianPhone(value.customer.phone) ?? "" },
    address: value.shipping_address,
    items: [...value.items].sort((a, b) => a.variant_id.localeCompare(b.variant_id)),
    coupon_code: value.coupon_code?.trim().toUpperCase() ?? null,
  });
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical)).then((buffer) =>
    [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? undefined;
  if (req.method === "OPTIONS") return new Response("ok", { headers: { ...corsHeaders(origin), "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, req.headers.get("Origin") ?? undefined);
  if (Number(req.headers.get("content-length") ?? 0) > 32_000) return json({ error: "Requisição muito grande." }, 413, origin);

  let publicSiteOrigin: string;
  let asaasApi: { base: string; sandbox: boolean };
  try {
    publicSiteOrigin = normalizePublicSiteOrigin(Deno.env.get("PUBLIC_SITE_URL"));
    asaasApi = normalizeAsaasApiBase(Deno.env.get("ASAAS_API_BASE_URL"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_configuration_invalid";
    const publicMessage = message === "public_site_url_not_configured"
      ? "Falta configurar a URL HTTPS pública do site no Supabase."
      : message === "public_site_url_invalid"
        ? "A URL pública do site está inválida. Configure apenas a origem HTTPS, sem caminho ou parâmetros."
        : "A URL da API Asaas está inválida. Use o endereço oficial do Sandbox ou Produção.";
    console.error("asaas_checkout_configuration", message);
    return json({ error: publicMessage }, 503, origin);
  }

  const asaasKey = (Deno.env.get("ASAAS_API_KEY") ?? "").trim();
  const serviceUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const pepper = Deno.env.get("RATE_LIMIT_PEPPER") ?? "";
  if (!asaasKey) {
    console.error("asaas_checkout_configuration", "asaas_api_key_not_configured");
    return json({ error: "O pagamento está indisponível porque a chave da Asaas não foi configurada no servidor." }, 503, origin);
  }
  if (!serviceUrl || !serviceKey || pepper.length < 32) {
    return json({ error: "Checkout temporariamente indisponível." }, 503, origin);
  }

  let lockedPaymentId: string | null = null;
  let checkoutRequestSent = false;
  let orderToRelease: string | null = null;
  try {
    const body: unknown = await req.json();
    if (!validRequest(body)) return json({ error: "Dados do pedido inválidos." }, 400, origin);
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const client = adminClient();
    const ipHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${pepper}:${ip}`));
    const ipHashHex = [...new Uint8Array(ipHash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const { data: permitted, error: rateError } = await client.rpc("me_check_quote_rate_limit", { p_key_hash: ipHashHex });
    if (rateError) throw new Error("rate_limit_unavailable");
    if (!permitted) return json({ error: "Muitas tentativas. Aguarde um minuto e tente novamente." }, 429, origin);

    const merged = [...body.items.reduce((map, item) => map.set(item.variant_id, (map.get(item.variant_id) ?? 0) + item.quantity), new Map<string, number>())]
      .map(([variant_id, quantity]) => ({ variant_id, quantity }));
    if (merged.some((item) => item.quantity > 20)) return json({ error: "Quantidade acima do limite por produto." }, 400, origin);
    const { data: fingerprint, error: fingerprintError } = await client.rpc("me_cart_fingerprint", { p_items: merged });
    if (fingerprintError || typeof fingerprint !== "string") throw new Error("cart_fingerprint_failed");

    const couponCode = body.coupon_code?.trim().toUpperCase() || null;
    if (couponCode) {
      const { data: coupon, error: couponError } = await client.from("coupons")
        .select("discount_type,discount_value").eq("code", couponCode).maybeSingle();
      if (couponError) throw new Error("coupon_lookup_failed");
      if (coupon?.discount_type === "percent" && (!Number.isInteger(coupon.discount_value) || coupon.discount_value < 1 || coupon.discount_value > 90)) {
        return json({ error: "Este cupom percentual excede o limite permitido. Escolha outro cupom." }, 409, origin);
      }
    }

    const rpc = await client.rpc("create_order_and_reserve", {
      p_idempotency_key: body.idempotency_key,
      p_request_hash: await requestHash(body),
      p_cart_fingerprint: fingerprint,
      p_shipping_quote_option_id: body.shipping_quote_option_id,
      p_customer_name: body.customer.name.trim(),
      p_customer_email: body.customer.email.trim().toLowerCase(),
      p_customer_phone: body.customer.phone.trim(),
      p_shipping_address: body.shipping_address,
      p_items: merged,
      p_coupon_code: couponCode,
    });
    if (rpc.error || !Array.isArray(rpc.data) || !rpc.data[0]) {
      const code = rpc.error?.message ?? "order_creation_failed";
      const message = code.includes("stock") ? "Estoque insuficiente para um dos produtos."
        : code.includes("coupon_minimum_not_met") ? "O pedido não atingiu o subtotal mínimo do cupom."
        : code.includes("coupon_limit_reached") ? "Este cupom atingiu o limite de usos."
        : code.includes("coupon_invalid") ? "O cupom não está mais válido. Confira a validade e tente novamente."
        : "Não foi possível criar o pedido. Confira o frete e tente novamente.";
      return json({ error: message }, 409, origin);
    }
    const order = rpc.data[0] as { order_id: string; order_number: number; total_cents: number; expires_at: string };
    orderToRelease = order.order_id;
    const paymentKey = `asaas:${order.order_id}`;
    const orderState = await client.from("orders").select("status,expires_at").eq("id", order.order_id).single();
    if (orderState.error || !orderState.data) throw new Error("order_lookup_failed");
    if (orderState.data.status === "awaiting_payment" && new Date(orderState.data.expires_at).getTime() <= Date.now()) {
      await client.rpc("release_order_stock", { p_order_id: order.order_id, p_reason: "expired" });
      return json({ error: "Este pedido expirou. Atualize o frete e gere um novo pedido." }, 409, origin);
    }
    if (orderState.data.status !== "awaiting_payment") {
      return json({ error: "Este pedido expirou. Atualize o frete e gere um novo pedido." }, 409, origin);
    }

    let payment = await client.from("payments").select("id,provider_checkout_id,provider_external_reference,status")
      .eq("provider", "asaas").eq("idempotency_key", paymentKey).maybeSingle();
    if (payment.error) throw new Error("payment_lookup_failed");
    if (payment.data?.provider_checkout_id) {
      return json({ order_id: order.order_id, order_number: order.order_number, checkout_url: buildAsaasCheckoutUrl(payment.data.provider_checkout_id, asaasApi.sandbox), expires_at: order.expires_at }, 200, origin);
    }
    if (payment.data) return json({ error: "Checkout em processamento. Aguarde alguns instantes antes de tentar novamente." }, 202, origin);

    const inserted = await client.from("payments").insert({
      order_id: order.order_id,
      provider: "asaas",
      provider_external_reference: order.order_id,
      status: "pending",
      amount_cents: order.total_cents,
      currency: "BRL",
      idempotency_key: paymentKey,
    }).select("id").single();
    if (inserted.error) {
      payment = await client.from("payments").select("id,provider_checkout_id,provider_external_reference,status")
        .eq("provider", "asaas").eq("idempotency_key", paymentKey).maybeSingle();
      if (payment.data) return json({ error: "Checkout em processamento. Aguarde alguns instantes antes de tentar novamente." }, 202, origin);
      throw new Error("payment_record_failed");
    }
    lockedPaymentId = inserted.data.id;

    const { data: orderItems, error: itemsError } = await client.from("order_items")
      .select("product_id,product_name_snapshot,sku_snapshot,quantity,unit_price_cents")
      .eq("order_id", order.order_id);
    if (itemsError || !orderItems?.length) throw new Error("order_items_missing");
    const productIds = [...new Set(orderItems.map((item) => item.product_id).filter((id): id is string => !!id))];
    const { data: images, error: imagesError } = await client.from("product_images")
      .select("product_id,storage_path").in("product_id", productIds).eq("is_primary", true).is("variant_id", null);
    if (imagesError || !images || images.length !== productIds.length) {
      await client.from("payments").delete().eq("id", inserted.data.id);
      lockedPaymentId = null;
      await client.rpc("release_order_stock", { p_order_id: order.order_id, p_reason: "payment_failed" });
      orderToRelease = null;
      return json({ error: "Produto sem imagem principal publicada no catálogo." }, 422, origin);
    }
    const imagePaths = new Map(images.map((image) => [image.product_id, image.storage_path]));
    const bucket = Deno.env.get("PRODUCT_IMAGES_BUCKET") ?? "product-images";
    const imageCache = new Map<string, string>();
    const imageFor = async (productId: string): Promise<string> => {
      const path = imagePaths.get(productId);
      if (!path) throw new Error("product_image_missing");
      const cached = imageCache.get(path);
      if (cached) return cached;
      const result = await client.storage.from(bucket).download(path);
      if (result.error || !result.data) throw new Error("product_image_unavailable");
      const bytes = new Uint8Array(await result.data.arrayBuffer());
      if (!bytes.length || bytes.length > 4_000_000) throw new Error("product_image_invalid");
      const encoded = base64(bytes);
      imageCache.set(path, encoded);
      return encoded;
    };

    const { data: orderData, error: orderError } = await client.from("orders").select("subtotal_cents,discount_cents,shipping_cents,shipping_address")
      .eq("id", order.order_id).single();
    if (orderError || !orderData) throw new Error("order_lookup_failed");
    const productsSubtotal = orderItems.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);
    if (productsSubtotal !== orderData.subtotal_cents) throw new Error("checkout_subtotal_mismatch");
    const itemsTotal = productsSubtotal - orderData.discount_cents + orderData.shipping_cents;
    if (itemsTotal !== order.total_cents) throw new Error("checkout_total_mismatch");
    const portions = orderItems.map((item) => {
      const lineCents = item.unit_price_cents * item.quantity;
      const exactShare = productsSubtotal ? orderData.discount_cents * lineCents / productsSubtotal : 0;
      return { item, cents: lineCents - Math.floor(exactShare), fraction: exactShare - Math.floor(exactShare) };
    });
    let remainingDiscount = orderData.discount_cents - portions.reduce((sum, portion) => sum + portion.item.unit_price_cents * portion.item.quantity - portion.cents, 0);
    for (const portion of [...portions].sort((a, b) => b.fraction - a.fraction)) {
      if (remainingDiscount <= 0) break;
      portion.cents -= 1;
      remainingDiscount -= 1;
    }
    const asaasItems = [];
    for (const portion of portions) {
      const item = portion.item;
      if (!item.product_id) throw new Error("order_product_missing");
      if (portion.cents <= 0) continue;
      asaasItems.push({
        externalReference: item.sku_snapshot,
        name: `${String(item.product_name_snapshot).slice(0, 23)} × ${item.quantity}`.slice(0, 30),
        description: `${item.sku_snapshot} · ${item.quantity} unidade(s)`.slice(0, 150),
        imageBase64: await imageFor(item.product_id),
        quantity: 1,
        value: Number((portion.cents / 100).toFixed(2)),
      });
    }
    if (orderData.shipping_cents > 0) {
      const shippingImage = await imageFor(orderItems[0].product_id!);
      asaasItems.push({ name: "Frete", description: "Envio do pedido", imageBase64: shippingImage, quantity: 1, value: Number((orderData.shipping_cents / 100).toFixed(2)) });
    }

    const address = orderData.shipping_address as Record<string, unknown>;
    const callback = buildAsaasCallbacks(publicSiteOrigin, order.order_number);
    const remainingMinutes = Math.floor((new Date(order.expires_at).getTime() - Date.now()) / 60_000);
    if (remainingMinutes < 10) {
      await client.from("payments").delete().eq("id", inserted.data.id);
      lockedPaymentId = null;
      await client.rpc("release_order_stock", { p_order_id: order.order_id, p_reason: "payment_failed" });
      orderToRelease = null;
      return json({ error: "O prazo deste pedido venceu. Atualize o frete e gere um novo pedido." }, 409, origin);
    }
    const checkoutPayload = {
      billingTypes: ["PIX", "CREDIT_CARD"],
      chargeTypes: ["DETACHED"],
      minutesToExpire: Math.min(20, remainingMinutes),
      externalReference: order.order_id,
      callback,
      items: asaasItems,
    };
    const response = await fetch(`${asaasApi.base}/checkouts`, {
      method: "POST",
      headers: { access_token: asaasKey, Accept: "application/json", "Content-Type": "application/json", "User-Agent": "Ponto-de-Torra/1.0" },
      body: JSON.stringify(checkoutPayload),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    checkoutRequestSent = true;
    if (!response) {
      return json({ error: "Não foi possível confirmar se o checkout foi criado. Aguarde e tente novamente mais tarde.", order_number: order.order_number }, 202, origin);
    }
    if (!response.ok) {
      const providerBody = await response.json().catch(() => ({})) as { errors?: Array<{ code?: string; description?: string }> };
      const providerErrors = Array.isArray(providerBody.errors) ? providerBody.errors : [];
      const sensitiveValues = [
        body.customer.name,
        body.customer.email,
        body.customer.phone ?? "",
        ...Object.values(address).filter((value): value is string => typeof value === "string"),
        ...orderItems.map((item) => item.sku_snapshot),
        ...orderItems.map((item) => item.product_name_snapshot),
        order.order_id,
      ].filter((value) => value.length >= 3);
      const safeProviderErrors = providerErrors.slice(0, 3).map((item) => {
        let description = String(item.description ?? "").slice(0, 500);
        for (const value of sensitiveValues) description = description.split(value).join("[redacted]");
        description = description
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
          .replace(/\b\d{8,}\b/g, "[number]");
        return { code: String(item.code ?? "unknown").slice(0, 80), description: description.slice(0, 240) };
      });
      console.error("asaas_checkout_rejected", JSON.stringify({ status: response.status, errors: safeProviderErrors }));
      await client.from("payments").delete().eq("id", inserted.data.id);
      lockedPaymentId = null;
      await client.rpc("release_order_stock", { p_order_id: order.order_id, p_reason: "payment_failed" });
      orderToRelease = null;
      const errorMessage = response.status === 401
        ? "O Asaas não autenticou a requisição. A chave pode estar ausente, inválida, revogada ou ser de outro ambiente."
        : "O Asaas recusou a criação do checkout. Confira os dados do pedido, URLs de retorno e a configuração da conta.";
      return json({ error: errorMessage }, 502, origin);
    }
    const result = await response.json() as { id?: string; link?: string };
    if (!result.id) throw new Error("asaas_checkout_response_invalid");
    const saved = await client.from("payments").update({
      provider_checkout_id: result.id,
      provider_external_reference: order.order_id,
    }).eq("id", inserted.data.id);
    if (saved.error) throw new Error("checkout_persist_failed");
    lockedPaymentId = null;
    orderToRelease = null;
    const providerLink = buildAsaasCheckoutUrl(result.id, asaasApi.sandbox, result.link);
    return json({ order_id: order.order_id, order_number: order.order_number, checkout_url: providerLink, expires_at: order.expires_at }, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_failed";
    if (!checkoutRequestSent && lockedPaymentId && orderToRelease) {
      const cleanupClient = adminClient();
      await cleanupClient.from("payments").delete().eq("id", lockedPaymentId);
      await cleanupClient.rpc("release_order_stock", { p_order_id: orderToRelease, p_reason: "payment_failed" });
    }
    console.error("asaas-create-checkout", message);
    const publicMessage = message === "public_site_url_not_configured"
      ? "Falta configurar a URL pública segura do site no Supabase. Nenhum pagamento foi confirmado."
      : message === "public_site_url_invalid" || message === "public_site_url_must_be_https"
        ? "A URL pública do site precisa começar com https://. Nenhum pagamento foi confirmado."
        : message === "product_image_missing" || message === "product_image_unavailable" || message === "product_image_invalid"
          ? "Não foi possível carregar a imagem de um produto para o checkout. Revise as imagens do catálogo."
          : message === "rate_limit_unavailable"
            ? "A proteção contra tentativas está temporariamente indisponível. Tente novamente em instantes."
            : message === "checkout_subtotal_mismatch" || message === "checkout_total_mismatch"
              ? "O total do carrinho mudou durante a finalização. Atualize a página e tente novamente."
              : "Não foi possível iniciar o pagamento agora. Nenhum pagamento foi confirmado. Tente novamente e, se persistir, informe este horário ao suporte.";
    return json({ error: publicMessage }, 502, origin);
  }
});
