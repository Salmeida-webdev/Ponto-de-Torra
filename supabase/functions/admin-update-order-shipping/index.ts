import { corsHeaders, json, requireAdmin } from "../_shared/me.ts";

type Payload = {
  order_id?: string;
  target_status?: "processing" | "shipped" | "delivered";
  carrier?: string;
  tracking_code?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? undefined;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...corsHeaders(origin), "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  if (Number(req.headers.get("content-length") ?? 0) > 8_000) return json({ error: "Requisição muito grande." }, 413, origin);

  try {
    const { client } = await requireAdmin(req);
    const payload = await req.json() as Payload;
    if (!payload.order_id || !uuidPattern.test(payload.order_id)) return json({ error: "Pedido inválido." }, 400, origin);
    if (!payload.target_status || !["processing", "shipped", "delivered"].includes(payload.target_status)) return json({ error: "Status inválido." }, 400, origin);

    const { data, error } = await client.rpc("admin_update_order_shipping", {
      p_order_id: payload.order_id,
      p_target_status: payload.target_status,
      p_carrier: payload.carrier?.trim() || null,
      p_tracking_code: payload.tracking_code?.trim() || null,
    });
    if (error) {
      console.error("admin-update-order-shipping", error.code, error.message);
      const status = error.code === "P0002" ? 404 : error.code === "23514" ? 409 : error.code === "22023" ? 400 : 500;
      return json({ error: status === 404 ? "Pedido ou envio não encontrado." : status === 409 ? "A transição não é permitida ou o pagamento ainda não foi confirmado pelo Asaas." : status === 400 ? "Confira o código de rastreio e a transportadora." : "Não foi possível atualizar o pedido." }, status, origin);
    }
    return json({ result: data }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "order_update_failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    console.error("admin-update-order-shipping", message);
    return json({ error: status === 401 ? "Entre novamente para continuar." : status === 403 ? "Seu usuário não tem permissão para esta operação." : "Não foi possível atualizar o pedido." }, status, origin);
  }
});
