import { error } from '@sveltejs/kit';
import { products } from '#lib/data/products';
import { loadStoreProducts } from '#lib/data/live-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const liveProducts = await loadStoreProducts();
	const product = liveProducts.find((item) => item.slug === params.slug) ?? products.find((item) => item.slug === params.slug);
	if (!product) error(404, 'Produto não encontrado');
	return { product };
};
