import { categories, products } from '#lib/data/products';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const origin = url.origin;
	const paths = [
		'/', '/sobre', '/contato', '/perguntas-frequentes', '/guia-de-moagem', '/guia-de-preparo', '/politicas', '/creditos',
		...categories.map((category) => `/colecao/${category.id}`),
		...products.map((product) => `/produto/${product.slug}`)
	];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`;
	return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
