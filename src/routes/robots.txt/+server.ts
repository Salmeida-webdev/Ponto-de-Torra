import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => new Response(`User-agent: *\nAllow: /\nDisallow: /checkout\nSitemap: ${url.origin}/sitemap.xml\n`, {
	headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
});
