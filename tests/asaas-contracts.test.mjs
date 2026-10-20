import test from 'node:test';
import assert from 'node:assert/strict';
import {
	buildAsaasCallbacks,
	buildAsaasCheckoutUrl,
	normalizeAsaasApiBase,
	normalizePublicSiteOrigin
} from '../supabase/functions/_shared/asaas.ts';
import { calculateCouponDiscountCents } from '../supabase/functions/_shared/coupons.ts';
import { normalizeBrazilianPhone } from '../supabase/functions/_shared/customer.ts';

test('public site URL accepts only a public HTTPS origin', () => {
	assert.equal(normalizePublicSiteOrigin('https://pontodetorra.netlify.app/'), 'https://pontodetorra.netlify.app');
	for (const value of [
		'', 'http://pontodetorra.netlify.app', 'https://pontodetorra.netlify.app/checkout',
		'https://pontodetorra.netlify.app/?x=1', 'https://user:pass@pontodetorra.netlify.app',
		'https://localhost', 'https://store.local', 'https://192.168.0.10'
	]) assert.throws(() => normalizePublicSiteOrigin(value));
});

test('Asaas API base permits only official v3 environments', () => {
	assert.deepEqual(normalizeAsaasApiBase(undefined), { base: 'https://api-sandbox.asaas.com/v3', sandbox: true });
	assert.deepEqual(normalizeAsaasApiBase('https://api.asaas.com/v3/'), { base: 'https://api.asaas.com/v3', sandbox: false });
	for (const value of ['http://api.asaas.com/v3', 'https://evil.example/v3', 'https://api.asaas.com/v3?next=x', 'https://api.asaas.com/other']) {
		assert.throws(() => normalizeAsaasApiBase(value));
	}
});

test('callbacks use the canonical return route and preserve query parameters', () => {
	const callbacks = buildAsaasCallbacks('https://pontodetorra.netlify.app', 481);
	assert.equal(callbacks.successUrl, 'https://pontodetorra.netlify.app/checkout/retorno?status=sucesso&order=481');
	assert.equal(callbacks.cancelUrl, 'https://pontodetorra.netlify.app/checkout/retorno?status=cancelado&order=481');
	assert.equal(callbacks.expiredUrl, 'https://pontodetorra.netlify.app/checkout/retorno?status=expirado&order=481');
});

test('checkout links are restricted to the matching Asaas environment and session', () => {
	assert.equal(buildAsaasCheckoutUrl('abc-123', true), 'https://sandbox.asaas.com/checkoutSession/show?id=abc-123');
	assert.equal(buildAsaasCheckoutUrl('abc-123', false, 'https://asaas.com/checkoutSession/show?id=abc-123'), 'https://asaas.com/checkoutSession/show?id=abc-123');
	assert.equal(buildAsaasCheckoutUrl('abc-123', true, 'https://evil.asaas.com/checkoutSession/show?id=abc-123'), 'https://sandbox.asaas.com/checkoutSession/show?id=abc-123');
	assert.equal(buildAsaasCheckoutUrl('abc-123', true, 'https://sandbox.asaas.com/checkoutSession/show?id=other'), 'https://sandbox.asaas.com/checkoutSession/show?id=abc-123');
});

test('coupon discounts enforce the server-supported range and never exceed subtotal', () => {
	assert.equal(calculateCouponDiscountCents('percent', 15, 10001), 1500);
	assert.equal(calculateCouponDiscountCents('percent', 90, 10000), 9000);
	assert.equal(calculateCouponDiscountCents('percent', 91, 10000), null);
	assert.equal(calculateCouponDiscountCents('percent', 100, 10000), null);
	assert.equal(calculateCouponDiscountCents('fixed', 5000, 3000), 3000);
	assert.equal(calculateCouponDiscountCents('unknown', 10, 1000), null);
	assert.equal(calculateCouponDiscountCents('fixed', 1, Number.MAX_SAFE_INTEGER + 1), null);
});

test('Brazilian phone numbers are normalized to 10 or 11 digits without country code', () => {
	assert.equal(normalizeBrazilianPhone('(83) 99873-9712'), '83998739712');
	assert.equal(normalizeBrazilianPhone('+55 (83) 99873-9712'), '83998739712');
	assert.equal(normalizeBrazilianPhone('8398739712'), '8398739712');
	assert.equal(normalizeBrazilianPhone('99873-9712'), null);
	assert.equal(normalizeBrazilianPhone('000000000000'), null);
});
