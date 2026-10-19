<script lang="ts">
	import { cart, removeFromCart, setQuantity } from '#lib/stores/cart';
	import { formatPrice } from '#lib/data/products';
	$: total = $cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
	function quantityChange(id: string, event: Event) { setQuantity(id, Number((event.currentTarget as HTMLInputElement).value)); }
</script>

<svelte:head><title>Carrinho demonstrativo — Ponto de Torra</title><meta name="description" content="Revise seu carrinho de demonstração Ponto de Torra." /><meta name="robots" content="noindex, follow" /></svelte:head>
<section class="cart-content wrap">
	<p class="eyebrow">Sua seleção / Demonstração</p>
	{#if $cart.length}
		<h1 class="display-title">Seu carrinho<em>.</em></h1>
		<p class="section-kicker">Este carrinho é apenas demonstrativo. Os valores não correspondem a ofertas reais.</p>
		<div class="cart-list">
			{#each $cart as line (line.product.id)}
				<article class="cart-row">
					<a href={`/produto/${line.product.slug}`}><img src={line.product.image} alt="" width="86" height="86" loading="lazy" /></a>
					<div><h2><a href={`/produto/${line.product.slug}`}>{line.product.name}</a></h2><p>{line.product.unit} · item demonstrativo</p><strong class="cart-line-price">{formatPrice(line.product.price * line.quantity)}</strong></div>
					<label class="visually-hidden" for={`qty-${line.product.id}`}>Quantidade de {line.product.name}</label>
					<input id={`qty-${line.product.id}`} type="number" min="1" max="99" value={line.quantity} on:change={(event) => quantityChange(line.product.id, event)} />
					<button class="cart-remove" type="button" on:click={() => removeFromCart(line.product.id)}>Remover</button>
				</article>
			{/each}
		</div>
		<div class="cart-summary"><p class="cart-summary-line"><span>Subtotal demonstrativo</span><strong>{formatPrice(total)}</strong></p><p class="cart-summary-line"><span>Frete</span><span>Não calculado</span></p><p class="cart-summary-line total"><span>Total demonstrativo</span><strong>{formatPrice(total)}</strong></p><a class="button" href="/checkout">Ver demonstração de checkout ↗</a><a class="text-link" href="/colecao/cafes">Continuar explorando</a></div>
	{:else}
		<div class="cart-empty"><h1>Seu carrinho está vazio.</h1><p>Explore a vitrine e adicione itens de demonstração.</p><a class="button" href="/colecao/cafes">Descobrir cafés ↗</a></div>
	{/if}
</section>
