import { error } from '@sveltejs/kit';
import { categories, products } from '#lib/data/products';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const category = categories.find((item) => item.id === params.slug);
	if (!category) error(404, 'Coleção não encontrada');
	return { category, products: products.filter((product) => product.category === category.id) };
};
