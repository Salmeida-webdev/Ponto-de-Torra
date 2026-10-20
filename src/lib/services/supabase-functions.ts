import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import type { CartLine } from '#lib/stores/cart';

const baseUrl = PUBLIC_SUPABASE_URL.replace(/\/$/, '');
export const commerceFunctionsReady = Boolean(baseUrl && PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export async function invokeCommerceFunction<T>(name: string, body: unknown): Promise<T> {
	if (!commerceFunctionsReady) throw new Error('A conexão local com o Supabase ainda não foi configurada.');
	const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
		method: 'POST',
		headers: {
			apikey: PUBLIC_SUPABASE_PUBLISHABLE_KEY,
			Authorization: `Bearer ${PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	const payload = await response.json().catch(() => ({})) as T & { error?: string };
	if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir esta etapa agora.');
	return payload;
}

/** Refresh saved cart prices from the live catalog before shipping, coupons, or payment. */
export async function refreshCartPrices(lines: CartLine[]): Promise<CartLine[]> {
	if (!lines.length) return lines;
	if (!commerceFunctionsReady) throw new Error('A conexão com o catálogo não está configurada.');
	const ids = [...new Set(lines.map((line) => line.product.variantId))];
	const client = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
	});
	const { data, error } = await client.from('product_variants')
		.select('id,price_cents,label,is_active,products!inner(name,is_active,archived_at)')
		.in('id', ids).eq('is_active', true).eq('products.is_active', true).is('products.archived_at', null);
	if (error) throw new Error('Não foi possível atualizar os preços do carrinho. Tente novamente.');
	const current = new Map((data ?? []).map((variant: any) => [String(variant.id), variant]));
	if (current.size !== ids.length) throw new Error('Um produto ou uma variante do carrinho não está mais disponível. Revise seu carrinho.');
	return lines.map((line) => {
		const variant = current.get(line.product.variantId) as any;
		const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
		const price = Number(variant.price_cents);
		if (!Number.isSafeInteger(price) || price < 1) throw new Error('O catálogo retornou um preço inválido.');
		return {
			...line,
			product: {
				...line.product,
				name: String(product?.name ?? line.product.name),
				price,
				unit: String(variant.label ?? line.product.unit),
			},
		};
	});
}
