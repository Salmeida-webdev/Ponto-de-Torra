<script lang="ts">
	import { onMount } from 'svelte';
	import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
	import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
	import { products as storefrontProducts } from '../../lib/data/products';

	type View = 'visao' | 'produtos' | 'estoque' | 'pedidos' | 'cupons' | 'conteudo' | 'historico';
	type OrderLine = { name: string; variant: string; sku: string; quantity: number; unitPrice: number; lineTotal: number };
	type Order = { id: string; code: string; customer: string; email: string; phone: string; date: string; total: number; discount: number; status: string; statusValue: string; paymentStatus: string; tone: string; carrier: string; trackingCode: string; address: string; items: OrderLine[] };
	type InventoryItem = { variantId: string; productId: string; name: string; category: string; sku: string; units: number; onHand: number; reserved: number; minimum: number; image: string; price: number; active: boolean };
	type InventoryMovement = { date: string; item: string; sku: string; type: string; quantity: string; reason: string };
	type BestSeller = { name: string; category: string; units: number; value: string; image: string };
	type ProductRow = { productId: string; variantId: string; name: string; category: string; sku: string; value: string; units: number; active: boolean; image: string };
	type CouponRow = { id: string; code: string; discount: string; validity: string; active: boolean; type: 'fixed' | 'percent'; value: number; minimum: number; usageLimit: number | null; usageCount: number; startsAt: string; endsAt: string };
	type ProductVariantForm = { id?: string; sku: string; label: string; price: string; stock: number; weight: number; length: number; width: number; height: number };
	type ContentRow = { title: string; type: string; updated: string; published: boolean };
	type AuditRow = { action: string; entity: string; details: string; actor: string; date: string };
	type Raw = Record<string, any>;

	const menu: { id: View; label: string; icon: string }[] = [
		{ id: 'visao', label: 'Visão geral', icon: '◫' }, { id: 'produtos', label: 'Produtos', icon: '▧' },
		{ id: 'estoque', label: 'Estoque', icon: '▦' }, { id: 'pedidos', label: 'Pedidos', icon: '▤' },
		{ id: 'cupons', label: 'Cupons', icon: '％' }, { id: 'conteudo', label: 'Conteúdo', icon: '▤' },
		{ id: 'historico', label: 'Histórico', icon: '◷' }
	];
	const views: Record<View, { title: string; intro: string }> = {
		visao: { title: 'Visão geral', intro: 'Acompanhe os números reais da loja.' },
		produtos: { title: 'Produtos', intro: 'Catálogo, variantes, preços e disponibilidade.' },
		estoque: { title: 'Estoque', intro: 'Acompanhe quantidades, entradas e saídas automáticas.' },
		pedidos: { title: 'Pedidos', intro: 'Consulte pagamentos e acompanhe os envios.' },
		cupons: { title: 'Cupons', intro: 'Consulte regras de desconto cadastradas.' },
		conteudo: { title: 'Conteúdo', intro: 'Consulte páginas, receitas, guias e perguntas frequentes.' },
		historico: { title: 'Histórico de alterações', intro: 'Acompanhe registros administrativos.' }
	};
	const LOW_STOCK_THRESHOLD = 5;
	const hasSupabaseConfig = Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_PUBLISHABLE_KEY);
	let supabase: SupabaseClient | null = $state(null);
	let session: Session | null = $state(null);
	let userEmail = $state('');
	let authReady = $state(false);
	let signedIn = $state(false);
	let accessDenied = $state(false);
	let authError = $state('');
	let loginEmail = $state('');
	let loginPassword = $state('');
	let loadingData = $state(false);
	let loadError = $state('');
	let actionError = $state('');
	let savingAction = $state(false);
	let orders: Order[] = $state([]);
	let stock: InventoryItem[] = $state([]);
	let inventoryMovements: InventoryMovement[] = $state([]);
	let bestSellers: BestSeller[] = $state([]);
	let productRows: ProductRow[] = $state([]);
	let couponRows: CouponRow[] = $state([]);
	let contentRows: ContentRow[] = $state([]);
	let auditRows: AuditRow[] = $state([]);
	let active: View = $state('visao');
	let period = $state('30 dias');
	let search = $state('');
	let productSearch = $state('');
	let statusFilter = $state('Todos');
	let mobileMenuOpen = $state(false);
	let selectedOrder: Order | null = $state(null);
	let orderStatus = $state('processing');
	let orderCarrier = $state('');
	let orderTracking = $state('');
	let orderSaved = $state(false);
	let orderDialog: HTMLDialogElement | undefined = $state(undefined);
	let showStockForm = $state(false);
	let stockDialog: HTMLDialogElement | undefined = $state(undefined);
	let stockProductSku = $state('');
	let stockQuantity = $state(1);
	let stockReason = $state('Compra recebida');
	let stockSaved = $state(false);
	let productDialog: HTMLDialogElement | undefined = $state(undefined);
	let couponDialog: HTMLDialogElement | undefined = $state(undefined);
	let showProductForm = $state(false);
	let showCouponForm = $state(false);
	let productId = $state('');
	let productName = $state('');
	let productSlug = $state('');
	let productDescription = $state('');
	let productCategory = $state('');
	let productIsActive = $state(true);
	let productPhoto: File | null = $state(null);
	let productPhotoName = $state('');
	let productVariants: ProductVariantForm[] = $state([]);
	let originalVariantIds: string[] = $state([]);
	let categories: { id: string; name: string }[] = $state([]);
	let editingCouponId = $state('');
	let couponCode = $state('');
	let couponType = $state<'fixed' | 'percent'>('percent');
	let couponValue = $state(10);
	let couponMinimum = $state(0);
	let couponUsageLimit = $state('');
	let couponStartsAt = $state('');
	let couponEndsAt = $state('');
	let couponActive = $state(true);
	let freightBusy = $state(false);
	let freightMessage = $state('');
	let current = $derived(views[active]);
	const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	let periodDays = $derived(period === '7 dias' ? 7 : period === '90 dias' ? 90 : 30);
	let periodStart = $derived(Date.now() - periodDays * 86400000);
	let paidOrdersInPeriod = $derived(orders.filter((order) => order.paymentStatus === 'approved' && new Date(order.date).getTime() >= periodStart));
	let revenueInPeriod = $derived(paidOrdersInPeriod.reduce((sum, order) => sum + order.total, 0));
	let discountOrdersInPeriod = $derived(paidOrdersInPeriod.filter((order) => order.discount > 0).length);
	let stats = $derived({ sales: money(revenueInPeriod), orders: paidOrdersInPeriod.length, ticket: money(paidOrdersInPeriod.length ? revenueInPeriod / paidOrdersInPeriod.length : 0), coupons: discountOrdersInPeriod, bars: orderBars(paidOrdersInPeriod), labels: periodLabels() });
	let couponRate = $derived(paidOrdersInPeriod.length ? (stats.coupons / paidOrdersInPeriod.length * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0,0');
	let filteredOrders = $derived(orders.filter((order) => `${order.code} ${order.customer} ${order.email} ${order.status}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'Todos' || order.status === statusFilter)));
	let filteredProducts = $derived(productRows.filter((product) => `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(productSearch.toLowerCase())));
	let lowStock = $derived(stock.filter((item) => item.units <= LOW_STOCK_THRESHOLD));
	let statusCounts = $derived({ delivered: orders.filter((o) => o.statusValue === 'delivered').length, preparing: orders.filter((o) => ['paid', 'processing'].includes(o.statusValue)).length, sent: orders.filter((o) => o.statusValue === 'shipped').length, waiting: orders.filter((o) => ['awaiting_payment', 'payment_failed', 'expired'].includes(o.statusValue)).length, other: orders.filter((o) => ['delivered', 'paid', 'processing', 'shipped', 'awaiting_payment', 'payment_failed', 'expired'].indexOf(o.statusValue) === -1).length });
	let totalStatusOrders = $derived(statusCounts.delivered + statusCounts.preparing + statusCounts.sent + statusCounts.waiting);
	let statusGradient = $derived(statusDonutGradient(statusCounts, totalStatusOrders));
	let movementsUnits = $derived(stock.reduce((sum, item) => sum + item.units, 0));
	$effect(() => { if (!orderDialog) return; if (selectedOrder && !orderDialog.open) orderDialog.showModal(); if (!selectedOrder && orderDialog.open) orderDialog.close(); });
	$effect(() => { if (!stockDialog) return; if (showStockForm && !stockDialog.open) stockDialog.showModal(); if (!showStockForm && stockDialog.open) stockDialog.close(); });
	$effect(() => { if (!productDialog) return; if (showProductForm && !productDialog.open) productDialog.showModal(); if (!showProductForm && productDialog.open) productDialog.close(); });
	$effect(() => { if (!couponDialog) return; if (showCouponForm && !couponDialog.open) couponDialog.showModal(); if (!showCouponForm && couponDialog.open) couponDialog.close(); });

	function orderBars(rows: Order[]) {
		const count = period === '7 dias' ? 7 : period === '90 dias' ? 12 : 14;
		const buckets = Array.from({ length: count }, () => 0);
		const start = Date.now() - periodDays * 86400000;
		for (const order of rows) { const i = Math.floor((new Date(order.date).getTime() - start) / (periodDays * 86400000 / count)); if (i >= 0 && i < count) buckets[i] += order.total; }
		const max = Math.max(...buckets, 1);
		return buckets.map((value) => value ? Math.max(7, Math.round(value / max * 100)) : 0);
	}
	function periodLabels() {
		const points = 5; const start = Date.now() - periodDays * 86400000;
		return Array.from({ length: points }, (_, index) => new Date(start + (periodDays * 86400000 * index / (points - 1))).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }));
	}
	function statusDonutGradient(counts: typeof statusCounts, total: number) {
		if (!total) return 'conic-gradient(#e7e0d8 0 100%)';
		const d = counts.delivered / total * 100; const p = d + counts.preparing / total * 100; const s = p + counts.sent / total * 100;
		const w = s + counts.waiting / total * 100;
		return `conic-gradient(#839078 0 ${d}%,#b98965 ${d}% ${p}%,#d0aa7c ${p}% ${s}%,#ddd3c6 ${s}% ${w}%,#a79aa0 ${w}% 100%)`;
	}
	function displayDate(value: string) { return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
	function statusLabel(value: string) { return ({ awaiting_payment: 'Aguardando pagamento', paid: 'Pagamento confirmado', processing: 'Em preparação', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', payment_failed: 'Pagamento recusado', expired: 'Expirado', refund_pending: 'Estorno pendente', refunded: 'Reembolsado' } as Record<string, string>)[value] ?? value; }
	function toneFor(value: string) { return ({ awaiting_payment: 'waiting', paid: 'preparing', processing: 'preparing', shipped: 'sent', delivered: 'delivered' } as Record<string, string>)[value] ?? 'waiting'; }
	function imageFor(slug?: string) { return storefrontProducts.find((item) => item.slug === slug)?.image ?? '/images/products/p01.jpg'; }
	function formatAddress(value: unknown) {
		if (!value || typeof value !== 'object') return 'Endereço não informado';
		const a = value as Record<string, unknown>;
		return [a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.postal_code ?? a.cep].filter(Boolean).join(', ') || 'Endereço registrado no pedido';
	}
	function openOrder(order: Order) { selectedOrder = order; orderStatus = order.statusValue === 'paid' ? 'processing' : order.statusValue; orderCarrier = order.carrier; orderTracking = order.trackingCode; actionError = ''; }
	async function saveOrder() {
		if (!selectedOrder || !supabase) return;
		savingAction = true; actionError = '';
		try {
			const { error } = await supabase.functions.invoke('admin-update-order-shipping', { body: { order_id: selectedOrder.id, target_status: orderStatus, carrier: orderCarrier.trim(), tracking_code: orderTracking.trim() } });
			if (error) throw error;
			selectedOrder = null; orderSaved = true; setTimeout(() => orderSaved = false, 3200); await loadDashboardData();
		} catch (error) { actionError = error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.'; }
		finally { savingAction = false; }
	}
	function openStockEntry(sku?: string) { stockProductSku = sku ?? stock[0]?.sku ?? ''; stockQuantity = 1; stockReason = 'Compra recebida'; actionError = ''; showStockForm = true; }
	async function saveStockEntry() {
		const qty = Math.floor(Number(stockQuantity)); const item = stock.find((row) => row.sku === stockProductSku);
		if (!item || !Number.isFinite(qty) || qty < 1 || !supabase) return;
		savingAction = true; actionError = '';
		try {
			const { error } = await supabase.functions.invoke('admin-stock-entry', { body: { variant_id: item.variantId, quantity: qty, reason: stockReason, idempotency_key: crypto.randomUUID() } });
			if (error) throw error;
			showStockForm = false; stockSaved = true; setTimeout(() => stockSaved = false, 3200); await loadDashboardData();
		} catch (error) { actionError = error instanceof Error ? error.message : 'Não foi possível registrar a entrada.'; }
		finally { savingAction = false; }
	}
	function newVariant(): ProductVariantForm { return { sku: '', label: '', price: '', stock: 0, weight: 250, length: 12, width: 8, height: 8 }; }
	function openNewProduct() { productId = ''; productName = ''; productSlug = ''; productDescription = ''; productCategory = categories[0]?.id ?? ''; productIsActive = true; productPhoto = null; productPhotoName = ''; originalVariantIds = []; productVariants = [newVariant()]; actionError = ''; showProductForm = true; }
	async function openEditProduct(row: ProductRow) {
		if (!supabase) return;
		actionError = '';
		const [{ data: product, error }, { data: variants, error: variantError }, { data: images }] = await Promise.all([
			supabase.from('products').select('id,name,slug,description,category_id,is_active').eq('id', row.productId).single(),
			supabase.from('product_variants').select('id,sku,label,price_cents,stock_on_hand,weight_grams,dimensions_mm').eq('product_id', row.productId).order('sku'),
			supabase.from('product_images').select('storage_path').eq('product_id', row.productId).eq('is_primary', true).is('variant_id', null).limit(1)
		]);
		if (error || variantError || !product) { actionError = 'Não foi possível abrir este produto para edição.'; return; }
		productId = product.id; productName = product.name; productSlug = product.slug; productDescription = product.description; productCategory = product.category_id ?? ''; productIsActive = product.is_active; productPhoto = null; productPhotoName = images?.[0]?.storage_path?.split('/').pop() ?? '';
		productVariants = (variants ?? []).map((item) => { const dim = item.dimensions_mm ?? {}; return { id: item.id, sku: item.sku, label: item.label, price: (item.price_cents / 100).toFixed(2), stock: item.stock_on_hand, weight: item.weight_grams ?? 250, length: Math.round((dim.length ?? 120) / 10), width: Math.round((dim.width ?? 80) / 10), height: Math.round((dim.height ?? 80) / 10) }; });
		originalVariantIds = productVariants.flatMap((variant) => variant.id ? [variant.id] : []);
		if (!productVariants.length) productVariants = [newVariant()];
		showProductForm = true;
	}
	async function saveProduct() {
		if (!supabase) return;
		savingAction = true; actionError = '';
		try {
			const slug = productSlug.trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			if (!productName.trim() || !slug || !productVariants.length || productVariants.some((v) => !v.sku.trim() || !v.label.trim() || Number(v.price) <= 0)) throw new Error('Preencha nome, endereço do produto e os campos de cada variante.');
			if (!productId && !productPhoto) throw new Error('Adicione uma imagem principal para o produto.');
			const productPayload = { name: productName.trim(), slug, description: productDescription.trim(), category_id: productCategory || null, is_active: productIsActive, is_portfolio_demo: true, published_at: productIsActive ? new Date().toISOString() : null };
			let savedId = productId;
			if (savedId) { const { error } = await supabase.from('products').update(productPayload).eq('id', savedId); if (error) throw error; }
			else { const { data, error } = await supabase.from('products').insert(productPayload).select('id').single(); if (error || !data) throw error ?? new Error('Produto não salvo.'); savedId = data.id; }
			for (const variant of productVariants) {
				const payload = { product_id: savedId, sku: variant.sku.trim(), label: variant.label.trim(), attributes: { unidade: variant.label.trim() }, price_cents: Math.round(Number(variant.price) * 100), weight_grams: Math.max(Number(variant.weight), 1), dimensions_mm: { length: Math.max(Number(variant.length), 1) * 10, width: Math.max(Number(variant.width), 1) * 10, height: Math.max(Number(variant.height), 1) * 10 }, is_active: true };
				const { error } = variant.id ? await supabase.from('product_variants').update(payload).eq('id', variant.id) : await supabase.from('product_variants').insert(payload);
				if (error) throw error;
			}
			const removedIds = originalVariantIds.filter((id) => !productVariants.some((variant) => variant.id === id));
			for (const id of removedIds) { const item = stock.find((row) => row.variantId === id); if ((item?.reserved ?? 0) > 0) throw new Error(`Não é possível remover a variante ${item?.sku ?? ''}: há pedidos aguardando pagamento.`); const { error } = await supabase.from('product_variants').update({ is_active: false }).eq('id', id); if (error) throw error; }
			if (productPhoto) {
				const extension = productPhoto.type === 'image/png' ? 'png' : productPhoto.type === 'image/webp' ? 'webp' : 'jpg';
				const path = `${savedId}/${crypto.randomUUID()}.${extension}`;
				const { error: uploadError } = await supabase.storage.from('product-images').upload(path, productPhoto, { contentType: productPhoto.type, upsert: false });
				if (uploadError) throw uploadError;
				const { error: clearError } = await supabase.from('product_images').update({ is_primary: false }).eq('product_id', savedId).is('variant_id', null).eq('is_primary', true);
				if (clearError) throw clearError;
				const { error: imageError } = await supabase.from('product_images').insert({ product_id: savedId, storage_path: path, alt_text: `Foto de ${productName.trim()}`, sort_order: 0, is_primary: true });
				if (imageError) throw imageError;
			}
			showProductForm = false; orderSaved = true; setTimeout(() => orderSaved = false, 3200); await loadDashboardData();
		} catch (error) { actionError = error instanceof Error ? error.message : 'Não foi possível salvar o produto.'; }
		finally { savingAction = false; }
	}
	function openNewCoupon(coupon?: CouponRow) { editingCouponId = coupon?.id ?? ''; couponCode = coupon?.code ?? ''; couponType = coupon?.type ?? 'percent'; couponValue = coupon ? (coupon.type === 'fixed' ? coupon.value / 100 : coupon.value) : 10; couponMinimum = coupon?.minimum ?? 0; couponUsageLimit = coupon?.usageLimit?.toString() ?? ''; couponStartsAt = coupon?.startsAt ? coupon.startsAt.slice(0, 16) : ''; couponEndsAt = coupon?.endsAt ? coupon.endsAt.slice(0, 16) : ''; couponActive = coupon?.active ?? true; actionError = ''; showCouponForm = true; }
	async function saveCoupon() {
		if (!supabase) return; savingAction = true; actionError = '';
		try {
			const numericValue = Number(couponValue);
			const value = couponType === 'fixed' ? Math.round(numericValue * 100) : Math.floor(numericValue);
			const minimum = Number(couponMinimum ?? 0);
			const usageLimit = couponUsageLimit.trim() ? Number(couponUsageLimit) : null;
			const startDate = couponStartsAt ? new Date(couponStartsAt) : null;
			const endDate = couponEndsAt ? new Date(couponEndsAt) : null;
			if (!/^[A-Za-z0-9_-]{2,40}$/.test(couponCode.trim())) throw new Error('Use um código de 2 a 40 caracteres: letras, números, hífen ou sublinhado.');
			if (!Number.isFinite(numericValue) || value < 1 || (couponType === 'percent' && numericValue > 90)) throw new Error('Informe um desconto válido. O percentual pode chegar a 90%; o valor fixo deve ser maior que R$ 0,00.');
			if (!Number.isFinite(minimum) || minimum < 0) throw new Error('O subtotal mínimo deve ser zero ou maior.');
			if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) throw new Error('O limite de usos deve ser um número inteiro maior que zero ou ficar vazio.');
			if ((startDate && !Number.isFinite(startDate.getTime())) || (endDate && !Number.isFinite(endDate.getTime()))) throw new Error('Confira as datas de validade do cupom.');
			if (startDate && endDate && endDate <= startDate) throw new Error('O encerramento deve ser posterior ao início.');
			const payload = { code: couponCode.trim().toUpperCase(), discount_type: couponType, discount_value: value, minimum_subtotal_cents: Math.round(minimum * 100), usage_limit: usageLimit, starts_at: startDate?.toISOString() ?? null, ends_at: endDate?.toISOString() ?? null, is_active: couponActive };
			const { error } = editingCouponId ? await supabase.from('coupons').update(payload).eq('id', editingCouponId) : await supabase.from('coupons').insert(payload);
			if (error) {
				if (error.code === '23505') throw new Error('Já existe um cupom com esse código. Escolha outro código ou edite o cupom existente.');
				if (error.code === '23502') throw new Error('Preencha os campos obrigatórios do cupom. O subtotal mínimo pode ser R$ 0,00.');
				if (error.code === '23514') throw new Error('Os valores ou o período de validade não passaram pela validação. Confira os campos.');
				if (error.code === '42501') throw new Error('Sua conta não tem permissão para gerenciar cupons.');
				throw new Error(error.message || 'Não foi possível salvar o cupom.');
			}
			showCouponForm = false; await loadDashboardData();
		} catch (error) { actionError = error instanceof Error ? error.message : 'Não foi possível salvar o cupom.'; }
		finally { savingAction = false; }
	}
	function exportCsv() {
		const csv = ['Pedido,Cliente,Data,Total,Status', ...orders.map((o) => [o.code, o.customer, displayDate(o.date), o.total.toFixed(2).replace('.', ','), o.status].map((v) => `"${v.replaceAll('"', '""')}"`).join(','))].join('\n');
		const file = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = 'ponto-de-torra-pedidos.csv'; link.click(); URL.revokeObjectURL(url);
	}
	async function loadDashboardData() {
		if (!supabase) return;
		loadingData = true; loadError = '';
		try {
			const [orderResult, shipmentResult, variantResult, movementResult, itemResult, couponResult, contentResult, auditResult, categoryResult, imageResult] = await Promise.all([
				supabase.from('orders').select('id,order_number,status,payment_status,customer_name,customer_email,customer_phone,shipping_address,total_cents,discount_cents,created_at').order('created_at', { ascending: false }).limit(500),
				supabase.from('shipments').select('order_id,service_name,tracking_code,tracking_url,created_at').order('created_at', { ascending: false }).limit(1000),
				supabase.from('product_variants').select('id,product_id,sku,label,price_cents,stock_on_hand,stock_reserved,is_active,products(name,slug,categories(name))').order('sku').limit(1000),
				supabase.from('stock_movements').select('variant_id,movement_type,quantity_delta,reason,order_id,created_at,product_variants(sku,products(name))').order('created_at', { ascending: false }).limit(100),
				supabase.from('order_items').select('order_id,product_name_snapshot,variant_label_snapshot,sku_snapshot,quantity,unit_price_cents,line_total_cents').limit(5000),
				supabase.from('coupons').select('code,discount_type,discount_value,ends_at,is_active').order('created_at', { ascending: false }).limit(500),
				supabase.from('content_entries').select('title,content_type,updated_at,is_published').order('updated_at', { ascending: false }).limit(500),
				supabase.from('admin_audit_log').select('action,entity_type,details,actor_user_id,created_at').order('created_at', { ascending: false }).limit(100),
				supabase.from('categories').select('id,name').order('sort_order'),
				supabase.from('product_images').select('product_id,storage_path').eq('is_primary', true).is('variant_id', null).limit(2000)
			]);
			const error = [orderResult, shipmentResult, variantResult, movementResult, itemResult, couponResult, contentResult, auditResult, categoryResult, imageResult].find((result) => result.error)?.error;
			if (error) throw error;
			categories = (categoryResult.data ?? []) as { id: string; name: string }[];
			const imageByProduct = new Map(((imageResult.data ?? []) as unknown as Raw[]).map((row) => [row.product_id, supabase!.storage.from('product-images').getPublicUrl(row.storage_path).data.publicUrl]));
			const rawOrders = (orderResult.data ?? []) as unknown as Raw[]; const rawShipments = (shipmentResult.data ?? []) as unknown as Raw[]; const rawItems = (itemResult.data ?? []) as unknown as Raw[];
			const latestShipment = new Map<string, Raw>(); for (const row of rawShipments) if (!latestShipment.has(row.order_id)) latestShipment.set(row.order_id, row);
			const itemsByOrder = new Map<string, OrderLine[]>();
			for (const row of rawItems) {
				const item = { name: row.product_name_snapshot ?? 'Produto', variant: row.variant_label_snapshot ?? '', sku: row.sku_snapshot ?? '', quantity: Number(row.quantity) || 0, unitPrice: (Number(row.unit_price_cents) || 0) / 100, lineTotal: (Number(row.line_total_cents) || 0) / 100 };
				itemsByOrder.set(row.order_id, [...(itemsByOrder.get(row.order_id) ?? []), item]);
			}
			orders = rawOrders.map((row) => { const shipment = latestShipment.get(row.id); return { id: row.id, code: `#PT-${row.order_number}`, customer: row.customer_name, email: row.customer_email, phone: row.customer_phone ?? '', date: row.created_at, total: row.total_cents / 100, discount: row.discount_cents / 100, status: statusLabel(row.status), statusValue: row.status, paymentStatus: row.payment_status, tone: toneFor(row.status), carrier: shipment?.service_name ?? '', trackingCode: shipment?.tracking_code ?? '', address: formatAddress(row.shipping_address), items: itemsByOrder.get(row.id) ?? [] }; });
			const rawVariants = (variantResult.data ?? []) as unknown as Raw[];
			stock = rawVariants.map((row) => { const product = row.products as Raw | null; const linkedCategories = product?.categories; const category = Array.isArray(linkedCategories) ? linkedCategories[0]?.name : linkedCategories?.name; return { variantId: row.id, productId: row.product_id, name: product?.name ?? 'Produto', category: category ?? 'Sem categoria', sku: row.sku, units: row.stock_on_hand - row.stock_reserved, onHand: row.stock_on_hand, reserved: row.stock_reserved, minimum: LOW_STOCK_THRESHOLD, image: imageByProduct.get(row.product_id) ?? imageFor(product?.slug), price: row.price_cents / 100, active: row.is_active }; });
			productRows = stock.map((row) => ({ productId: row.productId, variantId: row.variantId, name: row.name, category: row.category, sku: row.sku, value: money(row.price), units: row.units, active: row.active, image: row.image }));
			const orderNumbers = new Map(orders.map((order) => [order.id, order.code])); const rawMovements = (movementResult.data ?? []) as unknown as Raw[];
			inventoryMovements = rawMovements.map((row) => { const variant = row.product_variants as Raw | null; return { date: displayDate(row.created_at), item: variant?.products?.name ?? 'Produto', sku: variant?.sku ?? '', type: ['incoming', 'return'].includes(row.movement_type) ? 'Entrada' : row.movement_type === 'sale' ? 'Saída automática' : 'Ajuste', quantity: `${row.quantity_delta > 0 ? '+' : '−'}${Math.abs(row.quantity_delta)}`, reason: row.order_id ? `${row.reason} · ${orderNumbers.get(row.order_id) ?? 'pedido'}` : row.reason }; });
			const sold = new Map<string, { units: number; revenue: number }>();
			for (const item of rawItems) { const order = orders.find((entry) => entry.id === item.order_id && entry.paymentStatus === 'approved'); if (!order || new Date(order.date).getTime() < periodStart) continue; const current = sold.get(item.product_name_snapshot) ?? { units: 0, revenue: 0 }; current.units += item.quantity; current.revenue += item.quantity * item.unit_price_cents / 100; sold.set(item.product_name_snapshot, current); }
			bestSellers = [...sold.entries()].sort((a, b) => b[1].units - a[1].units).slice(0, 3).map(([name, sales]) => { const product = storefrontProducts.find((item) => item.name === name); const variant = stock.find((item) => item.name === name); return { name, category: variant?.category ?? 'Produtos', units: sales.units, value: money(sales.revenue), image: product?.image ?? variant?.image ?? '/images/products/p01.jpg' }; });
			couponRows = ((couponResult.data ?? []) as unknown as Raw[]).map((row) => ({ id: row.id, code: row.code, discount: row.discount_type === 'percent' ? `${row.discount_value}% de desconto` : money(row.discount_value / 100), validity: row.ends_at ? `Até ${new Date(row.ends_at).toLocaleDateString('pt-BR')}` : 'Sem data final', active: row.is_active, type: row.discount_type, value: row.discount_value, minimum: row.minimum_subtotal_cents / 100, usageLimit: row.usage_limit, usageCount: row.usage_count, startsAt: row.starts_at ?? '', endsAt: row.ends_at ?? '' }));
			contentRows = ((contentResult.data ?? []) as unknown as Raw[]).map((row) => ({ title: row.title, type: row.content_type.toUpperCase(), updated: displayDate(row.updated_at), published: row.is_published }));
			auditRows = ((auditResult.data ?? []) as unknown as Raw[]).map((row) => ({ action: row.action, entity: row.entity_type, details: JSON.stringify(row.details), actor: row.actor_user_id ?? 'Sistema', date: displayDate(row.created_at) }));
		} catch (error) { loadError = error instanceof Error ? error.message : 'Não foi possível carregar os dados do painel.'; }
		finally { loadingData = false; }
	}
	async function verifyAdmin(userId: string) {
		if (!supabase) return; const { data, error } = await supabase.from('staff_memberships').select('role').eq('user_id', userId).maybeSingle();
		if (error || data?.role !== 'admin') { accessDenied = true; signedIn = false; return; }
		accessDenied = false; signedIn = true; await loadDashboardData();
	}
	async function signIn() {
		if (!supabase) return; authError = '';
		const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
		if (error || !data.user) { authError = 'Não foi possível entrar. Confira seu e-mail, senha e liberação de administrador.'; return; }
		session = data.session; userEmail = data.user.email ?? loginEmail; await verifyAdmin(data.user.id);
	}
	async function connectFreight() {
		if (!supabase) return;
		freightBusy = true;
		freightMessage = '';
		try {
			const { data, error } = await supabase.functions.invoke('melhor-envio-oauth-start', { body: {} });
			if (error) {
				let detail = error.message;
				if ('context' in error && error.context instanceof Response) {
					const payload = await error.context.clone().json().catch(() => null);
					if (typeof payload?.error === 'string') detail = payload.error;
				}
				throw new Error(detail);
			}
			const target = typeof data?.authorization_url === 'string' ? new URL(data.authorization_url) : null;
			if (!target || !['https://melhorenvio.com.br', 'https://sandbox.melhorenvio.com.br'].includes(target.origin)) {
				throw new Error('A Melhor Envio retornou um endereço de autorização inválido.');
			}
			window.location.assign(target.toString());
		} catch (error) {
			freightMessage = error instanceof Error ? error.message : 'Não foi possível iniciar a conexão da Melhor Envio.';
		} finally {
			freightBusy = false;
		}
	}
	async function signOut() { if (supabase) await supabase.auth.signOut(); session = null; signedIn = false; accessDenied = false; userEmail = ''; orders = []; stock = []; inventoryMovements = []; bestSellers = []; productRows = []; }
	onMount(() => {
		const oauthStatus = new URLSearchParams(window.location.search).get('melhor_envio');
		if (oauthStatus) {
			freightMessage = oauthStatus === 'connected' ? 'Conta Melhor Envio conectada. Você já pode testar uma cotação.' : `A conexão com a Melhor Envio não foi concluída (${oauthStatus.replaceAll('_', ' ')}). Revise o aplicativo OAuth e tente novamente.`;
			window.history.replaceState({}, '', window.location.pathname);
		}
		if (!hasSupabaseConfig) { authReady = true; authError = 'A conexão local com o Supabase ainda não foi configurada.'; return; }
		supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
		let activeListener = true;
		void supabase.auth.getSession().then(async ({ data }) => { if (!activeListener) return; session = data.session; userEmail = data.session?.user.email ?? ''; if (data.session?.user.id) await verifyAdmin(data.session.user.id); authReady = true; });
		const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (!activeListener) return; session = nextSession; userEmail = nextSession?.user.email ?? ''; if (!nextSession) { signedIn = false; accessDenied = false; } else if (!signedIn) queueMicrotask(() => void verifyAdmin(nextSession.user.id)); });
		return () => { activeListener = false; listener.subscription.unsubscribe(); };
	});
</script>

<svelte:head>
	<title>Painel administrativo — Ponto de Torra</title>
	<meta name="description" content="Painel administrativo da loja Ponto de Torra." />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if !authReady}
		<main class="login-shell"><section class="login-card"><img src="/logo.svg" alt="Ponto de Torra"/><p>PAINEL ADMINISTRATIVO</p><h1>Verificando acesso</h1><span>Aguarde enquanto validamos sua sessão.</span></section></main>
{:else if !signedIn}
	<main class="login-shell"><section class="login-card">
		<a href="/" class="login-back">← Voltar para a loja</a><img src="/logo.svg" alt="Ponto de Torra"/>
		<p>PAINEL ADMINISTRATIVO</p><h1>{accessDenied ? 'Acesso não liberado' : 'Entrar no painel'}</h1>
		{#if accessDenied}<div class="login-message error" role="alert">Esta conta não está cadastrada como administradora da loja. Peça ao responsável para liberar o acesso no Supabase.</div>{:else}<p class="login-subtitle">Acesse os pedidos, o catálogo e o estoque.</p><form class="login-form" onsubmit={(event) => { event.preventDefault(); void signIn(); }}>
			<label>E-mail<input type="email" autocomplete="username" bind:value={loginEmail} required /></label>
			<label>Senha<input type="password" autocomplete="current-password" bind:value={loginPassword} required /></label>
			{#if authError}<div class="login-message error" role="alert">{authError}</div>{/if}
			<button type="submit" class="admin-button" disabled={!hasSupabaseConfig}>Entrar com segurança</button>
		</form>{/if}
	</section></main>
{:else}
<div class="admin-shell">
	<aside class:mobile-open={mobileMenuOpen} class="admin-sidebar" aria-label="Navegação do painel">
		<a class="admin-brand" href="/" aria-label="Ponto de Torra — voltar à loja">
			<img src="/logo-light.svg" alt="Ponto de Torra" />
			<span>ADMINISTRAÇÃO</span>
		</a>
		<div class="admin-side-label">MENU PRINCIPAL</div>
		<nav class="admin-nav">
			{#each menu as item}
				<button class:active={active === item.id} class="admin-nav-link" aria-current={active === item.id ? 'page' : undefined} onclick={() => { active = item.id; mobileMenuOpen = false; }}>
					<span class="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
				{#if item.id === 'pedidos' && orders.length}<span class="nav-count">{orders.length > 99 ? '99+' : orders.length}</span>{/if}
				</button>
			{/each}
		</nav>
		<div class="sidebar-bottom">
			<div class="admin-user"><span class="avatar">{userEmail.slice(0, 1).toUpperCase()}</span><span><strong>{userEmail}</strong><small>Administrador</small></span><button class="user-menu" aria-label="Sair do painel" onclick={() => void signOut()}>↗</button></div>
			<a class="back-store" href="/">← <span>Voltar para a loja</span></a>
		</div>
	</aside>
	<div class="admin-main">
		<header class="admin-topbar">
			<button class="menu-toggle" aria-label="Abrir navegação" aria-expanded={mobileMenuOpen} onclick={() => mobileMenuOpen = !mobileMenuOpen}>☰</button>
			<div class="admin-breadcrumb"><span>Ponto de Torra</span><b>/</b>{current.title}</div>
			<div class="topbar-actions"><span class="status-indicator"><i></i> Pagamentos em sandbox</span><button class="admin-button secondary freight-connect" onclick={() => void connectFreight()} disabled={freightBusy}>{freightBusy ? 'Abrindo…' : 'Conectar frete'}</button><span class="topbar-avatar" aria-label={userEmail}>{userEmail.slice(0, 1).toUpperCase()}</span></div>
		</header>
		<div class="admin-content">
			<div class="portfolio-banner"><span class="banner-icon" aria-hidden="true">i</span><span><strong>Ambiente de portfólio</strong> · catálogo e preços demonstrativos; pedidos, pagamentos de teste e estoque exibem os dados deste projeto.</span></div>
			{#if freightMessage}<div class="login-message" class:error={!freightMessage.includes('conectada.')} role="status">{freightMessage}</div>{/if}
			{#if loadError}<div class="login-message error" role="alert">Não foi possível carregar os dados: {loadError}</div>{/if}
			{#if loadingData}<div class="save-toast" role="status">Atualizando dados do Supabase…</div>{/if}
			{#if orderSaved}<div class="save-toast" role="status">Pedido atualizado no Supabase.</div>{/if}
			{#if stockSaved}<div class="save-toast" role="status">Entrada de estoque registrada no Supabase.</div>{/if}
			<div class="page-heading"><div><p class="admin-eyebrow">PAINEL ADMINISTRATIVO</p><h1>{current.title}</h1><p class="page-description">{current.intro}</p></div>
				{#if active === 'visao'}<label class="period-select">Período <select bind:value={period} aria-label="Filtrar período"><option>7 dias</option><option>30 dias</option><option>90 dias</option></select></label>{:else if active === 'pedidos'}<button class="admin-button secondary" onclick={exportCsv}><span aria-hidden="true">↓</span> Exportar CSV</button>{:else if active === 'estoque'}<button class="admin-button" onclick={() => openStockEntry()}>+ Registrar entrada</button>{:else if active === 'produtos'}<button class="admin-button" onclick={openNewProduct}>+ Adicionar produto</button>{:else if active === 'cupons'}<button class="admin-button" onclick={() => openNewCoupon()}>+ Criar cupom</button>{/if}
			</div>

			{#if active === 'visao'}
				<section class="metrics-grid" aria-label="Indicadores do período">
					<article class="metric-card"><div class="metric-top"><span>Vendas no período</span><span class="metric-icon coffee-icon">R$</span></div><strong>{stats.sales}</strong><small><b class="positive">↗ 12,8%</b> em relação ao período anterior</small><div class="metric-sparkline" aria-hidden="true"><i style="height:32%"></i><i style="height:46%"></i><i style="height:38%"></i><i style="height:59%"></i><i style="height:48%"></i><i style="height:76%"></i><i style="height:68%"></i><i style="height:92%"></i></div></article>
					<article class="metric-card"><div class="metric-top"><span>Pedidos</span><span class="metric-icon">▤</span></div><strong>{stats.orders}</strong><small><b class="positive">↗ 8,2%</b> em relação ao período anterior</small><div class="metric-sparkline sage" aria-hidden="true"><i style="height:48%"></i><i style="height:34%"></i><i style="height:62%"></i><i style="height:52%"></i><i style="height:78%"></i><i style="height:65%"></i><i style="height:86%"></i><i style="height:72%"></i></div></article>
					<article class="metric-card"><div class="metric-top"><span>Ticket médio</span><span class="metric-icon">↗</span></div><strong>{stats.ticket}</strong><small><b class="positive">↗ 4,3%</b> em relação ao período anterior</small><div class="metric-sparkline clay" aria-hidden="true"><i style="height:35%"></i><i style="height:57%"></i><i style="height:47%"></i><i style="height:70%"></i><i style="height:59%"></i><i style="height:84%"></i><i style="height:73%"></i><i style="height:93%"></i></div></article>
					<article class="metric-card"><div class="metric-top"><span>Cupons utilizados</span><span class="metric-icon">％</span></div><strong>{stats.coupons}</strong><small><b class="neutral">{couponRate}%</b> dos pedidos no período</small><div class="metric-sparkline gold" aria-hidden="true"><i style="height:25%"></i><i style="height:48%"></i><i style="height:39%"></i><i style="height:62%"></i><i style="height:44%"></i><i style="height:79%"></i><i style="height:65%"></i><i style="height:84%"></i></div></article>
				</section>

				<div class="dashboard-grid">
					<section class="panel-card sales-card"><div class="panel-heading"><div><h2>Vendas ao longo do tempo</h2><p>Pagamentos confirmados · últimos {period.toLowerCase()}</p></div><div class="chart-legend"><i></i> Vendas</div></div>
						<div class="chart-wrap" role="img" aria-label={`Receita confirmada no período: ${stats.sales}`}><div class="chart-y-labels"><span>{stats.sales}</span><span>—</span><span>—</span><span>—</span><span>R$ 0</span></div><div class="chart"><div class="chart-grid"><i></i><i></i><i></i><i></i><i></i></div><div class="chart-bars">{#each stats.bars as bar, i}<div class="chart-bar-group"><div class="chart-bar" style={`height:${bar}%`} title={`${i + 1}: ${bar ? 'vendas registradas' : 'sem vendas registradas'}`}></div></div>{/each}</div></div></div><div class="chart-x-labels">{#each stats.labels as label}<span>{label}</span>{/each}</div>
					</section>
					<section class="panel-card status-card"><div class="panel-heading"><div><h2>Pedidos por status</h2><p>Distribuição dos pedidos</p></div><button class="more-button" aria-label="Mais opções">···</button></div>
						<div class="status-donut" style={`background:${statusGradient}`} role="img" aria-label={`${totalStatusOrders} pedidos distribuídos por status`}><div><strong>{totalStatusOrders}</strong><span>pedidos</span></div></div><div class="status-legend"><div><i class="dot delivered"></i><span>Entregues</span><b>{statusCounts.delivered}</b></div><div><i class="dot preparing"></i><span>Em preparo</span><b>{statusCounts.preparing}</b></div><div><i class="dot sent"></i><span>Enviados</span><b>{statusCounts.sent}</b></div><div><i class="dot waiting"></i><span>Aguardando</span><b>{statusCounts.waiting}</b></div><div><i class="dot other"></i><span>Outros</span><b>{statusCounts.other}</b></div></div>
					</section>
				</div>

				<div class="dashboard-grid lower-grid">
					<section class="panel-card table-card"><div class="panel-heading"><div><h2>Pedidos recentes</h2><p>Últimas movimentações da loja</p></div><button class="subtle-link" onclick={() => active = 'pedidos'}>Ver todos <span>→</span></button></div><div class="table-scroll"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{#each orders.slice(0, 3) as order}<tr><td class="order-code">{order.code}</td><td>{order.customer}</td><td class="muted-cell">{displayDate(order.date)}</td><td class="money-cell">{money(order.total)}</td><td><span class={`order-status ${order.tone}`}>{order.status}</span></td><td><button class="row-more" aria-label={`Editar pedido ${order.code}`} onclick={() => openOrder(order)}>↗</button></td></tr>{:else}<tr><td colspan="6" class="empty-results">Os pedidos registrados aparecerão aqui.</td></tr>{/each}</tbody></table></div></section>
					<section class="panel-card best-card"><div class="panel-heading"><div><h2>Mais vendidos</h2><p>Por unidades no período</p></div><button class="subtle-link" onclick={() => active = 'produtos'}>Ver catálogo <span>→</span></button></div><div class="best-list">{#each bestSellers as product, i}<div class="best-item"><span class="rank">0{i + 1}</span><img src={product.image} alt="" loading="lazy"/><span class="best-name"><strong>{product.name}</strong><small>{product.category} · {product.units} unidades</small></span><b>{product.value}</b></div>{:else}<p class="empty-results">Sem vendas confirmadas neste período.</p>{/each}</div></section>
				</div>

				<section class="panel-card stock-card"><div class="panel-heading"><div><h2>Estoque baixo</h2><p>Variantes com saldo disponível igual ou inferior a {LOW_STOCK_THRESHOLD} unidades</p></div><button class="subtle-link" onclick={() => active = 'estoque'}>Gerenciar estoque <span>→</span></button></div><div class="stock-list">{#each lowStock as product}<div class="stock-item"><img src={product.image} alt="" loading="lazy"/><span class="stock-name"><strong>{product.name}</strong><small>SKU {product.sku}</small></span><span class:critical={product.units <= 3} class="stock-level"><i></i>{product.units} disponíveis</span><button class="small-action" aria-label={`Registrar entrada de ${product.name}`} onclick={() => { active = 'estoque'; openStockEntry(product.sku); }}>+ Entrada</button></div>{:else}<p class="empty-results">Nenhuma variante abaixo do limite de atenção.</p>{/each}</div></section>
				<section class="panel-card insight-card"><div class="panel-heading"><div><h2>Pontos de atenção</h2><p>Leituras calculadas a partir dos dados cadastrados</p></div><span class="insight-tag">DADOS DO PROJETO</span></div><div class="insight-grid">{#if lowStock.length}<article><span class="insight-mark stock-mark">!</span><div><strong>Revisar reposição</strong><p>{lowStock.length} variantes têm {LOW_STOCK_THRESHOLD} unidades disponíveis ou menos. Confira compras e prazo de reposição.</p><button onclick={() => active = 'estoque'}>Abrir estoque <span>→</span></button></div></article>{/if}<article><span class="insight-mark order-mark">↻</span><div><strong>Pagamentos pendentes</strong><p>{orders.filter((order) => order.paymentStatus === 'pending').length} pedidos ainda aguardam confirmação do gateway. Só separe após a confirmação do Asaas.</p><button onclick={() => { active = 'pedidos'; statusFilter = 'Aguardando pagamento'; }}>Ver pedidos <span>→</span></button></div></article><article><span class="insight-mark coupon-mark">％</span><div><strong>Cupons e margem</strong><p>Existem {couponRows.length} cupons cadastrados. Compare descontos com a margem dos produtos antes de novas campanhas.</p><button onclick={() => active = 'cupons'}>Revisar cupons <span>→</span></button></div></article></div></section>
			{:else if active === 'estoque'}
				<div class="stock-metrics"><article class="panel-card"><span>Unidades disponíveis</span><strong>{movementsUnits}</strong></article><article class="panel-card"><span>Variantes no limite de atenção</span><strong class="stock-alert-number">{lowStock.length}</strong></article><article class="panel-card"><span>Variantes sem saldo</span><strong>{stock.filter((item) => item.units === 0).length}</strong></article></div>
				<section class="panel-card stock-management-card"><div class="panel-heading"><div><h2>Saldo por variante</h2><p>Saldo disponível = unidades físicas menos reservas ativas. Limite de atenção: {LOW_STOCK_THRESHOLD} unidades.</p></div></div><div class="table-scroll"><table><thead><tr><th>Produto</th><th>SKU / variante</th><th>Disponível</th><th>Reservado</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{#each stock as item}<tr><td><div class="product-cell"><img src={item.image} alt=""/><strong>{item.name}</strong></div></td><td class="muted-cell">{item.sku}</td><td class="money-cell">{item.units} un.</td><td>{item.reserved} un.</td><td><span class:low-stock={item.units <= LOW_STOCK_THRESHOLD} class="inventory-badge">{item.units <= LOW_STOCK_THRESHOLD ? 'Atenção' : 'Normal'}</span></td><td><button class="small-action" onclick={() => openStockEntry(item.sku)}>+ Entrada</button></td></tr>{:else}<tr><td colspan="6" class="empty-results">Nenhuma variante cadastrada.</td></tr>{/each}</tbody></table></div><div class="stock-automation-note"><span aria-hidden="true">↻</span><div><strong>Saída automática em vendas</strong><p>O sistema reserva o saldo quando o pedido é criado, confirma a baixa após o pagamento aprovado pelo Asaas e libera a reserva se o pagamento falhar ou expirar.</p></div></div></section>
				<section class="panel-card movements-card"><div class="panel-heading"><div><h2>Movimentações recentes</h2><p>Entradas e baixas vinculadas a pedidos</p></div></div><div class="table-scroll"><table><thead><tr><th>Data</th><th>Produto</th><th>Movimentação</th><th>Quantidade</th><th>Motivo / referência</th></tr></thead><tbody>{#each inventoryMovements as movement}<tr><td class="muted-cell">{movement.date}</td><td>{movement.item}<small class="movement-sku">{movement.sku}</small></td><td>{movement.type}</td><td class:movement-in={movement.quantity.startsWith('+')} class="money-cell">{movement.quantity}</td><td class="muted-cell">{movement.reason}</td></tr>{:else}<tr><td colspan="5" class="empty-results">As movimentações aparecerão após entradas ou vendas.</td></tr>{/each}</tbody></table></div></section>
			{:else if active === 'pedidos'}
				<section class="panel-card page-table-card"><div class="table-toolbar"><label class="table-search"><span aria-hidden="true">⌕</span><input bind:value={search} placeholder="Buscar pedido ou cliente" aria-label="Buscar pedido ou cliente" /></label><label class="filter-select">Status <select bind:value={statusFilter} aria-label="Filtrar pedidos por status"><option>Todos</option>{#each [...new Set(orders.map((order) => order.status))] as label}<option>{label}</option>{/each}</select></label></div><div class="table-scroll"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{#each filteredOrders as order}<tr><td class="order-code">{order.code}</td><td>{order.customer}</td><td class="muted-cell">{displayDate(order.date)}</td><td class="money-cell">{money(order.total)}</td><td><span class={`order-status ${order.tone}`}>{order.status}</span></td><td><button class="row-more" aria-label={`Editar pedido ${order.code}`} onclick={() => openOrder(order)}>Ver / editar</button></td></tr>{:else}<tr><td colspan="6" class="empty-results">Nenhum pedido corresponde à busca.</td></tr>{/each}</tbody></table></div><div class="table-footer">Exibindo {filteredOrders.length} de {orders.length} pedidos</div></section>
			{:else if active === 'produtos'}
				<section class="panel-card page-table-card"><div class="table-toolbar"><label class="table-search"><span aria-hidden="true">⌕</span><input bind:value={productSearch} placeholder="Buscar produto, SKU ou categoria" aria-label="Buscar produto, SKU ou categoria" /></label><span class="muted-cell">{filteredProducts.length} variantes</span></div><div class="table-scroll"><table><thead><tr><th>Produto</th><th>Categoria</th><th>SKU</th><th>Preço</th><th>Disponível</th><th>Status</th><th>Ação</th></tr></thead><tbody>{#each filteredProducts as product}<tr><td><div class="product-cell"><img src={product.image} alt=""/><strong>{product.name}</strong></div></td><td>{product.category}</td><td class="muted-cell">{product.sku}</td><td class="money-cell">{product.value}</td><td><span class:low={product.units <= LOW_STOCK_THRESHOLD} class="quantity-cell">{product.units} un.</span></td><td><span class={`order-status ${product.active ? 'delivered' : 'waiting'}`}>{product.active ? 'Ativo' : 'Inativo'}</span></td><td><button class="row-more" onclick={() => void openEditProduct(product)}>Editar</button></td></tr>{:else}<tr><td colspan="7" class="empty-results">Nenhum produto corresponde à busca.</td></tr>{/each}</tbody></table></div></section>
			{:else if active === 'cupons'}
				<div class="simple-cards">{#each couponRows as coupon}<article class="panel-card coupon-card"><span class="coupon-icon">％</span><div><strong>{coupon.code}</strong><p>{coupon.discount} · mínimo de {money(coupon.minimum)}</p><small>{coupon.validity} · {coupon.usageLimit === null ? 'Usos ilimitados' : `${coupon.usageCount}/${coupon.usageLimit} usos`}</small></div><span class={`order-status ${coupon.active ? 'delivered' : 'waiting'}`}>{coupon.active ? 'Ativo' : 'Inativo'}</span><button class="row-more" onclick={() => openNewCoupon(coupon)}>Editar</button></article>{:else}<div class="panel-card empty-results">Nenhum cupom cadastrado no Supabase.</div>{/each}</div>
			{:else if active === 'conteudo'}
				<div class="simple-cards">{#each contentRows as entry}<article class="panel-card content-row"><span class="content-type">{entry.type}</span><div><strong>{entry.title}</strong><p>Atualizado em {entry.updated}</p></div><span class={`order-status ${entry.published ? 'delivered' : 'waiting'}`}>{entry.published ? 'Publicado' : 'Rascunho'}</span></article>{:else}<div class="panel-card empty-results">Nenhum conteúdo cadastrado no Supabase.</div>{/each}</div>
			{:else}
				<section class="panel-card audit-card">{#each auditRows as entry}<div class="audit-row"><span class="audit-symbol order-symbol">↻</span><div><strong>{entry.action} · {entry.entity}</strong><p>{entry.details}</p><small>{entry.actor} · {entry.date}</small></div></div>{:else}<p class="empty-results">O histórico administrativo aparecerá aqui após as primeiras alterações registradas.</p>{/each}</section>
			{/if}
			<footer class="admin-footer"><span>© 2026 Ponto de Torra · Painel de portfólio</span><span>Desenvolvido por <strong>LMX Soluções Digitais/Segundo Almeida</strong></span></footer>
		</div>
	</div>
</div>
{/if}

{#if selectedOrder}
	<div class="order-modal-backdrop">
		<dialog bind:this={orderDialog} class="order-modal" aria-labelledby="order-modal-title" onclose={() => selectedOrder = null}>
			<header class="order-modal-header"><div><p class="admin-eyebrow">PEDIDO · DADOS DO SUPABASE</p><h2 id="order-modal-title">{selectedOrder.code}</h2><p>{selectedOrder.customer} · {money(selectedOrder.total)}</p></div><button class="modal-close" aria-label="Fechar detalhes do pedido" onclick={() => selectedOrder = null}>×</button></header>
			<div class="order-customer-details"><span><strong>Nome</strong>{selectedOrder.customer}</span><span><strong>E-mail</strong>{selectedOrder.email || 'Não informado'}</span><span><strong>WhatsApp</strong>{#if selectedOrder.phone}<a href={`https://wa.me/${selectedOrder.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{selectedOrder.phone} ↗</a>{:else}Não informado{/if}</span><span><strong>Endereço completo</strong>{selectedOrder.address}</span><span><strong>Pagamento</strong>{selectedOrder.paymentStatus === 'approved' ? 'Confirmado pelo Asaas' : statusLabel(selectedOrder.paymentStatus)}</span></div>
			<section class="order-items" aria-labelledby="order-items-title">
				<div class="order-items-heading"><h3 id="order-items-title">Itens para separar</h3><span>{selectedOrder.items.length} {selectedOrder.items.length === 1 ? 'item' : 'itens'}</span></div>
				{#each selectedOrder.items as item}
					<article class="order-item-row">
						<div class="order-item-description"><strong>{item.name}</strong><p>{item.variant || 'Variante não informada'}{#if item.sku}<span> · SKU {item.sku}</span>{/if}</p></div>
						<div class="order-item-quantity"><span>Quantidade</span><strong>{item.quantity} × {money(item.unitPrice)}</strong></div>
						<strong class="order-item-total">{money(item.lineTotal)}</strong>
					</article>
				{:else}
					<p class="order-items-empty">Os itens deste pedido não foram encontrados no banco.</p>
				{/each}
			</section>
			<form onsubmit={(event) => { event.preventDefault(); saveOrder(); }}>
				<label>Status do pedido<select bind:value={orderStatus} disabled={selectedOrder.paymentStatus !== 'approved'}>{#if ['paid', 'processing'].includes(selectedOrder.statusValue)}<option value="processing">Em preparação</option><option value="shipped">Enviado</option>{:else if selectedOrder.statusValue === 'shipped'}<option value="shipped">Enviado</option><option value="delivered">Entregue</option>{:else}<option value={selectedOrder.statusValue}>{selectedOrder.status}</option>{/if}</select></label>
				{#if orderStatus === 'shipped'}<div class="tracking-fields"><label>Transportadora<input bind:value={orderCarrier} maxlength="80" placeholder="Ex.: Correios" required /></label><label>Código de rastreio<input bind:value={orderTracking} minlength="3" maxlength="40" pattern="^[A-Za-z0-9-]+$" placeholder="Informe o código" required /></label></div><div class="tracking-hint">O código será salvo no envio deste pedido. A compra de etiqueta e postagem continuam sendo feitas no Melhor Envio.</div>{:else if orderStatus === 'delivered'}<div class="tracking-hint delivered-hint">Marcar como entregue conclui o acompanhamento do pedido e atualiza o envio.</div>{:else if selectedOrder.paymentStatus !== 'approved'}<div class="tracking-hint">O status de pagamento é atualizado pelo webhook autenticado do Asaas. Não é possível liberar o pedido manualmente antes da confirmação.</div>{/if}
				{#if actionError}<div class="login-message error" role="alert">{actionError}</div>{/if}
				<div class="modal-actions"><button type="button" class="admin-button secondary" onclick={() => selectedOrder = null}>Fechar</button><button type="submit" class="admin-button" disabled={savingAction || selectedOrder.paymentStatus !== 'approved'}>{savingAction ? 'Salvando…' : 'Salvar alteração'}</button></div>
			</form>
			<p class="modal-footnote">As mudanças de envio são registradas no Supabase e só avançam após pagamento aprovado.</p>
		</dialog>
	</div>
{/if}

{#if showStockForm}
	<div class="order-modal-backdrop">
		<dialog bind:this={stockDialog} class="order-modal" aria-labelledby="stock-modal-title" onclose={() => showStockForm = false}>
			<header class="order-modal-header"><div><p class="admin-eyebrow">ESTOQUE · ENTRADA MANUAL</p><h2 id="stock-modal-title">Registrar recebimento</h2><p>Informe o produto e a quantidade recebida.</p></div><button class="modal-close" aria-label="Fechar entrada de estoque" onclick={() => showStockForm = false}>×</button></header>
			<form onsubmit={(event) => { event.preventDefault(); saveStockEntry(); }}>
				<label>Produto / SKU<select bind:value={stockProductSku}>{#each stock as item}<option value={item.sku}>{item.name} · {item.sku}</option>{/each}</select></label>
				<label>Quantidade recebida<input type="number" min="1" step="1" bind:value={stockQuantity} required /></label>
				<label>Motivo<select bind:value={stockReason}><option>Compra recebida</option><option>Devolução conferida</option><option>Ajuste de inventário</option></select></label>
				{#if actionError}<div class="login-message error" role="alert">{actionError}</div>{/if}
				<div class="modal-actions"><button type="button" class="admin-button secondary" onclick={() => showStockForm = false}>Cancelar</button><button type="submit" class="admin-button" disabled={savingAction}>{savingAction ? 'Salvando…' : 'Registrar entrada'}</button></div>
			</form>
			<p class="modal-footnote">A entrada atualiza o saldo e cria um registro auditável no Supabase.</p>
		</dialog>
	</div>
{/if}

{#if showProductForm}
	<div class="order-modal-backdrop">
		<dialog bind:this={productDialog} class="order-modal product-modal" aria-labelledby="product-modal-title" onclose={() => showProductForm = false}>
			<header class="order-modal-header"><div><p class="admin-eyebrow">CATÁLOGO · PRODUTO E VARIANTES</p><h2 id="product-modal-title">{productId ? 'Editar produto' : 'Adicionar produto'}</h2><p>Preço, dimensões e saldo de cada variante.</p></div><button class="modal-close" aria-label="Fechar produto" onclick={() => showProductForm = false}>×</button></header>
			<form onsubmit={(event) => { event.preventDefault(); void saveProduct(); }}>
				<div class="product-form-grid"><label>Nome<input bind:value={productName} maxlength="120" required /></label><label>URL amigável<input bind:value={productSlug} maxlength="140" placeholder="cafe-especial" required /></label>
					<label>Categoria<select bind:value={productCategory}><option value="">Sem categoria</option>{#each categories as category}<option value={category.id}>{category.name}</option>{/each}</select></label><label>Imagem principal<input type="file" accept="image/jpeg,image/png,image/webp" onchange={(event) => { const file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null; if (file && file.size > 4000000) { actionError = 'A imagem precisa ter até 4 MB.'; return; } productPhoto = file; productPhotoName = file?.name ?? productPhotoName; actionError = ''; }} /><small>{productPhotoName || 'Envie uma foto JPG, PNG ou WebP (até 4 MB).'}</small></label></div>
				<label>Descrição<textarea bind:value={productDescription} rows="3" maxlength="5000"></textarea></label>
				<div class="variant-editor"><div class="panel-heading"><div><h2>Variantes</h2><p>Cadastre tamanhos, moagem ou outras opções como SKUs separados.</p></div><button type="button" class="admin-button secondary" onclick={() => productVariants = [...productVariants, newVariant()]}>+ Variante</button></div>
					{#each productVariants as variant, index}<fieldset class="variant-form-row"><legend>Variante {index + 1}</legend><div class="product-form-grid"><label>SKU<input bind:value={variant.sku} maxlength="80" required /></label><label>Nome / opção<input bind:value={variant.label} maxlength="120" placeholder="250 g · Em grãos" required /></label><label>Preço (R$)<input type="number" bind:value={variant.price} min="0.01" step="0.01" required /></label><label>Peso (g)<input type="number" bind:value={variant.weight} min="1" step="1" required /></label><label>Dimensões (cm)<span class="dimension-inputs"><input aria-label="Comprimento em cm" type="number" bind:value={variant.length} min="1" required /><input aria-label="Largura em cm" type="number" bind:value={variant.width} min="1" required /><input aria-label="Altura em cm" type="number" bind:value={variant.height} min="1" required /></span></label></div><p class="tracking-hint">{variant.id ? `Saldo atual: ${stock.find((item) => item.variantId === variant.id)?.onHand ?? variant.stock} un.` : 'A variante será criada com saldo zero.'} O saldo é alterado na aba Estoque.</p>{#if productVariants.length > 1}<button type="button" class="remove-variant" onclick={() => productVariants = productVariants.filter((_, i) => i !== index)}>Remover variante</button>{/if}</fieldset>{/each}
				</div>
				<label class="checkbox-line"><input type="checkbox" bind:checked={productIsActive} /> Produto ativo e publicado</label>
				{#if actionError}<div class="login-message error" role="alert">{actionError}</div>{/if}
				<div class="modal-actions"><button type="button" class="admin-button secondary" onclick={() => showProductForm = false}>Cancelar</button><button type="submit" class="admin-button" disabled={savingAction}>{savingAction ? 'Salvando…' : 'Salvar produto'}</button></div>
			</form>
			<p class="modal-footnote">Imagens são armazenadas no Supabase Storage. O estoque inicial é aplicado somente às variantes novas.</p>
		</dialog>
	</div>
{/if}

{#if showCouponForm}
	<div class="order-modal-backdrop">
		<dialog bind:this={couponDialog} class="order-modal" aria-labelledby="coupon-modal-title" onclose={() => showCouponForm = false}>
			<header class="order-modal-header"><div><p class="admin-eyebrow">CAMPANHA · DESCONTO NO CHECKOUT</p><h2 id="coupon-modal-title">{editingCouponId ? 'Editar cupom' : 'Criar cupom'}</h2><p>O desconto será validado novamente antes do pagamento.</p></div><button class="modal-close" aria-label="Fechar cupom" onclick={() => showCouponForm = false}>×</button></header>
			<form onsubmit={(event) => { event.preventDefault(); void saveCoupon(); }}>
				<label>Código do cupom<input bind:value={couponCode} maxlength="40" placeholder="TORRA10" required /></label>
				<div class="product-form-grid"><label>Tipo de desconto<select bind:value={couponType}><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select></label><label>{couponType === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}<input type="number" bind:value={couponValue} min="1" max={couponType === 'percent' ? 90 : undefined} step={couponType === 'percent' ? 1 : 0.01} required /></label><label>Subtotal mínimo (R$)<input type="number" bind:value={couponMinimum} min="0" step="0.01" /></label><label>Limite de usos <small>deixe vazio para ilimitado</small><input type="number" bind:value={couponUsageLimit} min="1" step="1" /></label><label>Início<input type="datetime-local" bind:value={couponStartsAt} /></label><label>Encerramento<input type="datetime-local" bind:value={couponEndsAt} /></label></div>
				<label class="checkbox-line"><input type="checkbox" bind:checked={couponActive} /> Cupom ativo</label>
				{#if actionError}<div class="login-message error" role="alert">{actionError}</div>{/if}
				<div class="modal-actions"><button type="button" class="admin-button secondary" onclick={() => showCouponForm = false}>Cancelar</button><button type="submit" class="admin-button" disabled={savingAction}>{savingAction ? 'Salvando…' : 'Salvar cupom'}</button></div>
			</form>
			<p class="modal-footnote">Validade, subtotal mínimo e limite de usos são verificados no servidor durante o pedido.</p>
		</dialog>
	</div>
{/if}

<style>
	.login-shell { --login-ink:#352720; min-height:100vh; display:grid; place-items:center; padding:24px; color:var(--login-ink); background:radial-gradient(ellipse at 50% 0,#eee6db,transparent 48%),#f7f5f1; font:14px/1.5 "Segoe UI",system-ui,sans-serif; }
	.login-card { width:min(100%,430px); padding:36px; border:1px solid #e9e2d9; border-radius:18px; background:#fffdfa; box-shadow:0 18px 60px rgba(54,39,30,.08); }
	.login-card > img { display:block; width:min(220px,70%); height:auto; margin:24px auto 26px; }
	.login-card > p:first-of-type { margin:0; color:#9a7a5e; font-size:9px; font-weight:700; letter-spacing:.16em; text-align:center; }
	.login-card h1 { margin:8px 0 5px; color:#352720; font:500 30px/1.15 Georgia,serif; text-align:center; }
	.login-subtitle,.login-card > span { display:block; margin:0 0 21px; color:#857a70; font-size:12px; text-align:center; }
	.login-back { color:#755c49; font-size:11px; }
	.login-form { display:grid; gap:14px; margin-top:20px; }
	.login-form label { display:grid; gap:6px; color:#65574b; font-size:11px; font-weight:600; }
	.login-form input { min-height:43px; padding:0 12px; border:1px solid #e4dbd1; border-radius:8px; color:#42362d; background:#fff; font:inherit; }
	.login-form input:focus { outline:2px solid #cbb79f; outline-offset:1px; }
	.login-message { margin:10px 0; padding:10px 12px; border-radius:8px; font-size:11px; }
	.login-message.error { border:1px solid #ecd5cb; color:#8a4f3d; background:#fbf1ed; }
	.login-card .login-message { margin:19px 0 0; }
	.admin-button:disabled { opacity:.55; cursor:not-allowed; }
	.order-customer-details { display:grid; gap:9px; margin:15px 0 0; padding:13px; border:1px solid #f0ebe5; border-radius:9px; color:#76695e; background:#fbf9f6; font-size:10px; }
	.order-customer-details span { display:grid; gap:3px; overflow-wrap:anywhere; }
	.order-customer-details strong { color:#4b3d33; font-size:9px; }
	.admin-shell { --admin-ink:#352720; --admin-coffee:#654638; --admin-paper:#f7f5f1; --admin-muted:#8c8177; --admin-line:#ece7e1; --admin-surface:#fff; min-height:100vh; display:grid; grid-template-columns:250px minmax(0,1fr); color:var(--admin-ink); background:var(--admin-paper); font:14px/1.45 "Segoe UI",system-ui,sans-serif; }
	.admin-shell :global(button), .admin-shell :global(select), .admin-shell :global(input) { font:inherit; }
	.admin-sidebar { position:sticky; top:0; height:100vh; display:flex; flex-direction:column; padding:27px 17px 17px; color:#f8f1e9; background:#3a2b24; }
	.admin-brand { display:flex; flex-direction:column; align-items:flex-start; gap:7px; padding:0 9px 31px; }
	.admin-brand img { width:164px; height:auto; }
	.admin-brand span,.admin-side-label { color:#bbab9d; font-size:9px; font-weight:700; letter-spacing:.15em; }
	.admin-side-label { padding:0 11px 11px; }
	.admin-nav { display:grid; gap:4px; }
	.admin-nav-link { min-height:44px; display:flex; align-items:center; gap:12px; padding:0 11px; border:0; border-radius:10px; color:#d1c5ba; background:transparent; text-align:left; cursor:pointer; }
	.admin-nav-link:hover { color:#fff; background:rgba(255,255,255,.07); }
	.admin-nav-link.active { color:#fffaf4; background:#5a4033; box-shadow:inset 3px 0 #d4b08d; }
	.nav-icon { width:20px; color:#d5b99f; font-size:17px; text-align:center; }
	.nav-count { min-width:21px; height:21px; display:grid; place-items:center; margin-left:auto; border-radius:50%; color:#402e25; background:#dec8b0; font-size:10px; font-weight:700; }
	.sidebar-bottom { margin-top:auto; }
	.admin-user { display:flex; align-items:center; gap:10px; padding:16px 6px; border-top:1px solid rgba(255,255,255,.12); }
	.avatar,.topbar-avatar { width:34px; height:34px; display:grid; place-items:center; flex:0 0 auto; border-radius:50%; color:#46342a; background:#e2cdb5; font-size:10px; font-weight:800; }
	.admin-user strong,.admin-user small { display:block; }
	.admin-user strong { font-size:11px; }
	.admin-user small { margin-top:2px; color:#c2b4a8; font-size:10px; }
	.user-menu { margin-left:auto; padding:3px 6px; border:0; color:#cbbcad; background:transparent; font-size:17px; cursor:pointer; }
	.back-store { display:flex; gap:10px; padding:13px 8px 5px; border-top:1px solid rgba(255,255,255,.12); color:#d6c9be; font-size:11px; }
	.back-store:hover { color:#fff; }
	.admin-main { min-width:0; }
	.admin-topbar { height:70px; display:flex; align-items:center; justify-content:space-between; gap:20px; padding:0 36px; border-bottom:1px solid var(--admin-line); background:rgba(255,255,255,.8); }
	.admin-breadcrumb { display:flex; align-items:center; gap:11px; color:var(--admin-ink); font-size:12px; font-weight:600; }
	.admin-breadcrumb span { color:var(--admin-muted); font-weight:400; }
	.admin-breadcrumb b { color:#c9bfb5; font-weight:400; }
	.topbar-actions { display:flex; align-items:center; gap:20px; }
	.status-indicator { display:flex; align-items:center; gap:7px; color:#756d63; font-size:10px; }
	.status-indicator i,.stock-level i { width:7px; height:7px; border-radius:50%; background:#a6ac83; }
	.icon-button { position:relative; width:32px; height:32px; border:0; color:#796f64; background:transparent; font-size:20px; cursor:pointer; }
	.notification-dot { position:absolute; top:5px; right:6px; width:5px; height:5px; border-radius:50%; background:#b27758; }
	.topbar-avatar { width:31px; height:31px; }
	.menu-toggle { display:none; }
	.admin-content { max-width:1550px; margin:auto; padding:25px 36px 18px; }
	.portfolio-banner { min-height:39px; display:flex; align-items:center; gap:9px; padding:8px 13px; border:1px solid #eadfce; border-radius:9px; color:#6e5946; background:#f2ebdf; font-size:10px; }
	.portfolio-banner strong { color:#584433; }
	.banner-icon { width:17px; height:17px; display:grid; place-items:center; border:1px solid #a88969; border-radius:50%; font:700 10px Georgia,serif; }
	.page-heading { display:flex; align-items:end; justify-content:space-between; gap:24px; margin:27px 0 19px; }
	.admin-eyebrow { margin:0 0 5px; color:#9a7a5e; font-size:9px; font-weight:700; letter-spacing:.14em; }
	.page-heading h1 { margin:0; color:#352720; font:500 clamp(27px,3vw,34px)/1.15 Georgia,serif; letter-spacing:-.035em; }
	.page-description { margin:6px 0 0; color:#8c8177; font-size:11px; }
	.period-select,.filter-select { display:flex; align-items:center; gap:10px; color:#857a70; font-size:10px; }
	.period-select select,.filter-select select { min-height:36px; padding:0 31px 0 11px; border:1px solid #e6dfd7; border-radius:8px; color:#554a41; background:#fff; font-size:11px; }
	.admin-button { min-height:37px; padding:0 14px; border:1px solid #654638; border-radius:8px; color:#fffaf5; background:#654638; font-size:10px; font-weight:700; cursor:pointer; }
	.admin-button:hover { background:#4d352a; }
	.admin-button.secondary { border-color:#e2d9d0; color:#55463b; background:#fff; }
	.freight-connect { min-height:32px; padding-inline:10px; white-space:nowrap; }
	.admin-button span { margin-right:6px; }
	.metrics-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
	.metric-card,.panel-card { min-width:0; border:1px solid var(--admin-line); border-radius:12px; background:var(--admin-surface); box-shadow:0 3px 13px rgba(54,39,30,.025); }
	.metric-card { position:relative; min-height:136px; overflow:hidden; padding:16px 17px; }
	.metric-top { display:flex; align-items:center; justify-content:space-between; color:#857b71; font-size:10px; }
	.metric-icon { width:27px; height:27px; display:grid; place-items:center; border-radius:8px; color:#79685a; background:#f3eee7; font-size:13px; }
	.coffee-icon { color:#76523c; background:#f0e6db; font-size:9px; font-weight:800; }
	.metric-card > strong { display:block; margin-top:9px; color:#362820; font:600 24px/1.2 Georgia,serif; letter-spacing:-.03em; }
	.metric-card > small { display:block; position:relative; z-index:1; margin-top:6px; color:#9a9188; font-size:9px; }
	.positive { color:#728365; font-weight:700; }
	.neutral { color:#8c745d; font-weight:700; }
	.metric-sparkline { position:absolute; right:14px; bottom:0; width:85px; height:40px; display:flex; align-items:end; gap:5px; opacity:.44; }
	.metric-sparkline i { flex:1; border-radius:3px 3px 0 0; background:#a67f60; }
	.metric-sparkline.sage i { background:#899780; }.metric-sparkline.clay i { background:#b77c5e; }.metric-sparkline.gold i { background:#c3a271; }
	.dashboard-grid { display:grid; grid-template-columns:minmax(0,1.65fr) minmax(270px,.9fr); gap:14px; margin-top:14px; }
	.panel-card { padding:17px; }
	.panel-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
	.panel-heading h2 { margin:0; color:#44352c; font-size:12px; font-weight:700; }
	.panel-heading p { margin:4px 0 0; color:#9a9086; font-size:9px; }
	.chart-legend { display:flex; align-items:center; gap:6px; color:#81766a; font-size:9px; }
	.chart-legend i { width:8px; height:8px; border-radius:50%; background:#87634b; }
	.chart-wrap { height:171px; display:grid; grid-template-columns:49px 1fr; gap:10px; margin-top:22px; }
	.chart-y-labels { display:flex; flex-direction:column; justify-content:space-between; padding-bottom:1px; color:#a1988e; font-size:8px; text-align:right; }
	.chart { position:relative; min-width:0; }
	.chart-grid { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:space-between; }
	.chart-grid i { border-top:1px dashed #eee9e3; }
	.chart-bars { position:absolute; inset:0; display:flex; align-items:end; justify-content:space-between; gap:clamp(3px,1vw,9px); padding:0 5px; }
	.chart-bar-group { height:100%; flex:1; display:flex; align-items:end; }
	.chart-bar { width:100%; min-height:5px; border-radius:4px 4px 0 0; background:linear-gradient(180deg,#ad8a6c,#795840); opacity:.88; transition:height .25s ease; }
	.chart-bar:nth-child(2n) { opacity:.72; }
	.chart-x-labels { display:flex; justify-content:space-between; margin:8px 0 0 59px; color:#a1988e; font-size:8px; }
	.status-card { min-height:256px; }
	.more-button,.row-more { border:0; color:#82796f; background:transparent; font-size:19px; cursor:pointer; }
	.status-donut { position:relative; width:112px; height:112px; display:grid; place-items:center; margin:15px auto 12px; border-radius:50%; background:conic-gradient(#839078 0 37%,#b98965 37% 65%,#d0aa7c 65% 86%,#ddd3c6 86% 100%); }
	.status-donut::before { content:''; position:absolute; width:80px; height:80px; border-radius:50%; background:white; }
	.status-donut > div { position:relative; display:flex; flex-direction:column; align-items:center; }
	.status-donut strong { font:600 21px/1.1 Georgia,serif; }
	.status-donut span { color:#948a80; font-size:8px; }
	.status-legend { display:grid; grid-template-columns:1fr 1fr; gap:9px 12px; }
	.status-legend div { display:flex; align-items:center; gap:6px; color:#847b71; font-size:9px; }
	.status-legend b { margin-left:auto; color:#51453c; font-size:9px; }
	.dot { width:7px; height:7px; border-radius:50%; flex:0 0 auto; }.delivered.dot { background:#839078; }.preparing.dot { background:#b98965; }.sent.dot { background:#d0aa7c; }.waiting.dot { background:#ddd3c6; }.other.dot { background:#a79aa0; }
	.lower-grid { grid-template-columns:minmax(0,1.45fr) minmax(300px,1fr); }
	.table-card,.best-card { padding:17px 0 0; overflow:hidden; }
	.table-card .panel-heading,.best-card .panel-heading { padding:0 17px 13px; }
	.subtle-link { padding:2px 0; border:0; color:#795f4b; background:transparent; font-size:9px; cursor:pointer; white-space:nowrap; }
	.subtle-link span { margin-left:4px; font-size:12px; }
	.table-scroll { width:100%; overflow-x:auto; }
	table { width:100%; border-collapse:collapse; text-align:left; white-space:nowrap; }
	thead { color:#9b9187; background:#faf9f7; }
	th { height:32px; padding:0 12px; font-size:8px; font-weight:600; }
	td { height:42px; padding:0 12px; border-top:1px solid #f1ede8; color:#594d44; font-size:9px; }
	th:first-child,td:first-child { padding-left:17px; }
	.order-code { color:#6b4c3a; font-weight:700; }
	.muted-cell { color:#9a9188; }
	.money-cell { color:#44362e; font-weight:700; }
	.order-status { display:inline-flex; align-items:center; padding:5px 8px; border-radius:20px; font-size:8px; font-weight:600; }
	.order-status.waiting { color:#8a7158; background:#f4eee5; }.order-status.preparing { color:#7b6547; background:#f4eedc; }.order-status.sent { color:#657856; background:#edf1e8; }.order-status.delivered { color:#617355; background:#eef2ea; }
	.best-list { padding:0 16px 4px; }
	.best-item { min-width:0; display:flex; align-items:center; gap:9px; padding:9px 0; border-top:1px solid #f1ede8; }
	.rank { color:#b2a59a; font:500 12px Georgia,serif; }
	.best-item img { width:36px; height:36px; flex:0 0 auto; border-radius:8px; object-fit:cover; background:#eee8e0; }
	.best-name { min-width:0; flex:1; }
	.best-name strong,.best-name small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
	.best-name strong { color:#55473d; font-size:9px; font-weight:600; }
	.best-name small { margin-top:3px; color:#9d9389; font-size:8px; }
	.best-item > b { color:#51443a; font-size:8px; white-space:nowrap; }
	.stock-card { margin-top:14px; padding:17px; }
	.stock-list { margin-top:10px; }
	.stock-item { display:flex; align-items:center; gap:11px; min-height:54px; border-top:1px solid #f1ede8; }
	.stock-item img { width:36px; height:36px; flex:0 0 auto; border-radius:8px; object-fit:cover; }
	.stock-name { min-width:0; flex:1; }
	.stock-name strong,.stock-name small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
	.stock-name strong { font-size:9px; font-weight:600; }.stock-name small { margin-top:3px; color:#9c9287; font-size:8px; }
	.stock-level { display:flex; align-items:center; gap:6px; color:#778064; font-size:9px; white-space:nowrap; }.stock-level i { width:6px;height:6px;background:#98a27d; }.stock-level.critical { color:#a36b4c; }.stock-level.critical i { background:#bd8060; }
	.small-action { min-height:27px; padding:0 8px; border:1px solid #e8e1d9; border-radius:6px; color:#735943; background:#fff; font-size:8px; cursor:pointer; }
	.admin-footer { display:flex; justify-content:space-between; gap:12px; padding:19px 1px 0; color:#9d9389; font-size:9px; }.admin-footer strong { color:#6d5948; font-weight:600; }
	.order-modal { position:relative; margin:0; }
	.stock-metrics { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px; }.stock-metrics article { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;color:#7e7368;font-size:10px; }.stock-metrics strong { color:#493a30;font:600 23px Georgia,serif; }.stock-metrics .stock-alert-number { color:#a36b4c; }.stock-management-card,.movements-card { margin-top:13px;padding:17px 0 0;overflow:hidden; }.stock-management-card > .panel-heading,.movements-card > .panel-heading { padding:0 17px 13px; }.stock-management-card th,.movements-card th { height:38px;padding-inline:15px; }.stock-management-card td,.movements-card td { height:55px;padding-inline:15px;font-size:9px; }.inventory-badge { display:inline-block;padding:5px 8px;border-radius:20px;color:#657451;background:#eef2e8;font-size:8px;font-weight:700; }.inventory-badge.low-stock { color:#97613e;background:#f6eee5; }.stock-automation-note { display:flex;gap:11px;margin:15px 16px 16px;padding:12px 13px;border:1px solid #e8e0d5;border-radius:9px;color:#715d49;background:#faf7f2; }.stock-automation-note > span { width:25px;height:25px;display:grid;place-items:center;flex:0 0 auto;border-radius:8px;color:#755b42;background:#f0e6da;font-size:15px; }.stock-automation-note strong { color:#554234;font-size:10px; }.stock-automation-note p { margin:4px 0 0;color:#85796c;font-size:9px;line-height:1.55; }.movement-sku { display:block;margin-top:3px;color:#a1968c;font-size:8px; }.movement-in { color:#677b55; }.movements-card { margin-top:13px; }
	.insight-card { margin-top:14px; }.insight-tag { padding:5px 8px;border-radius:20px;color:#8b755d;background:#f4eee5;font-size:8px;font-weight:700;letter-spacing:.06em; }.insight-grid { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px; }.insight-grid article { display:flex;gap:10px;padding:12px;border:1px solid #f0ebe5;border-radius:9px;background:#fdfcfa; }.insight-mark { width:26px;height:26px;display:grid;place-items:center;flex:0 0 auto;border-radius:8px;font-size:12px;font-weight:700; }.stock-mark { color:#9a6849;background:#f6ede5; }.order-mark { color:#7c705c;background:#f4f0e6; }.coupon-mark { color:#6e795e;background:#edf0e8; }.insight-grid strong { color:#4d3f34;font-size:10px; }.insight-grid p { min-height:43px;margin:5px 0 8px;color:#857b71;font-size:9px;line-height:1.55; }.insight-grid button { padding:0;border:0;color:#775b43;background:transparent;font-size:9px;font-weight:700;cursor:pointer; }.insight-grid button span { margin-left:3px; }
	.save-toast { margin-top:10px;padding:10px 13px;border:1px solid #dce5d4;border-radius:8px;color:#52664a;background:#eff4eb;font-size:10px; }
	.order-modal-backdrop { position:fixed;z-index:50;inset:0;display:grid;place-items:center;padding:20px;background:rgba(33,24,18,.48); }.order-modal { width:min(100%,520px);max-height:calc(100dvh - 40px);overflow-y:auto;padding:23px;border:1px solid #e9e1d8;border-radius:16px;background:#fffdfa;box-shadow:0 24px 70px rgba(34,23,16,.25); }.order-modal-header { display:flex;justify-content:space-between;gap:15px;padding-bottom:17px;border-bottom:1px solid #eee7df; }.order-modal-header .admin-eyebrow { margin-bottom:7px; }.order-modal-header h2 { margin:0;color:#3e2e25;font:500 27px/1.1 Georgia,serif; }.order-modal-header p:last-child { margin:6px 0 0;color:#81766c;font-size:10px; }.modal-close { width:32px;height:32px;border:0;border-radius:50%;color:#715d4c;background:#f4eee7;font-size:22px;cursor:pointer; }.order-modal form { display:grid;gap:14px;padding-top:18px; }.order-modal form > label,.tracking-fields label { display:grid;gap:6px;color:#6f6257;font-size:10px;font-weight:600; }.order-modal input,.order-modal select { min-height:39px;padding:0 11px;border:1px solid #e4dbd1;border-radius:8px;color:#473a31;background:#fff;font-size:11px; }.tracking-fields { display:grid;grid-template-columns:.8fr 1.2fr;gap:10px; }.tracking-hint { padding:10px 12px;border-radius:8px;color:#74634f;background:#f5f0e8;font-size:9px;line-height:1.5; }.tracking-hint.delivered-hint { color:#5f7051;background:#eef2e9; }.modal-actions { display:flex;justify-content:flex-end;gap:9px;padding-top:5px; }.modal-footnote { margin:14px 0 0;color:#9a9087;font-size:9px;text-align:center; }
	.order-items { display:grid;gap:0;margin-top:13px;padding:13px;border:1px solid #eee7df;border-radius:10px;background:#fff; }.order-items-heading { display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:3px; }.order-items-heading h3 { margin:0;color:#493a30;font-size:11px;font-weight:700; }.order-items-heading > span { color:#92867b;font-size:9px; }.order-item-row { display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:11px 0;border-top:1px solid #f0ebe5; }.order-item-description { min-width:0; }.order-item-description > strong { display:block;color:#4d3c31;font-size:10px;line-height:1.4; }.order-item-description p { margin:4px 0 0;color:#85786c;font-size:9px;line-height:1.45;overflow-wrap:anywhere; }.order-item-quantity { display:grid;gap:3px;text-align:right;white-space:nowrap; }.order-item-quantity span { color:#9a9087;font-size:8px; }.order-item-quantity strong,.order-item-total { color:#554438;font-size:9px; }.order-items-empty { margin:8px 0 0;color:#8a5b46;font-size:9px; }
	.product-modal { width:min(100%,850px);max-height:calc(100dvh - 40px);overflow-y:auto; }
	.product-form-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px; }
	.product-form-grid label,.product-modal form > label { min-width:0;display:grid;gap:6px;color:#6f6257;font-size:10px;font-weight:600; }
	.product-modal textarea { width:100%;padding:10px 11px;border:1px solid #e4dbd1;border-radius:8px;color:#473a31;background:#fff;font-family:inherit;font-size:11px;line-height:1.5;resize:vertical; }
	.product-form-grid small { color:#91857a;font-size:9px;font-weight:400; }
	.variant-editor { display:grid;gap:10px;padding-top:6px; }
	.variant-form-row { min-width:0;margin:0;padding:12px;border:1px solid #eee7df;border-radius:10px; }
	.variant-form-row legend { padding:0 6px;color:#8a6a50;font-size:10px;font-weight:700; }
	.variant-form-row .product-form-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
	.dimension-inputs { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px; }
	.dimension-inputs input { min-width:0;width:100%;padding-inline:6px; }
	.remove-variant { justify-self:start;padding:3px 0;border:0;color:#9d584b;background:none;font-size:10px;cursor:pointer; }
	.checkbox-line { display:flex!important;align-items:center;gap:8px!important; }
	.checkbox-line input { width:16px;height:16px;min-height:0;accent-color:#806148; }
	.order-customer-details a { color:#725840;text-decoration:underline;overflow-wrap:anywhere; }
	@media(max-width:600px) { .order-modal-backdrop { padding:10px; }.order-modal { max-height:calc(100dvh - 20px);padding:16px; }.product-modal { max-height:calc(100dvh - 20px); }.product-form-grid,.variant-form-row .product-form-grid { grid-template-columns:1fr 1fr;gap:9px; }.variant-form-row { padding:9px; }.order-item-row { grid-template-columns:minmax(0,1fr) auto;gap:7px 10px; }.order-item-total { grid-column:2; }.modal-actions { flex-wrap:wrap; }.modal-actions button { flex:1; }.coupon-card > .row-more { margin-left:52px; } }
	.page-table-card { padding:0; overflow:hidden; }
	.table-toolbar { min-height:63px; display:flex; align-items:center; gap:12px; padding:12px 17px; border-bottom:1px solid var(--admin-line); }
	.table-search { width:min(320px,100%); min-height:35px; display:flex; align-items:center; gap:8px; padding:0 10px; border:1px solid #e8e1d9; border-radius:8px; color:#958b80; background:#fff; }
	.table-search input { width:100%; min-width:0; border:0; outline:0; color:#51463e; background:transparent; font-size:10px; }.table-search input::placeholder { color:#aaa197; }
	.table-toolbar .filter-select { margin-left:auto; }
	.page-table-card th { height:41px; padding-inline:17px; }.page-table-card td { height:59px; padding-inline:17px; font-size:10px; }.page-table-card th:first-child,.page-table-card td:first-child { padding-left:20px; }
	.row-more { font-size:18px; }
	.table-footer { display:flex; align-items:center; gap:6px; min-height:50px; padding:0 17px; border-top:1px solid #f1ede8; color:#9b9187; font-size:9px; }
	.empty-results { padding:25px; color:#92877c; text-align:center; font-size:11px; }
	.product-cell { display:flex; align-items:center; gap:9px; }.product-cell img { width:33px;height:33px;object-fit:cover;border-radius:7px; }.product-cell strong { font-size:9px; }.quantity-cell { color:#758263; font-weight:600; }.quantity-cell.low { color:#a06a4c; }
	.simple-cards { display:grid; gap:12px; }.coupon-card,.content-row { display:flex; align-items:center; gap:16px; padding:18px; }.coupon-icon { width:42px;height:42px;display:grid;place-items:center;border-radius:11px;color:#765840;background:#f3eadf;font-size:20px; }.sage-coupon { color:#6e795e;background:#edf0e8; }.coupon-card > div,.content-row > div { min-width:0; flex:1; }.coupon-card strong,.content-row strong { color:#493a30;font:600 15px Georgia,serif; }.coupon-card p,.content-row p { margin:5px 0;color:#786d62;font-size:10px; }.coupon-card small { color:#a1968b;font-size:9px; }.content-type { min-width:64px;padding:8px 9px;border-radius:7px;color:#765c43;background:#f1e8dc;text-align:center;font-size:8px;font-weight:700;letter-spacing:.08em; }.content-type.recipe { color:#6c795f;background:#edf0e8; }.content-type.faq { color:#856d7a;background:#f3eaf0; }
	.audit-card { padding:0 19px; }.audit-row { display:flex; gap:14px; padding:18px 0; border-bottom:1px solid #f0ece7; }.audit-row:last-child { border:0; }.audit-symbol { width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border-radius:9px;color:#765840;background:#f3eadf;font-size:10px;font-weight:700; }.stock-symbol { color:#6e795e;background:#edf0e8; }.order-symbol { color:#8d775e;background:#f4efdf; }.content-symbol { color:#856d7a;background:#f3eaf0; }.audit-row strong { color:#4c3e34;font-size:11px; }.audit-row p { margin:4px 0;color:#70655b;font-size:10px; }.audit-row small { color:#a0968c;font-size:9px; }
	@media(max-width:1120px) { .admin-shell { grid-template-columns:220px minmax(0,1fr); }.admin-sidebar { padding-inline:13px; }.admin-content { padding-inline:23px; }.admin-topbar { padding-inline:23px; }.metrics-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }.dashboard-grid.lower-grid { grid-template-columns:1fr; }.insight-grid { grid-template-columns:1fr; } }
	@media(max-width:760px) { .admin-shell { display:block; }.admin-sidebar { position:fixed; z-index:20; left:0; top:0; width:250px; height:100dvh; box-shadow:15px 0 40px rgba(24,15,10,.18); transform:translateX(-105%); transition:transform .2s ease; }.admin-sidebar.mobile-open { transform:translateX(0); }.menu-toggle { width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:8px;color:#5e493a;background:#f3eee8;font-size:17px;cursor:pointer; }.admin-topbar { height:62px; gap:12px; padding-inline:16px; }.admin-breadcrumb { flex:1;gap:7px;font-size:10px; }.admin-breadcrumb span { display:none; }.topbar-actions { gap:10px; }.status-indicator { font-size:0; }.status-indicator i { width:8px;height:8px; }.icon-button { font-size:17px; }.admin-content { padding:17px 15px; }.portfolio-banner { align-items:flex-start; font-size:9px; }.page-heading { align-items:flex-start; flex-direction:column; gap:14px; margin:22px 0 16px; }.page-heading h1 { font-size:29px; }.page-heading > :last-child { align-self:flex-start; }.metrics-grid { gap:9px; }.metric-card { min-height:126px;padding:13px; }.metric-top { font-size:9px; }.metric-card > strong { font-size:21px; }.metric-card > small { max-width:150px; font-size:8px; }.dashboard-grid { grid-template-columns:1fr; gap:10px; margin-top:10px; }.panel-card { border-radius:10px; }.sales-card { padding:14px 12px; }.chart-wrap { grid-template-columns:44px 1fr;gap:7px;height:160px; }.chart-x-labels { margin-left:51px; }.status-card { padding:14px; }.lower-grid { margin-top:10px; }.table-card .panel-heading,.best-card .panel-heading { padding-inline:13px; }.stock-card { padding:14px; }.stock-item { gap:7px; }.stock-level { font-size:8px; }.small-action { font-size:7px; }.admin-footer { flex-direction:column;gap:5px;padding-top:15px;font-size:8px; }.table-toolbar { align-items:stretch;flex-wrap:wrap;padding:12px; }.table-search { flex:1;min-width:180px; }.table-toolbar .filter-select { margin:0; }.page-table-card th { padding-inline:12px; }.page-table-card td { padding-inline:12px; }.page-table-card th:first-child,.page-table-card td:first-child { padding-left:14px; }.table-footer { padding-inline:12px; }.simple-cards .coupon-card { align-items:flex-start;gap:10px;flex-wrap:wrap; }.coupon-card > .order-status { margin-left:52px; }.content-row { gap:10px;padding:13px; }.content-type { min-width:53px; }.content-row strong { font:600 13px Georgia,serif; }.audit-card { padding-inline:14px; }.tracking-fields { grid-template-columns:1fr; }.order-modal { max-height:calc(100dvh - 32px);overflow-y:auto;padding:19px; }.insight-grid article { padding:11px; } }
	@media(max-width:390px) { .metrics-grid { grid-template-columns:1fr 1fr; }.metric-card > strong { font-size:19px; }.metric-card > small { max-width:125px; }.topbar-actions { gap:6px; }.topbar-avatar { width:27px;height:27px; }.stock-name strong { max-width:150px; } }
	@media(prefers-reduced-motion:reduce) { .admin-sidebar,.chart-bar { transition:none; } }
</style>
