<script lang="ts">
	import ProductCard from '#lib/components/ProductCard.svelte';
	import { categories } from '#lib/data/products';
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head><title>Busca — Ponto de Torra</title><meta name="description" content="Busque cafés, métodos, acessórios e kits na Ponto de Torra." /><meta name="robots" content="noindex, follow" /></svelte:head>
<section class="page-hero wrap"><p class="eyebrow">Busca / Produtos</p><h1 class="display-title">O que você <em>procura?</em></h1><form class="search-page-form" action="/buscar" method="GET"><label class="visually-hidden" for="query">Buscar produto</label><input id="query" name="q" type="search" value={data.query} placeholder="Ex.: coado, drip, kit..." /><button class="button" type="submit">Buscar ↗</button></form>{#if data.query}<p class="collection-count" aria-live="polite">{data.results.length} resultado(s) para “{data.query}”.</p>{/if}</section>
{#if data.query && data.results.length}<section class="catalog-content wrap"><div class="product-grid">{#each data.results as product}<ProductCard {product} />{/each}</div></section>{:else if data.query}<section class="empty-state wrap"><h2>Não encontramos esse termo.</h2><p>Tente outro nome ou explore uma coleção.</p><a class="button" href="/colecao/cafes">Ver cafés</a></section>{:else}<section class="home-section wrap"><div class="section-heading"><div><p class="eyebrow">Talvez por aqui</p><h2>Explore as coleções.</h2></div></div><div class="category-tiles">{#each categories as category}<a class="category-tile" href={`/colecao/${category.id}`}><img src={category.image} alt="" width="760" height="760" loading="lazy" /><div class="category-tile-copy"><h3>{category.title}</h3><b>Descobrir ↗</b></div></a>{/each}</div></section>{/if}
