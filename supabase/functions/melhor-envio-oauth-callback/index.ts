import { adminClient, apiBase, appUserAgent, clientId, clientSecret, normalizeTokenResponse, redirect, redirectUri, sha256Hex, siteUrl } from "../_shared/me.ts";

function finish(status: string, state?: string | null): Response {
	let returnOrigin = new URL(siteUrl).origin;
	try {
		const encodedOrigin = state?.split(".")[1]?.replaceAll("-", "+").replaceAll("_", "/");
		if (encodedOrigin) {
			const decoded = atob(encodedOrigin.padEnd(Math.ceil(encodedOrigin.length / 4) * 4, "="));
			const candidate = new URL(decoded);
			const local = candidate.protocol === "http:" && ["localhost", "127.0.0.1"].includes(candidate.hostname);
			const configured = candidate.origin === new URL(siteUrl).origin;
			if (local || configured) returnOrigin = candidate.origin;
		}
	} catch { /* Usa a origem pública configurada quando o retorno local não é válido. */ }
	const target = new URL("/painel", returnOrigin);
  target.searchParams.set("melhor_envio", status);
  return redirect(target.toString());
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
	if (url.searchParams.has("error") || !code || !state || state.length > 256 || !clientId || !clientSecret || !redirectUri || !appUserAgent.includes("@")) return finish("error", state);

  try {
    const client = adminClient();
    const { data: userId, error: stateError } = await client.rpc("me_consume_oauth_state", { p_state_hash: await sha256Hex(state) });
		if (stateError || !userId) return finish("invalid_state", state);

    const response = await fetch(`${apiBase}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": appUserAgent },
      body: JSON.stringify({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }),
      signal: AbortSignal.timeout(12_000),
    });
		if (!response.ok) return finish("token_exchange_failed", state);
    const tokens = normalizeTokenResponse(await response.json());
		if (typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string") return finish("token_exchange_failed", state);
    const now = Date.now();
    const accessExpires = new Date(now + Number(tokens.expires_in ?? 30 * 86400) * 1000).toISOString();
    const refreshExpires = new Date(now + Number(tokens.refresh_token_expires_in ?? 45 * 86400) * 1000).toISOString();
    const { error } = await client.rpc("me_save_oauth_tokens", {
      p_access_token: tokens.access_token,
      p_refresh_token: tokens.refresh_token,
      p_access_expires_at: accessExpires,
      p_refresh_expires_at: refreshExpires,
      p_authorized_by: userId,
    });
		return finish(error ? "token_store_failed" : "connected", state);
  } catch {
		return finish("error", state);
  }
});
