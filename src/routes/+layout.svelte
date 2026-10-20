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
	<meta name="description" content="Explore cafés especiais, drip coffee, métodos de preparo e kits para encontrar seu próximo ritual." />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Ponto de Torra — Encontre seu próximo café" />
	<meta property="og:description" content="Cafés, métodos e acessórios para encontrar seu próximo ritual." />
	<meta property="og:image" content="/social-card.svg" />
</svelte:head>

<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
{#if !isAdmin}<SiteHeader />{/if}
<main id="conteudo">{@render children?.()}</main>
{#if !isAdmin}<SiteFooter />{/if}
