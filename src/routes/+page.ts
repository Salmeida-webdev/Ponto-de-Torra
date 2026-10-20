import { loadStoreProducts } from '#lib/data/live-catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => ({ products: await loadStoreProducts() });
