<script lang="ts">
	import { cart } from '#lib/stores/cart';
	import { formatPrice } from '#lib/data/products';
	$: total = $cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
</script>

<svelte:head><title>Checkout demonstrativo — Ponto de Torra</title><meta name="description" content="O checkout ainda não está conectado a um sistema de pedidos ou pagamentos." /><meta name="robots" content="noindex, nofollow" /></svelte:head>
<section class="page-hero wrap"><p class="eyebrow">Etapa de checkout / Demonstração</p><h1 class="display-title">Quase lá<em>.</em></h1><p>Este protótipo apresenta o fluxo visual, mas não recebe dados pessoais nem cria pedidos.</p></section>
<section class="checkout-panel wrap">
	<h2>Checkout ainda não ativado.</h2>
	<p>Não há cadastro de cliente, cálculo de frete, estoque físico ou meio de pagamento conectado nesta etapa. Nenhum dado será coletado e nenhum pedido será enviado.</p>
	{#if $cart.length}<p><strong>{ $cart.length }</strong> item(ns) no carrinho de demonstração · subtotal ilustrativo <strong>{formatPrice(total)}</strong>.</p>{:else}<p>Seu carrinho está vazio. Você pode voltar à vitrine para testar os estados do carrinho.</p>{/if}
	<div class="checkout-actions"><a class="button" href="/carrinho">Voltar ao carrinho</a><a class="button button-dark" href="/colecao/cafes">Voltar à vitrine</a></div>
</section>
