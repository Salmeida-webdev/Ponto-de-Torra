import { browser } from '$app/env';
import { writable } from 'svelte/store';
import type { Product } from '#lib/data/products';

export type CartLine = { product: Product; quantity: number };
const STORAGE_KEY = 'ponto-de-torra-demo-cart-v3';

function loadSaved(): CartLine[] {
	if (!browser) return [];
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((line) => line?.product?.id && line?.product?.variantId && Number(line.quantity) > 0) : [];
	} catch {
		return [];
	}
}

export const cart = writable<CartLine[]>([]);
let initialized = false;

export function restoreCart() {
	if (!browser || initialized) return;
	initialized = true;
	cart.set(loadSaved());
	cart.subscribe((lines) => {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* cart remains usable for this session */ }
	});
}

export function addToCart(product: Product, quantity = 1) {
	const safeQuantity = Math.max(1, Math.min(10, Math.floor(Number(quantity) || 1)));
	cart.update((lines) => {
		const found = lines.find((line) => line.product.id === product.id);
		if (found) return lines.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(99, line.quantity + safeQuantity) } : line);
		return [...lines, { product, quantity: safeQuantity }];
	});
}

export function setQuantity(productId: string, quantity: number) {
	const safeQuantity = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
	cart.update((lines) => lines.map((line) => line.product.id === productId ? { ...line, quantity: safeQuantity } : line));
}

export function removeFromCart(productId: string) {
	cart.update((lines) => lines.filter((line) => line.product.id !== productId));
}

export function clearCart() { cart.set([]); }
