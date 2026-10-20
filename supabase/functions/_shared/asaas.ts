const SANDBOX_API_ORIGIN = "https://api-sandbox.asaas.com";
const PRODUCTION_API_ORIGIN = "https://api.asaas.com";
const CHECKOUT_HOSTS = new Set(["asaas.com", "sandbox.asaas.com"]);

function isIpAddress(hostname: string): boolean {
  return hostname.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export function normalizePublicSiteOrigin(raw: string | null | undefined): string {
  if (!raw?.trim()) throw new Error("public_site_url_not_configured");
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("public_site_url_invalid");
  }
  if (
    url.protocol !== "https:" ||
    url.username || url.password || url.search || url.hash ||
    (url.pathname !== "" && url.pathname !== "/") ||
    !url.hostname || isIpAddress(url.hostname) ||
    ["localhost", "localhost.localdomain"].includes(url.hostname) ||
    !url.hostname.includes(".") || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local") ||
    [".test", ".invalid", ".example"].some((suffix) => url.hostname.endsWith(suffix)) ||
    (url.port !== "" && url.port !== "443")
  ) throw new Error("public_site_url_invalid");
  return url.origin;
}

export function normalizeAsaasApiBase(raw: string | null | undefined): { base: string; sandbox: boolean } {
  const input = (raw?.trim() || `${SANDBOX_API_ORIGIN}/v3`).replace(/\/$/, "");
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("asaas_api_base_invalid");
  }
  const sandbox = url.origin === SANDBOX_API_ORIGIN;
  if (
    (!sandbox && url.origin !== PRODUCTION_API_ORIGIN) ||
    url.pathname !== "/v3" || url.search || url.hash || url.username || url.password
  ) throw new Error("asaas_api_base_invalid");
  return { base: `${url.origin}/v3`, sandbox };
}

export function buildAsaasCallbacks(siteOrigin: string, orderNumber: number) {
  const makeUrl = (status: string) => {
    const url = new URL("/checkout/retorno", siteOrigin);
    url.searchParams.set("status", status);
    url.searchParams.set("order", String(orderNumber));
    return url.toString();
  };
  return {
    successUrl: makeUrl("sucesso"),
    cancelUrl: makeUrl("cancelado"),
    expiredUrl: makeUrl("expirado"),
  };
}

export function buildAsaasCheckoutUrl(checkoutId: string, sandbox: boolean, providerLink?: string): string {
  if (providerLink) {
    try {
      const url = new URL(providerLink);
      const expectedHost = sandbox ? "sandbox.asaas.com" : "asaas.com";
      const idInQuery = url.searchParams.get("id") === checkoutId;
      const pathMatch = url.pathname.match(/^\/checkoutSession\/show\/([^/]+)\/?$/);
      const idInPath = pathMatch?.[1] === checkoutId;
      if (
        url.protocol === "https:" && url.hostname === expectedHost &&
        !url.username && !url.password && !url.port && !url.hash &&
        ((url.pathname === "/checkoutSession/show" && idInQuery) || idInPath)
      ) return url.toString();
    } catch {
      // Fall back to the canonical URL when Asaas omits or malforms the link.
    }
  }
  const url = new URL("/checkoutSession/show", `https://${sandbox ? "sandbox.asaas.com" : "asaas.com"}`);
  url.searchParams.set("id", checkoutId);
  return url.toString();
}
