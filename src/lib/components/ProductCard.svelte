<script lang="ts">
	import type { Product } from '#lib/data/products';
	import { categoryName, formatPrice } from '#lib/data/products';
	export let product: Product;
	let loaded = false;
</script>

<article class="product-card">
	<a class="product-card-image" href={`/produto/${product.slug}`} aria-label={`Ver ${product.name}`}>
		{#if product.badge}<span class="product-badge">{product.badge}</span>{/if}
		<img src={product.image} alt={product.name} width="760" height="570" loading="lazy" decoding="async" on:load={() => (loaded = true)} class:loaded />
		<span class="card-category">{categoryName(product.category)}</span>
	</a>
	<div class="product-card-copy">
		<h3><a href={`/produto/${product.slug}`}>{product.name}</a></h3>
		<p class="product-price">{formatPrice(product.price)}</p>
		<p class="product-unit">{product.unit}</p>
	</div>
</article>
