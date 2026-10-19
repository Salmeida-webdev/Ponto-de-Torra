import { products } from '#lib/data/products';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const query = (url.searchParams.get('q') ?? '').trim();
	const normalized = query.toLocaleLowerCase('pt-BR');
	const results = normalized ? products.filter((product) => `${product.name} ${product.description}`.toLocaleLowerCase('pt-BR').includes(normalized)) : [];
	return { query, results };
};
