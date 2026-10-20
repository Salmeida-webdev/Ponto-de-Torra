<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { cart, removeFromCart, restoreCart, setQuantity } from '#lib/stores/cart';
	import { formatPrice } from '#lib/data/products';
	import { refreshCartPrices } from '#lib/services/supabase-functions';
	let pricingLoading = true;
	let priceError = '';
	$: total = $cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
	function quantityChange(id: string, event: Event) { setQuantity(id, Number((event.currentTarget as HTMLInputElement).value)); }
	async function syncPrices() {
		pricingLoading = true;
		priceError = '';
		try { cart.set(await refreshCartPrices(get(cart))); }
		catch (error) { priceError = error instanceof Error ? error.message : 'Não foi possível atualizar os preços.'; }
		finally { pricingLoading = false; }
	}
	onMount(() => { restoreCart(); void syncPrices(); });
</script>

<svelte:head><title>Seu carrinho — Ponto de Torra</title><meta name="description" content="Confira sua seleção de cafés, métodos e acessórios antes de finalizar o pedido." /><meta name="robots" content="noindex, follow" /></svelte:head>
<section class="cart-content wrap">
	<p class="eyebrow">Sua seleção</p>
	{#if $cart.length}
		<h1 class="display-title">Seu carrinho<em>.</em></h1>
		<p class="section-kicker">Confira os itens e as quantidades antes de continuar.</p>
		<div class="cart-list">
			{#each $cart as line (line.product.id)}
				<article class="cart-row">
					<a href={`/produto/${line.product.slug}`}><img src={line.product.image} alt="" width="86" height="86" loading="lazy" /></a>
					<div><h2><a href={`/produto/${line.product.slug}`}>{line.product.name}</a></h2><p>{line.product.unit}</p><strong class="cart-line-price">{formatPrice(line.product.price * line.quantity)}</strong></div>
					<label class="visually-hidden" for={`qty-${line.product.id}`}>Quantidade de {line.product.name}</label>
					<input id={`qty-${line.product.id}`} type="number" min="1" max="99" value={line.quantity} on:change={(event) => quantityChange(line.product.id, event)} />
					<button class="cart-remove" type="button" on:click={() => removeFromCart(line.product.id)}>Remover</button>
				</article>
			{/each}
		</div>
		<div class="cart-summary"><p class="cart-summary-line"><span>Subtotal</span><strong>{formatPrice(total)}</strong></p><p class="cart-summary-line"><span>Frete</span><span>Calculado na próxima etapa</span></p><p class="cart-summary-line total"><span>Total parcial</span><strong>{formatPrice(total)}</strong></p>
			{#if pricingLoading}<p class="checkout-hint">Atualizando preços e disponibilidade…</p>{:else if priceError}<p class="checkout-error" role="alert">{priceError}</p><button class="button" type="button" on:click={() => void syncPrices()}>Tentar atualizar preços</button>{:else}<a class="button" href="/checkout">Continuar para entrega e pagamento ↗</a>{/if}
			<a class="text-link" href="/colecao/cafes">Continuar explorando</a></div>
	{:else}
		<div class="cart-empty"><h1>Seu carrinho está vazio.</h1><p>Explore nossos cafés, métodos e acessórios para escolher seus favoritos.</p><a class="button" href="/colecao/cafes">Descobrir cafés ↗</a></div>
	{/if}
</section>
