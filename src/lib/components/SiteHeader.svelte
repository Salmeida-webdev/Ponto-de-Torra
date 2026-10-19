<script lang="ts">
	import { categories } from '#lib/data/products';
	import { cart } from '#lib/stores/cart';
	$: cartCount = $cart.reduce((sum, line) => sum + line.quantity, 0);
</script>

<header class="site-header">
	<div class="header-main wrap">
		<a class="brand" href="/" aria-label="Ponto de Torra — início">
			<img src="/logo.svg" alt="" width="192" height="46" fetchpriority="high" />
		</a>
		<form class="header-search" action="/buscar" method="GET" role="search">
			<label class="visually-hidden" for="site-search">Buscar na loja</label>
			<input id="site-search" type="search" name="q" placeholder="Busque cafés, métodos..." />
			<button type="submit" aria-label="Buscar">
				<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>
			</button>
		</form>
		<a class="cart-link" href="/carrinho" aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
			<span>Carrinho</span>
			{#if cartCount}<small class="cart-count">{cartCount}</small>{/if}
		</a>
	</div>
	<nav class="primary-nav wrap" aria-label="Navegação principal">
		<a href="/colecao/cafes">Cafés</a>
		<a href="/colecao/drip">Drip coffee</a>
		<a href="/colecao/metodos">Métodos</a>
		<a href="/colecao/acessorios">Acessórios</a>
		<a href="/colecao/kits">Kits & presentes</a>
		<a class="nav-guide" href="/guia-de-preparo">Guia de preparo <span aria-hidden="true">↗</span></a>
	</nav>
	<details class="mobile-nav wrap">
		<summary><span class="menu-icon" aria-hidden="true"><i></i><i></i></span> Explorar a loja</summary>
		<div class="mobile-nav-panel">
			{#each categories as category}
				<a href={`/colecao/${category.id}`}>{category.title}</a>
			{/each}
			<a href="/guia-de-preparo">Guia de preparo</a>
			<a href="/sobre">Sobre a marca</a>
		</div>
	</details>
</header>
