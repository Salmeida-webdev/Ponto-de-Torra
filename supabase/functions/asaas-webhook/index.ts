import { adminClient, json } from "../_shared/me.ts";

type AsaasEvent = {
  id?: string;
  event?: string;
  checkout?: { id?: string; status?: string; externalReference?: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const secret = Deno.env.get("ASAAS_WEBHOOK_AUTH_TOKEN") ?? "";
  const supplied = req.headers.get("asaas-access-token") ?? "";
  if (secret.length < 32 || secret.length > 255 || !safeEqual(supplied, secret)) return json({ error: "Não autorizado." }, 401);
  if (Number(req.headers.get("content-length") ?? 0) > 128_000) return json({ error: "Requisição muito grande." }, 413);

  let event: AsaasEvent;
  try {
    event = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }
  if (typeof event.id !== "string" || !event.id.trim() || event.id.length > 200 ||
    typeof event.event !== "string" || !event.event.trim() || event.event.length > 100 ||
    typeof event.checkout?.id !== "string" || !event.checkout.id.trim() || event.checkout.id.length > 200) {
    return json({ error: "Evento incompleto." }, 400);
  }

  const client = adminClient();
  const compact = {
    checkout: {
      id: event.checkout.id,
      status: event.checkout.status ?? null,
      externalReference: event.checkout.externalReference ?? null,
    },
  };
  const stored = await client.from("payment_webhook_events").insert({
    provider: "asaas",
    provider_event_id: event.id,
    event_type: event.event,
    payload_summary: compact,
  });
  if (stored.error && stored.error.code !== "23505") return json({ error: "Não foi possível registrar o evento." }, 500);

  const { data: webhookRow, error: webhookLookupError } = await client.from("payment_webhook_events")
    .select("id,processed_at").eq("provider", "asaas").eq("provider_event_id", event.id).single();
  if (webhookLookupError || !webhookRow) return json({ error: "Não foi possível consultar o evento." }, 500);
  if (webhookRow.processed_at) return json({ received: true, duplicate: true });

  const { data: claimed, error: claimError } = await client.rpc("claim_asaas_webhook_event", { p_event_id: event.id });
  if (claimError) return json({ error: "Não foi possível reservar o processamento do evento." }, 500);
  if (!claimed) return json({ received: true, duplicate: true, in_progress: true });

  try {
    if (!["CHECKOUT_CREATED", "CHECKOUT_PAID", "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED"].includes(event.event)) {
      await client.from("payment_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", webhookRow.id);
      return json({ received: true, ignored: true });
    }

    let { data: payment, error: paymentError } = await client.from("payments")
      .select("id,order_id,amount_cents,provider_external_reference,provider_checkout_id")
      .eq("provider", "asaas").eq("provider_checkout_id", event.checkout.id).maybeSingle();
    if (paymentError) throw new Error("payment_lookup_failed");
    if (!payment && event.checkout.externalReference && UUID.test(event.checkout.externalReference)) {
      const { data: candidate, error: candidateError } = await client.from("payments")
        .select("id,order_id,amount_cents,provider_external_reference,provider_checkout_id")
        .eq("provider", "asaas")
        .eq("order_id", event.checkout.externalReference)
        .eq("provider_external_reference", event.checkout.externalReference)
        .maybeSingle();
      if (candidateError) throw new Error("payment_reference_lookup_failed");
      if (candidate && !candidate.provider_checkout_id) {
        const { error: linkError } = await client.from("payments").update({ provider_checkout_id: event.checkout.id })
          .eq("id", candidate.id).is("provider_checkout_id", null);
        if (linkError) throw new Error("checkout_link_recovery_failed");
        const recovered = await client.from("payments").select("id,order_id,amount_cents,provider_external_reference,provider_checkout_id")
          .eq("provider", "asaas").eq("provider_checkout_id", event.checkout.id).maybeSingle();
        if (recovered.error) throw new Error("checkout_link_recovery_lookup_failed");
        payment = recovered.data;
      }
    }
    if (!payment) throw new Error("checkout_not_linked_yet");
    if (event.checkout.externalReference && event.checkout.externalReference !== payment.order_id) throw new Error("order_reference_mismatch");

    if (event.event === "CHECKOUT_PAID") {
      if (event.checkout.status && event.checkout.status !== "PAID") throw new Error("checkout_status_not_paid");
      const { error } = await client.rpc("commit_order_stock", { p_order_id: payment.order_id });
      if (error) throw new Error("stock_commit_failed");
    } else if (event.event === "CHECKOUT_CANCELED" || event.event === "CHECKOUT_EXPIRED") {
      const { data: order, error: orderError } = await client.from("orders").select("status,expires_at").eq("id", payment.order_id).single();
      if (orderError) throw new Error("order_lookup_failed");
      if (order.status === "awaiting_payment") {
        const reason = event.event === "CHECKOUT_EXPIRED" ? "expired" : "cancelled";
        const { error } = await client.rpc("release_order_stock", { p_order_id: payment.order_id, p_reason: reason });
        if (error) throw new Error("stock_release_failed");
        const { error: paymentUpdateError } = await client.from("payments").update({ status: "cancelled" }).eq("id", payment.id);
        if (paymentUpdateError) throw new Error("payment_status_update_failed");
      } else if (["cancelled", "expired", "payment_failed"].includes(order.status)) {
        const { error: paymentUpdateError } = await client.from("payments").update({ status: "cancelled" }).eq("id", payment.id);
        if (paymentUpdateError) throw new Error("payment_status_update_failed");
      }
    }

    const { error: markError } = await client.from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_error: null, processing_started_at: null }).eq("id", webhookRow.id);
    if (markError) throw new Error("event_mark_processed_failed");
    return json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook_processing_failed";
    await client.from("payment_webhook_events").update({ processing_error: message.slice(0, 500), processing_started_at: null }).eq("id", webhookRow.id);
    console.error("asaas-webhook", message);
    return json({ error: "Evento recebido, mas ainda não processado." }, 500);
  }
});
