import { error } from '@sveltejs/kit';
import { categories } from '#lib/data/products';
import { loadStoreProducts } from '#lib/data/live-catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const category = categories.find((item) => item.id === params.slug);
	if (!category) error(404, 'Coleção não encontrada');
	const liveProducts = await loadStoreProducts();
	return { category, products: liveProducts.filter((product) => product.category === category.id) };
};
