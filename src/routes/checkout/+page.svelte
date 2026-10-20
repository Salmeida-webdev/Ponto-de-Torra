<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { cart } from '#lib/stores/cart';
	import { restoreCart } from '#lib/stores/cart';
	import { formatPrice } from '#lib/data/products';
	import { commerceFunctionsReady, invokeCommerceFunction, refreshCartPrices } from '#lib/services/supabase-functions';
	import { normalizeBrazilianPhone } from '../../../supabase/functions/_shared/customer';

	type ShippingQuote = { id: string; company_name: string; service_name: string; price_cents: number; delivery_days: number | null; expires_at: string };
	type QuotesResponse = { quotes: ShippingQuote[]; expires_at: string };
	type CheckoutResponse = { checkout_url: string; order_number: number; expires_at: string };
	type CouponResponse = { code: string; discount_cents: number; subtotal_cents: number };
	type CheckoutAddress = { postal_code: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };

	let customer = { name: '', email: '', phone: '' };
	let address: CheckoutAddress = { postal_code: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
	let quotes: ShippingQuote[] = [];
	let selectedQuoteId = '';
	let quoteExpiresAt = '';
	let idempotencyKey = '';
	let loadingQuotes = false;
	let creatingCheckout = false;
	let errorMessage = '';
	let couponInput = '';
	let appliedCoupon = '';
	let couponDiscountCents = 0;
	let couponBusy = false;
	let cartPricingReady = false;
	$: couponDiscount = couponDiscountCents;
	$: subtotal = $cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
	$: selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId);
	$: total = Math.max(0, subtotal - couponDiscountCents) + (selectedQuote?.price_cents ?? 0);

	onMount(() => {
		restoreCart();
		void (async () => {
			try {
				cart.set(await refreshCartPrices(get(cart)));
				cartPricingReady = true;
			} catch (error) {
				errorMessage = error instanceof Error ? error.message : 'Não foi possível atualizar os preços do carrinho.';
			}
		})();
	});

	function cartItems() {
		return $cart.map((line) => ({ variant_id: line.product.variantId, quantity: line.quantity }));
	}

	function detailsChanged() {
		idempotencyKey = '';
	}

	async function applyCoupon() {
		errorMessage = '';
		if (!cartPricingReady) { errorMessage = 'Aguarde a atualização dos preços do carrinho.'; return; }
		if (!couponInput.trim()) { appliedCoupon = ''; couponDiscountCents = 0; return; }
		couponBusy = true;
		try {
			const result = await invokeCommerceFunction<CouponResponse>('validate-coupon', { code: couponInput.trim().toUpperCase(), items: cartItems() });
			if (!Number.isSafeInteger(result.subtotal_cents) || result.subtotal_cents !== subtotal) {
				throw new Error('O preço do carrinho mudou. Atualize a página e valide o cupom novamente.');
			}
			if (!Number.isSafeInteger(result.discount_cents) || result.discount_cents < 0 || result.discount_cents > result.subtotal_cents) {
				throw new Error('O valor de desconto retornado é inválido. Tente novamente.');
			}
			appliedCoupon = result.code;
			couponInput = result.code;
			couponDiscountCents = result.discount_cents;
			idempotencyKey = crypto.randomUUID();
		} catch (error) {
			appliedCoupon = '';
			couponDiscountCents = 0;
			errorMessage = error instanceof Error ? error.message : 'Não foi possível aplicar este cupom.';
		} finally { couponBusy = false; }
	}

	async function calculateShipping(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		quotes = [];
		selectedQuoteId = '';
		idempotencyKey = '';
		if (!$cart.length) return;
		if (!cartPricingReady) { errorMessage = 'Aguarde a atualização dos preços do carrinho.'; return; }
		loadingQuotes = true;
		try {
			const result = await invokeCommerceFunction<QuotesResponse>('melhor-envio-quotes', {
				postal_code: address.postal_code.replace(/\D/g, ''),
				items: cartItems(),
				coupon_code: appliedCoupon || null
			});
			quotes = result.quotes ?? [];
			quoteExpiresAt = result.expires_at ?? '';
			if (quotes.length) {
				selectedQuoteId = quotes[0].id;
				idempotencyKey = crypto.randomUUID();
			} else {
				errorMessage = 'Não encontramos opções de frete para este CEP. Confira o endereço ou tente outro CEP.';
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Não foi possível calcular o frete agora.';
		} finally {
			loadingQuotes = false;
		}
	}

	async function startPayment() {
		errorMessage = '';
		if (!cartPricingReady) { errorMessage = 'Aguarde a atualização dos preços do carrinho.'; return; }
		const form = document.querySelector<HTMLFormElement>('.checkout-form');
		const phoneInput = form?.elements.namedItem('phone');
		if (phoneInput instanceof HTMLInputElement) {
			phoneInput.setCustomValidity(normalizeBrazilianPhone(customer.phone) ? '' : 'Informe um telefone brasileiro com DDD.');
		}
		if (form && !form.reportValidity()) return;
		if (!selectedQuoteId || !quotes.some((quote) => quote.id === selectedQuoteId)) {
			errorMessage = 'Selecione uma opção de frete para continuar.';
			return;
		}
		if (!idempotencyKey) idempotencyKey = crypto.randomUUID();
		creatingCheckout = true;
		try {
			const result = await invokeCommerceFunction<CheckoutResponse>('asaas-create-checkout', {
				idempotency_key: idempotencyKey,
				shipping_quote_option_id: selectedQuoteId,
				customer,
				shipping_address: {
					postal_code: address.postal_code.replace(/\D/g, ''),
					street: address.street.trim(),
					number: address.number.trim(),
					complement: address.complement.trim(),
					neighborhood: address.neighborhood.trim(),
					city: address.city.trim(),
					state: address.state.trim().toUpperCase()
				},
				items: cartItems(),
				coupon_code: appliedCoupon || null
			});
			let checkoutHost = '';
			try {
				checkoutHost = new URL(result.checkout_url).hostname;
			} catch {
				// A malformed or absent URL is rejected below.
			}
			if (
				!result.checkout_url ||
				!result.checkout_url.startsWith('https://') ||
				!(checkoutHost === 'asaas.com' || checkoutHost === 'sandbox.asaas.com')
			) {
				throw new Error('O checkout retornou um endereço inválido. Tente novamente.');
			}
			window.location.assign(result.checkout_url);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento agora.';
			creatingCheckout = false;
		}
	}
</script>

<svelte:head>
	<title>Finalizar pedido — Ponto de Torra</title>
	<meta name="description" content="Informe seus dados de entrega, escolha o frete e finalize seu pedido na Ponto de Torra." />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="page-hero wrap">
	<p class="eyebrow">Finalizar pedido</p>
	<h1 class="display-title">Quase lá<em>.</em></h1>
	<p>Informe seus dados para calcular a entrega e escolher a forma de pagamento.</p>
</section>

<section class="checkout-panel checkout-flow wrap">
	{#if !$cart.length}
		<h2>Seu carrinho está vazio.</h2>
		<p>Adicione um produto ao carrinho para continuar com seu pedido.</p>
		<a class="button" href="/colecao/cafes">Voltar à vitrine</a>
	{:else}
		<div class="checkout-grid">
			<form class="checkout-form" onsubmit={calculateShipping} oninput={detailsChanged}>
				<fieldset disabled={creatingCheckout}>
					<legend><span>1</span> Seus dados</legend>
					<div class="checkout-fields">
						<label>Nome completo<input bind:value={customer.name} name="name" autocomplete="name" required minlength="2" maxlength="120" /></label>
						<label>E-mail<input bind:value={customer.email} name="email" type="email" autocomplete="email" required maxlength="254" /></label>
						<label>WhatsApp ou telefone<input bind:value={customer.phone} name="phone" type="tel" autocomplete="tel" required maxlength="30" /></label>
					</div>
				</fieldset>

				<fieldset disabled={creatingCheckout}>
					<legend><span>2</span> Endereço de entrega</legend>
					<div class="checkout-fields address-fields">
						<label>CEP<input bind:value={address.postal_code} name="postal_code" autocomplete="postal-code" inputmode="numeric" pattern={'[0-9.-]{8,10}'} placeholder="00000-000" required maxlength="10" oninput={() => { quotes = []; selectedQuoteId = ''; idempotencyKey = ''; }} /></label>
						<label>Rua / Avenida<input bind:value={address.street} name="street" autocomplete="address-line1" required maxlength="120" /></label>
						<label>Número<input bind:value={address.number} name="number" required maxlength="20" /></label>
						<label>Complemento <small>opcional</small><input bind:value={address.complement} name="complement" autocomplete="address-line2" maxlength="80" /></label>
						<label>Bairro<input bind:value={address.neighborhood} name="neighborhood" required maxlength="80" /></label>
						<label>Cidade<input bind:value={address.city} name="city" autocomplete="address-level2" required maxlength="80" /></label>
						<label>UF<input bind:value={address.state} name="state" autocomplete="address-level1" required minlength="2" maxlength="2" pattern={'[A-Za-z]{2}'} /></label>
					</div>
					<button class="button checkout-quote-button" type="submit" disabled={loadingQuotes || !commerceFunctionsReady || !cartPricingReady}>
						{loadingQuotes ? 'Consultando transportadoras…' : quotes.length ? 'Atualizar opções de frete' : 'Calcular frete'}
					</button>
					{#if !commerceFunctionsReady}<p class="checkout-hint">A conexão local ainda precisa das variáveis públicas do Supabase no arquivo <code>.env</code>.</p>{/if}
				</fieldset>
			</form>

			<aside class="checkout-summary" aria-label="Resumo do pedido">
				<h2>Resumo do pedido</h2>
				{#each $cart as line (line.product.id)}
					<div class="checkout-line"><span>{line.quantity} × {line.product.name}</span><strong>{formatPrice(line.product.price * line.quantity)}</strong></div>
				{/each}
				<div class="checkout-line"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
				<div class="checkout-coupon"><label for="coupon-code">Cupom de desconto</label><div><input id="coupon-code" bind:value={couponInput} maxlength="40" placeholder="Ex.: TORRA10" autocomplete="off" oninput={() => { appliedCoupon = ''; couponDiscountCents = 0; idempotencyKey = ''; errorMessage = ''; }} /><button type="button" class="button button-dark" onclick={() => void applyCoupon()} disabled={couponBusy || !couponInput.trim()}>{couponBusy ? 'Validando…' : 'Aplicar'}</button></div>{#if appliedCoupon}<p class="coupon-applied">Cupom {appliedCoupon} aplicado: −{formatPrice(couponDiscount)} <button type="button" onclick={() => { couponInput = ''; appliedCoupon = ''; couponDiscountCents = 0; idempotencyKey = crypto.randomUUID(); }}>Remover</button></p>{/if}</div>
				{#if couponDiscountCents > 0}<div class="checkout-line coupon-saving"><span>Desconto</span><strong>−{formatPrice(couponDiscount)}</strong></div>{/if}
				{#if quotes.length}
					<fieldset class="shipping-options">
						<legend>Opções de frete</legend>
						{#each quotes as quote (quote.id)}
							<label class="shipping-option">
								<input type="radio" name="shipping" value={quote.id} bind:group={selectedQuoteId} onchange={() => (idempotencyKey = crypto.randomUUID())} />
								<span><strong>{quote.company_name} · {quote.service_name}</strong><small>{quote.delivery_days === null ? 'Prazo a confirmar' : `${quote.delivery_days} dia(s) úteis`}</small></span>
								<b>{formatPrice(quote.price_cents)}</b>
							</label>
						{/each}
						{#if quoteExpiresAt}<small class="checkout-hint">Cotação válida por alguns minutos; recalcule se expirar.</small>{/if}
					</fieldset>
				{:else}
					<div class="checkout-line"><span>Frete</span><span>A calcular pelo CEP</span></div>
				{/if}
				<div class="checkout-total"><span>{selectedQuote ? 'Total do pedido' : 'Total parcial'}</span><strong>{formatPrice(total)}</strong></div>
				<button class="button button-dark checkout-pay-button" type="button" onclick={startPayment} disabled={!selectedQuoteId || creatingCheckout || !commerceFunctionsReady || !cartPricingReady}>
					{creatingCheckout ? 'Conectando ao pagamento…' : 'Continuar para pagamento'}
				</button>
				<p class="checkout-disclaimer">Na próxima etapa, a Asaas solicitará os dados de faturamento necessários. O pedido será confirmado após a aprovação do pagamento.</p>
			</aside>
		</div>
		{#if errorMessage}<p class="checkout-error" role="alert">{errorMessage}</p>{/if}
		<div class="checkout-actions"><a class="text-link" href="/carrinho">← Voltar ao carrinho</a><a class="text-link" href="/colecao/cafes">Continuar explorando</a></div>
	{/if}
</section>
