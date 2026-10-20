import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import { products as demoProducts, type Product } from './products';

type Raw = Record<string, any>;

export async function loadStoreProducts(): Promise<Product[]> {
	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) return demoProducts;
	try {
		const client = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
			auth: { persistSession: false, autoRefreshToken: false },
			global: {
				// Prices and availability are edited in the panel, so every page load must see the latest catalog.
				fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
			},
		});
		const { data, error } = await client.from('products')
			.select('id,name,slug,description,category_id,categories(slug),product_variants(id,sku,label,price_cents,attributes,is_active),product_images(storage_path,is_primary,variant_id)')
			.eq('is_active', true).is('archived_at', null).order('created_at', { ascending: false }).limit(500);
		if (error) return demoProducts;
		if (!data?.length) return [];
		const staticBySlug = new Map(demoProducts.map((product) => [product.slug, product]));
		const live = (data as unknown as Raw[]).flatMap((row) => {
			const activeVariants = ((row.product_variants ?? []) as Raw[]).filter((variant) => variant.is_active).sort((a, b) => a.price_cents - b.price_cents);
			if (!activeVariants.length) return [];
			const categoryValue = Array.isArray(row.categories) ? row.categories[0]?.slug : row.categories?.slug;
			const category = String(categoryValue ?? 'cafes') as Product['category'];
			const variants = activeVariants.map((variant) => {
				const attrs = variant.attributes ?? {};
				const parts = String(variant.label ?? '').split(' · ');
				const weightValue = Number(attrs.peso_g);
				return {
					id: String(variant.id), sku: String(variant.sku), price: Number(variant.price_cents),
					unit: String(variant.label ?? ''),
					weight: Number.isFinite(weightValue) && weightValue > 0 ? (weightValue >= 1000 ? `${weightValue / 1000} kg` : `${weightValue} g`) : (parts[0] || String(variant.label ?? '')),
					grind: String(attrs.moagem ?? parts[1] ?? 'Em grãos'),
				};
			});
			// Keep the card price aligned with the option preselected on the product page.
			const initialVariant = category === 'cafes'
				? variants.find((variant) => variant.weight === '250 g' && variant.grind === 'Em grãos') ?? variants[0]
				: variants[0];
			const existing = staticBySlug.get(String(row.slug));
			const mainImage = ((row.product_images ?? []) as Raw[]).find((image) => image.is_primary && !image.variant_id);
			const image = mainImage ? client.storage.from('product-images').getPublicUrl(mainImage.storage_path).data.publicUrl : existing?.image ?? '/images/products/p01.jpg';
			return [{
				id: existing?.id ?? String(row.id), slug: String(row.slug), name: String(row.name), category,
				variantId: initialVariant.id, variants, description: String(row.description ?? ''), image,
				price: initialVariant.price, unit: initialVariant.unit, badge: existing?.badge,
			} satisfies Product];
		});
		return live;
	} catch {
		return demoProducts;
	}
}
