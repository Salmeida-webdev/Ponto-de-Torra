<script lang="ts">
	import ProductCard from '#lib/components/ProductCard.svelte';
	import { categories, products } from '#lib/data/products';
	const featuredIds = ['p01', 'p02', 'p07', 'p10', 'p21', 'p29', 'p34', 'p43'];
	const featured = products.filter((product) => featuredIds.includes(product.id));
</script>

<svelte:head>
	<title>Ponto de Torra — Encontre seu próximo café</title>
	<meta name="description" content="Cafés especiais, drip coffee, métodos e kits em uma vitrine conceitual para descobrir seu próximo preparo." />
</svelte:head>

<section class="hero wrap" aria-labelledby="hero-title">
	<div class="hero-panel">
		<div class="hero-copy">
			<p class="eyebrow">Cafés especiais para os seus rituais</p>
			<h1 id="hero-title" class="display-title">Um bom café muda o ritmo <em>do dia.</em></h1>
			<p class="hero-intro">Descubra perfis, métodos e pequenos momentos para encontrar a xícara que combina com você.</p>
			<a class="button button-dark" href="/colecao/cafes">Encontrar meu café <span aria-hidden="true">↗</span></a>
		</div>
		<div class="hero-visual">
			<img src="/images/products/p01.jpg" alt="Imagem conceitual de um pacote de café especial servido ao lado de uma xícara" width="760" height="570" fetchpriority="high" />
			<div class="hero-stamp">01&nbsp; / &nbsp;CAFÉ ESPECIAL</div>
			<div class="hero-photo-caption">Imagem conceitual gerada para esta vitrine</div>
		</div>
	</div>
</section>

<section class="ticker" aria-label="O que você encontra na vitrine">
	<div class="ticker-inner wrap">
		<div class="ticker-item"><b>01</b> Café sem complicação</div>
		<div class="ticker-item"><b>02</b> Escolha seu método</div>
		<div class="ticker-item"><b>03</b> Perfis para explorar</div>
		<div class="ticker-item"><b>↗</b> Aprenda no seu ritmo</div>
	</div>
</section>

<section class="home-section wrap" aria-labelledby="categories-title">
	<div class="section-heading">
		<div><p class="eyebrow">Comece por onde quiser</p><h2 id="categories-title">Um universo,<br />vários caminhos.</h2></div>
		<a href="/colecao/cafes">Ver todo o catálogo <span aria-hidden="true">↗</span></a>
	</div>
	<div class="category-tiles">
		{#each categories as category, index}
			<a class="category-tile" href={`/colecao/${category.id}`}>
				<img src={category.image} alt="" width="760" height="760" loading="lazy" decoding="async" />
				<div class="category-tile-copy"><span>0{index + 1} / Explorar</span><h3>{category.title}</h3><b>Descobrir <span aria-hidden="true">↗</span></b></div>
			</a>
		{/each}
	</div>
</section>

<section class="home-section wrap" aria-labelledby="featured-title">
	<div class="section-heading">
		<div><p class="eyebrow">Para sua próxima pausa</p><h2 id="featured-title">Primeiras descobertas.</h2><p class="section-kicker">Uma seleção para conhecer os perfis e os métodos desta vitrine.</p></div>
		<a href="/colecao/cafes">Explorar produtos <span aria-hidden="true">↗</span></a>
	</div>
	<div class="product-grid">
		{#each featured as product}
			<ProductCard {product} />
		{/each}
	</div>
</section>

<section class="home-section wrap" aria-label="Guias de café">
	<div class="guide-band">
		<div class="guide-band-intro"><p class="eyebrow eyebrow-light">Do primeiro gole em diante</p><h2>Curiosidade<br />na medida.</h2><p>Sem regra complicada: entenda o básico e descubra o que funciona para você.</p></div>
		<div class="guide-band-links">
			<a href="/guia-de-moagem"><img src="/images/guides/grinding.jpg" alt="Moedor manual, grãos inteiros e café moído em diferentes texturas" width="760" height="570" loading="lazy" decoding="async" /><span class="guide-card-copy"><b>Aprenda o básico</b><strong>Moagem: por onde começar?</strong><i aria-hidden="true">↗</i></span></a>
			<a href="/guia-de-preparo"><img src="/images/guides/brewing.jpg" alt="Coador de vidro com filtro de papel sobre um servidor de café" width="760" height="570" loading="lazy" decoding="async" /><span class="guide-card-copy"><b>Encontre seu ritual</b><strong>Qual método tem a sua cara?</strong><i aria-hidden="true">↗</i></span></a>
		</div>
	</div>
</section>

<section class="manifesto wrap">
	<div><p class="eyebrow">Sobre o projeto</p><h2>Conhecer café<br />também é <em>curtir</em><br />o caminho.</h2></div>
	<div class="manifesto-copy"><p><strong>Ponto de Torra é uma marca conceitual criada para este projeto de portfólio.</strong> A ideia é apresentar cafés especiais de um jeito direto, acolhedor e sem exigir conhecimento prévio.</p><p>As fotos de produto são imagens conceituais geradas para esta vitrine; elas representam a categoria e o perfil descritos, sem comprovar lote, embalagem, fornecedor ou estoque de uma loja ativa.</p><a class="text-link" href="/sobre">Conheça a proposta ↗</a></div>
</section>
