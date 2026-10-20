import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
export const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
export const clientId = Deno.env.get("MELHOR_ENVIO_CLIENT_ID") ?? "";
export const clientSecret = Deno.env.get("MELHOR_ENVIO_CLIENT_SECRET") ?? "";
export const redirectUri = Deno.env.get("MELHOR_ENVIO_REDIRECT_URI") ?? "";
export const appUserAgent = Deno.env.get("MELHOR_ENVIO_USER_AGENT") ?? "";
export const apiBase = Deno.env.get("MELHOR_ENVIO_API_BASE_URL") ?? "https://melhorenvio.com.br";
export const siteUrl = Deno.env.get("PUBLIC_SITE_URL") ?? "http://localhost:5173";

export function adminClient(): SupabaseClient {
  if (!supabaseUrl || !serviceKey) throw new Error("supabase_not_configured");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function corsHeaders(origin?: string): HeadersInit {
  const configured = Deno.env.get("PUBLIC_SITE_URL");
  const allowed = configured ? new URL(configured).origin : "";
  let localOrigin = "";
  try {
    const parsed = new URL(origin ?? "");
    if (parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname)) localOrigin = parsed.origin;
  } catch { /* sem Origin ou origem inválida */ }
  const responseOrigin = localOrigin || (allowed ? (origin === allowed ? allowed : allowed) : "*");
  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(data: unknown, status = 200, origin?: string): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

export function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { Location: location, "Cache-Control": "no-store" } });
}

export function sha256Hex(value: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then((bytes) =>
    [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

export async function requireAdmin(req: Request): Promise<{ userId: string; client: SupabaseClient }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("unauthorized");
  const client = adminClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("unauthorized");
  const { data: membership } = await client.from("staff_memberships").select("role").eq("user_id", data.user.id).maybeSingle();
  if (membership?.role !== "admin") throw new Error("forbidden");
  return { userId: data.user.id, client };
}

export async function accessToken(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.rpc("me_claim_token_refresh").single();
  if (error || !data) throw new Error("melhor_envio_authorization_missing");
  const tokenData = data as { token_payload: { access_token: string; refresh_token: string }; access_expires_at: string; refresh_expires_at: string; claimed: boolean };
  if (!tokenData.claimed) {
    if (new Date(tokenData.access_expires_at).getTime() < Date.now() + 60_000) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const latest = await client.rpc("me_get_oauth_tokens").single();
      if (!latest.data || new Date(latest.data.access_expires_at).getTime() < Date.now() + 60_000) throw new Error("melhor_envio_token_refresh_in_progress");
      return (latest.data.token_payload as { access_token: string }).access_token;
    }
    return tokenData.token_payload.access_token;
  }
  if (!clientId || !clientSecret || !redirectUri || !appUserAgent.includes("@")) throw new Error("melhor_envio_oauth_not_configured");
  const response = await fetch(`${apiBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": appUserAgent },
    body: JSON.stringify({ grant_type: "refresh_token", refresh_token: tokenData.token_payload.refresh_token, client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("melhor_envio_token_refresh_failed");
  const responseBody = await response.json();
  const refreshed = (Array.isArray(responseBody) ? responseBody[0] : responseBody) as Record<string, unknown>;
  const now = Date.now();
  const accessExpires = new Date(now + Number(refreshed.expires_in ?? 30 * 86400) * 1000).toISOString();
  const refreshExpires = new Date(now + Number(refreshed.refresh_token_expires_in ?? 45 * 86400) * 1000).toISOString();
  const save = await client.rpc("me_save_oauth_tokens", {
    p_access_token: refreshed.access_token,
    p_refresh_token: refreshed.refresh_token,
    p_access_expires_at: accessExpires,
    p_refresh_expires_at: refreshExpires,
    p_authorized_by: null,
  });
  if (save.error) throw new Error("melhor_envio_token_store_failed");
  return refreshed.access_token as string;
}

export function normalizedCep(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export function normalizeTokenResponse(value: unknown): Record<string, unknown> {
  const token = Array.isArray(value) ? value[0] : value;
  return token && typeof token === "object" ? token as Record<string, unknown> : {};
}

export function getDimensions(raw: unknown): { width: number; height: number; length: number } {
  if (!raw || typeof raw !== "object") throw new Error("product_dimensions_missing");
  const d = raw as Record<string, unknown>;
  const mm = (key: string) => Number(d[`${key}_mm`] ?? d[key]);
  const dims = { width: mm("width"), height: mm("height"), length: mm("length") };
  if (Object.values(dims).some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("product_dimensions_missing");
  return Object.fromEntries(Object.entries(dims).map(([key, value]) => [key, Math.max(1, Math.ceil(value / 10))])) as typeof dims;
}
