<script lang="ts">
	let { children } = $props();
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '#lib/styles.css';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import { restoreCart } from '#lib/stores/cart';
	let isAdmin = $derived(page.url.pathname.startsWith('/painel'));
	onMount(restoreCart);
</script>

<svelte:head>
	<title>Ponto de Torra — Encontre seu próximo café</title>
	<meta name="description" content="Explore cafés, drip coffee, métodos de preparo e kits em uma vitrine conceitual de cafés especiais." />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Ponto de Torra — Encontre seu próximo café" />
	<meta property="og:description" content="Uma vitrine conceitual para descobrir cafés e métodos de preparo." />
	<meta property="og:image" content="/social-card.svg" />
</svelte:head>

<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
{#if !isAdmin}
	<div class="demo-notice"><span class="demo-dot" aria-hidden="true"></span> Projeto de portfólio · compras e pagamentos não estão ativos.</div>
	<SiteHeader />
{/if}
<main id="conteudo">{@render children?.()}</main>
{#if !isAdmin}<SiteFooter />{/if}
