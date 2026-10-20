import { apiBase, appUserAgent, clientId, corsHeaders, json, redirectUri, requireAdmin } from "../_shared/me.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? undefined;
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  try {
    const { userId, client } = await requireAdmin(req);
    if (!clientId || !redirectUri || !appUserAgent.includes("@")) return json({ error: "OAuth da Melhor Envio ainda não foi configurado." }, 503, origin);
    const requestOrigin = req.headers.get("Origin") ?? "";
    let returnOrigin = new URL(Deno.env.get("PUBLIC_SITE_URL") ?? "http://localhost:5173").origin;
    try {
      const requested = new URL(requestOrigin);
      if (requested.protocol === "http:" && ["localhost", "127.0.0.1"].includes(requested.hostname)) returnOrigin = requested.origin;
    } catch { /* Usa a origem pública configurada quando não há Origin válida. */ }
    const encodedOrigin = btoa(returnOrigin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const state = `${crypto.randomUUID()}.${encodedOrigin}`;
    const stateHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
    const hash = [...new Uint8Array(stateHash)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await client.rpc("me_save_oauth_state", { p_state_hash: hash, p_user_id: userId });
    if (error) throw new Error("oauth_state_store_failed");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      scope: "shipping-calculate",
    });
    return json({ authorization_url: `${apiBase}/oauth/authorize?${params}` }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "request_failed";
    return json({ error: message === "unauthorized" ? "Sessão administrativa necessária." : message === "forbidden" ? "Apenas administradores podem conectar o frete." : "Não foi possível iniciar a conexão." }, message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500, origin);
  }
});
