import { createClient } from "npm:@supabase/supabase-js@2";

function json(data: unknown, status = 200, origin?: string): Response {
  const configured = Deno.env.get("PUBLIC_SITE_URL");
  const allowed = configured ? new URL(configured).origin : "";
  let localOrigin = "";
  try {
    const parsed = new URL(origin ?? "");
    if (parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname)) localOrigin = parsed.origin;
  } catch { /* request without browser origin */ }
  return new Response(JSON.stringify(data), { status, headers: {
    "Access-Control-Allow-Origin": localOrigin || (allowed ? (origin === allowed ? allowed : allowed) : "*"),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  } });
}

async function requireAdmin(req: Request) {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("unauthorized");
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) throw new Error("supabase_not_configured");
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("unauthorized");
  const { data: membership } = await client.from("staff_memberships").select("role").eq("user_id", data.user.id).maybeSingle();
  if (membership?.role !== "admin") throw new Error("forbidden");
  return { userId: data.user.id, client };
}

type Payload = {
  variant_id?: string;
  quantity?: number;
  reason?: string;
  idempotency_key?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedReasons = new Set(["Compra recebida", "Devolução conferida", "Ajuste de inventário"]);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? undefined;
  if (req.method === "OPTIONS") return json({}, 204, origin);
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  if (Number(req.headers.get("content-length") ?? 0) > 8_000) return json({ error: "Requisição muito grande." }, 413, origin);

  try {
    const { userId, client } = await requireAdmin(req);
    const payload = await req.json() as Payload;
    const quantity = Number(payload.quantity);
    if (!payload.variant_id || !uuidPattern.test(payload.variant_id)) return json({ error: "Selecione uma variante válida." }, 400, origin);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10_000) return json({ error: "A quantidade precisa ser um inteiro entre 1 e 10.000." }, 400, origin);
    if (!payload.reason || !allowedReasons.has(payload.reason)) return json({ error: "Selecione um motivo válido." }, 400, origin);

    const idempotencyKey = payload.idempotency_key && uuidPattern.test(payload.idempotency_key)
      ? payload.idempotency_key
      : crypto.randomUUID();
    const { data, error } = await client.rpc("record_stock_incoming", {
      p_variant_id: payload.variant_id,
      p_quantity: quantity,
      p_reason: payload.reason,
      p_actor_user_id: userId,
      p_idempotency_key: idempotencyKey,
    });
    if (error) {
      console.error("admin-stock-entry", error.code, error.message);
      return json({ error: "Não foi possível registrar a entrada de estoque." }, 400, origin);
    }
    return json({ result: data, idempotency_key: idempotencyKey }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "stock_entry_failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return json({ error: status === 401 ? "Entre novamente para continuar." : status === 403 ? "Seu usuário não tem permissão para esta operação." : "Não foi possível concluir a operação." }, status, origin);
  }
});
