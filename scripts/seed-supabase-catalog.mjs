import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(root, 'scripts/catalog-seed.json'), 'utf8'));
const supabaseUrl = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) || serviceKey.length < 32) {
	throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de executar.');
}

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
const categoryMeta = {
	cafes: { name: 'Cafés', description: 'Cafés em grãos e moídos para explorar diferentes perfis.', sort_order: 1 },
	drip: { name: 'Drip coffee', description: 'Porções individuais de café para preparar em qualquer lugar.', sort_order: 2 },
	metodos: { name: 'Métodos', description: 'Equipamentos para diferentes formas de preparo.', sort_order: 3 },
	acessorios: { name: 'Acessórios', description: 'Itens de apoio para o ritual do café.', sort_order: 4 },
	kits: { name: 'Kits & presentes', description: 'Combinações de produtos para experimentar e presentear.', sort_order: 5 },
};
const categoryUuidList = [
	'a3d1f1a0-3c84-5a36-9b9c-000000000001', 'a3d1f1a0-3c84-5a36-9b9c-000000000002',
	'a3d1f1a0-3c84-5a36-9b9c-000000000003', 'a3d1f1a0-3c84-5a36-9b9c-000000000004',
	'a3d1f1a0-3c84-5a36-9b9c-000000000005'
];

async function api(pathname, options = {}) {
	const response = await fetch(`${supabaseUrl}${pathname}`, {
		...options,
		headers: { ...headers, ...(options.headers ?? {}) },
	});
	if (!response.ok) {
		const detail = (await response.text()).slice(0, 400);
		throw new Error(`Supabase ${options.method ?? 'GET'} ${pathname} (${response.status}): ${detail}`);
	}
	const body = await response.text();
	if (!body) return null;
	try {
		return JSON.parse(body);
	} catch {
		throw new Error(`Supabase ${options.method ?? 'GET'} ${pathname} retornou uma resposta inválida.`);
	}
}

// Category UUIDs are fixed UUIDs so repeated runs update the same portfolio data.
const categories = Object.entries(categoryMeta).map(([slug, values], index) => ({
	id: categoryUuidList[index], slug, ...values, is_published: true,
}));
const categoryIds = Object.fromEntries(categories.map((category) => [category.slug, category.id]));

const bucketUrl = '/storage/v1/bucket/product-images';
const bucket = await fetch(`${supabaseUrl}${bucketUrl}`, { headers });
if (bucket.status === 404) {
	await api('/storage/v1/bucket', {
		method: 'POST', headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id: 'product-images', name: 'product-images', public: false, file_size_limit: 4_000_000, allowed_mime_types: ['image/jpeg'] }),
	});
} else if (!bucket.ok) {
	throw new Error(`Não foi possível verificar o bucket product-images (${bucket.status}).`);
}

await api('/rest/v1/categories?on_conflict=id', {
	method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
	body: JSON.stringify(categories),
});

const products = manifest.map((item) => ({
	id: item.product_id, category_id: categoryIds[item.category], name: item.name, slug: item.slug,
	description: item.description, is_active: true, is_portfolio_demo: true, published_at: new Date().toISOString(),
}));
const catalogVariants = manifest.flatMap((item) => item.variants ?? [{
	variant_id: item.variant_id, sku: item.sku, price_cents: item.price_cents, unit: item.unit,
	label: item.unit, attributes: { unidade: item.unit }, weight_grams: item.weight_grams,
	dimensions_mm: item.dimensions_mm, stock_on_hand: item.stock_on_hand,
}]);
const existingVariants = [];
for (let start = 0; start < catalogVariants.length; start += 100) {
	const chunk = catalogVariants.slice(start, start + 100);
	const variantIds = chunk.map((item) => item.variant_id).join(',');
	existingVariants.push(...await api(`/rest/v1/product_variants?select=id,stock_on_hand,stock_reserved&id=in.(${variantIds})`));
}
const stockByVariantId = new Map(existingVariants.map((variant) => [variant.id, variant]));
const variants = manifest.flatMap((product) => (product.variants ?? [{
	variant_id: product.variant_id, sku: product.sku, price_cents: product.price_cents, unit: product.unit,
	label: product.unit, attributes: { unidade: product.unit }, weight_grams: product.weight_grams,
	dimensions_mm: product.dimensions_mm, stock_on_hand: product.stock_on_hand,
}]).map((item) => ({
	id: item.variant_id, product_id: product.product_id, sku: item.sku, label: item.label ?? item.unit,
	attributes: item.attributes ?? { unidade: item.unit }, price_cents: item.price_cents,
	stock_on_hand: stockByVariantId.get(item.variant_id)?.stock_on_hand ?? item.stock_on_hand,
	stock_reserved: stockByVariantId.get(item.variant_id)?.stock_reserved ?? 0,
	weight_grams: item.weight_grams, dimensions_mm: item.dimensions_mm, is_active: true,
})));
await api('/rest/v1/products?on_conflict=id', {
	method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
	body: JSON.stringify(products),
});
await api('/rest/v1/product_variants?on_conflict=id', {
	method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
	body: JSON.stringify(variants),
});

const imageDir = path.join(root, 'static/images/products');
const availableFiles = new Set(await readdir(imageDir));
for (const item of manifest) {
	if (!availableFiles.has(item.image)) throw new Error(`Imagem ausente: ${item.image}`);
	const bytes = await readFile(path.join(imageDir, item.image));
	if (!bytes.length || bytes.length > 4_000_000) throw new Error(`Imagem inválida ou acima de 4 MB: ${item.image}`);
	const objectPath = `catalog/${item.image}`;
	const response = await fetch(`${supabaseUrl}/storage/v1/object/product-images/${objectPath}`, {
		method: 'POST',
		headers: { ...headers, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
		body: bytes,
	});
	if (!response.ok) throw new Error(`Upload de ${item.image} falhou (${response.status}).`);
}

const ids = manifest.map((item) => item.product_id).join(',');
await api(`/rest/v1/product_images?product_id=in.(${ids})`, { method: 'DELETE' });
await api('/rest/v1/product_images', {
	method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
	body: JSON.stringify(manifest.map((item) => ({
		product_id: item.product_id,
		storage_path: `catalog/${item.image}`,
		alt_text: `Foto de ${item.name}`,
		sort_order: 0,
		is_primary: true,
	}))),
});

console.log(`Catálogo de portfólio sincronizado: ${categories.length} categorias, ${products.length} produtos, ${variants.length} variantes e ${manifest.length} imagens privadas.`);
