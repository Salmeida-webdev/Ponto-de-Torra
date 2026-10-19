<script lang="ts">
	import { categories, formatPrice } from '#lib/data/products';
	import { addToCart } from '#lib/stores/cart';
	import type { PageData } from './$types';
	export let data: PageData;
	let quantity = 1;
	let added = false;
	let weight = '250 g';
	let grind = 'Em grãos';
	$: category = categories.find((item) => item.id === data.product.category);
	$: isCoffee = data.product.category === 'cafes';
	$: multiplier = weight === '500 g' ? 1.9 : weight === '1 kg' ? 3.6 : 1;
	$: variantPrice = Math.round(data.product.price * multiplier);
	$: variantUnit = isCoffee ? `${weight} · ${grind}` : data.product.unit;
	$: variantId = isCoffee ? `${data.product.id}-${weight.replace(/\D/g, '')}-${grind.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8)}` : data.product.id;
	function add() {
		addToCart({ ...data.product, id: variantId, price: variantPrice, unit: variantUnit }, quantity);
		added = true;
	}
</script>

<svelte:head>
	<title>{data.product.name} — Ponto de Torra</title>
	<meta name="description" content={data.product.description} />
	<meta property="og:title" content={`${data.product.name} — Ponto de Torra`} />
	<meta property="og:description" content="Produto da vitrine de portfólio Ponto de Torra." />
</svelte:head>

<section class="wrap product-detail">
	<div>
		<nav class="breadcrumbs" aria-label="Trilha de navegação"><a href="/">Início</a><span aria-hidden="true">/</span><a href={`/colecao/${data.product.category}`}>{category?.title}</a><span aria-hidden="true">/</span><span>{data.product.name}</span></nav>
		<div class="product-detail-image"><img src={data.product.image} alt={`Imagem conceitual de ${data.product.name}`} width="760" height="570" fetchpriority="high" /></div>
	</div>
	<div class="product-detail-copy">
		<p class="eyebrow">{category?.title}</p>
		<h1>{data.product.name}</h1>
		<p class="detail-price">{formatPrice(variantPrice)}</p>
		<p class="detail-description">{data.product.description}</p>
		{#if isCoffee}
			<div class="variant-fields"><label for="variant-weight">Peso<select id="variant-weight" bind:value={weight}><option>250 g</option><option>500 g</option><option>1 kg</option></select></label><label for="variant-grind">Moagem<select id="variant-grind" bind:value={grind}><option>Em grãos</option><option>Moído — espresso</option><option>Moído — filtro/coado</option><option>Moído — prensa</option></select></label></div>
		{/if}
		<dl class="detail-meta"><div><dt>Apresentação</dt><dd>{variantUnit}</dd></div><div><dt>Origem e lote</dt><dd>A confirmar</dd></div><div><dt>SKU</dt><dd>{variantId.toUpperCase()}</dd></div></dl>
		<div class="add-cart-row"><label class="visually-hidden" for="quantity">Quantidade</label><input class="qty-input" id="quantity" type="number" min="1" max="10" bind:value={quantity} /><button class="button" on:click={add}>Adicionar ao carrinho <span aria-hidden="true">↗</span></button></div>
		<p class="added-message" aria-live="polite">{#if added}Adicionado ao carrinho de demonstração.{/if}</p>
		<a class="text-link" href={`/colecao/${data.product.category}`}>Voltar para {category?.title} ↗</a>
	</div>
</section>
