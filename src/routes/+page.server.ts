import { loadStoreProducts } from '#lib/data/live-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ products: await loadStoreProducts() });
