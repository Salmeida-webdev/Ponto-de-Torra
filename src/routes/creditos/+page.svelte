<script lang="ts">
	import photoCredits from '#lib/data/photo-credits.json';
	type GeneratedImage = { product_id: string; file: string; title: string; image_type: string; style: string; illustrative: boolean };
	const images = photoCredits as GeneratedImage[];
</script>

<svelte:head>
	<title>Imagens conceituais — Ponto de Torra</title>
	<meta name="description" content="Transparência sobre as imagens geradas para ilustrar os produtos conceituais do catálogo." />
</svelte:head>

<section class="page-hero wrap">
	<p class="eyebrow">Transparência / Acervo visual</p>
	<h1 class="display-title">Imagens<br /><em>conceituais.</em></h1>
	<p>As 50 imagens do catálogo são fotografias conceituais fotorealistas geradas por IA. Cada uma foi criada para mostrar o tipo de produto descrito, mantendo fundo, iluminação, enquadramento e acabamento consistentes.</p>
	<p>Elas não são fotos documentais de itens físicos, nem comprovam embalagem, marca, lote, fornecedor ou estoque. Os nomes, especificações e valores também são demonstrativos.</p>
</section>

<section class="article-content wrap">
	<h2>Imagens do catálogo</h2>
	<ul class="credit-list generated-image-list">
		{#each images as item}
			<li>
				<b>{item.product_id.toUpperCase()}</b>
				<div class="generated-image-row">
					<img src={item.file} alt={`Imagem conceitual de ${item.title}`} width="160" height="120" loading="lazy" decoding="async" />
					<div><strong>{item.title}</strong><br /><span>{item.image_type} · {item.style}</span><br /><code>{item.file}</code></div>
				</div>
			</li>
		{/each}
	</ul>
	<p>As imagens foram reduzidas e otimizadas para carregamento rápido. Para uma loja real, substitua-as por fotos próprias ou autorizadas do produto final.</p>
</section>

<style>
	.generated-image-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 0; list-style: none; }
	.generated-image-list li { display: flex; gap: 12px; align-items: flex-start; padding: 12px; border: 1px solid var(--line); border-radius: 14px; }
	.generated-image-row { display: flex; gap: 12px; align-items: center; min-width: 0; }
	.generated-image-row img { flex: 0 0 120px; width: 120px; height: 90px; object-fit: cover; border-radius: 9px; }
	.generated-image-row span, .generated-image-row code { color: var(--muted); font-size: 11px; }
	.generated-image-row code { overflow-wrap: anywhere; }
	@media (max-width: 700px) { .generated-image-list { grid-template-columns: 1fr; } }
</style>
