import { error } from '@sveltejs/kit';
import { products } from '#lib/data/products';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const product = products.find((item) => item.slug === params.slug);
	if (!product) error(404, 'Produto não encontrado');
	return { product };
};
