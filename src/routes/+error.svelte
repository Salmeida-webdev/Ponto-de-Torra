<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} — Ponto de Torra</title><meta name="robots" content="noindex" /></svelte:head>
<section class="empty-state wrap error-page">
	<p class="eyebrow">{page.status} / Ponto de Torra</p>
	<h1>{page.status === 404 ? 'Essa página não está aqui.' : 'Algo saiu do ritmo.'}</h1>
	<p>{page.status === 404 ? 'O endereço pode ter mudado ou o produto não faz parte desta vitrine.' : 'Tente novamente ou volte para o início.'}</p>
	<a class="button" href="/">Voltar ao início ↗</a>
</section>
