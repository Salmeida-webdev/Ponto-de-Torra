import { loadStoreProducts } from '#lib/data/live-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = (url.searchParams.get('q') ?? '').trim();
	const normalized = query.toLocaleLowerCase('pt-BR');
	const liveProducts = await loadStoreProducts();
	const results = normalized ? liveProducts.filter((product) => `${product.name} ${product.description}`.toLocaleLowerCase('pt-BR').includes(normalized)) : [];
	return { query, results };
};
