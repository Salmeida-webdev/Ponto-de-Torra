<script lang="ts">
	import ProductCard from '#lib/components/ProductCard.svelte';
	import { formatPrice } from '#lib/data/products';
	import type { PageData } from './$types';
	export let data: PageData;
	let query = '';
	let priceBand = 'all';
	let sort = 'featured';
	$: filtered = data.products.filter((product) => {
		const q = query.trim().toLocaleLowerCase('pt-BR');
		const matchesQuery = !q || `${product.name} ${product.description}`.toLocaleLowerCase('pt-BR').includes(q);
		const matchesPrice = priceBand === 'all' || (priceBand === 'low' ? product.price < 5000 : product.price >= 5000);
		return matchesQuery && matchesPrice;
	});
	$: shown = [...filtered].sort((a, b) => sort === 'lowest' ? a.price - b.price : sort === 'highest' ? b.price - a.price : Number(a.id.slice(1)) - Number(b.id.slice(1)));
</script>

<svelte:head>
	<title>{data.category.title} — Ponto de Torra</title>
	<meta name="description" content={data.category.description} />
</svelte:head>

<section class="page-hero wrap"><p class="eyebrow">Coleção / Ponto de Torra</p><h1 class="display-title">{data.category.title}<em>.</em></h1><p>{data.category.description}</p></section>
<section class="catalog-content wrap" aria-labelledby="catalog-heading">
	<h2 id="catalog-heading" class="visually-hidden">Produtos da coleção {data.category.title}</h2>
	<div class="collection-toolbar">
		<p class="collection-count" aria-live="polite">{shown.length} {shown.length === 1 ? 'produto' : 'produtos'}</p>
		<div class="collection-controls">
			<label>Filtrar <input bind:value={query} type="search" placeholder="Nome ou perfil" aria-label="Filtrar por nome ou perfil" /></label>
			<label>Faixa de preço <select bind:value={priceBand} aria-label="Filtrar por faixa de preço"><option value="all">Todas</option><option value="low">Até R$ 50</option><option value="high">Acima de R$ 50</option></select></label>
			<label>Ordenar <select bind:value={sort} aria-label="Ordenar produtos"><option value="featured">Em destaque</option><option value="lowest">Menor preço</option><option value="highest">Maior preço</option></select></label>
		</div>
	</div>
	{#if shown.length}
		<div class="product-grid">{#each shown as product}<ProductCard {product} />{/each}</div>
	{:else}
		<div class="empty-state"><h2>Nenhum produto por aqui.</h2><p>Tente outra busca ou limpe os filtros.</p><button class="button" on:click={() => { query = ''; priceBand = 'all'; }}>Limpar filtros</button></div>
	{/if}
</section>
