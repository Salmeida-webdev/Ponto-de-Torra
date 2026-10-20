<script lang="ts">
	import { page } from '$app/state';
	$: status = page.url.searchParams.get('status') ?? 'pendente';
	$: order = page.url.searchParams.get('order') ?? '';
	$: message = status === 'cancelado'
		? 'O pagamento foi cancelado. O pedido não será confirmado e a reserva dos itens será liberada após o processamento.'
		: status === 'expirado'
			? 'O prazo para pagamento expirou. Você pode voltar à loja e iniciar um novo pedido.'
			: 'Recebemos seu pedido. O status será atualizado assim que o pagamento for confirmado.';
</script>

<svelte:head>
	<title>Pedido recebido — Ponto de Torra</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="page-hero wrap">
	<p class="eyebrow">Pedido recebido</p>
	<h1 class="display-title">Aguardando <em>confirmação.</em></h1>
	<p>{message}</p>
	{#if order}<p class="checkout-order-number">Pedido nº {order}</p>{/if}
	<div class="checkout-actions"><a class="button" href="/carrinho">Voltar ao carrinho</a><a class="button button-dark" href="/colecao/cafes">Voltar à vitrine</a></div>
</section>
