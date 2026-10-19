<script lang="ts">
	type View = 'visao' | 'produtos' | 'estoque' | 'pedidos' | 'cupons' | 'conteudo' | 'historico';
	type Order = { code: string; customer: string; date: string; total: number; status: string; tone: string; carrier?: string; trackingCode?: string };
	type InventoryItem = { name: string; sku: string; units: number; minimum: number; image: string };

	const menu: { id: View; label: string; icon: string }[] = [
		{ id: 'visao', label: 'Visão geral', icon: '◫' },
		{ id: 'produtos', label: 'Produtos', icon: '▧' },
		{ id: 'estoque', label: 'Estoque', icon: '▦' },
		{ id: 'pedidos', label: 'Pedidos', icon: '▤' },
		{ id: 'cupons', label: 'Cupons', icon: '％' },
		{ id: 'conteudo', label: 'Conteúdo', icon: '▤' },
		{ id: 'historico', label: 'Histórico', icon: '◷' }
	];
	let orders: Order[] = $state([
		{ code: '#PT-1048', customer: 'Marina Costa', date: 'Hoje, 10:42', total: 186.7, status: 'Aguardando pagamento', tone: 'waiting' },
		{ code: '#PT-1047', customer: 'Rafael Mendes', date: 'Hoje, 09:18', total: 98.9, status: 'Em preparação', tone: 'preparing' },
		{ code: '#PT-1046', customer: 'Ana Beatriz Lima', date: 'Ontem, 17:36', total: 249.8, status: 'Enviado', tone: 'sent', carrier: 'Correios', trackingCode: 'BR123456789PT' },
		{ code: '#PT-1045', customer: 'Pedro Henrique', date: 'Ontem, 15:09', total: 74.5, status: 'Entregue', tone: 'delivered' }
	]);
	let stock: InventoryItem[] = $state([
		{ name: 'Casa 01 — Chocolate e Castanhas', sku: 'CAF-250-001', units: 4, minimum: 8, image: '/images/products/p01.jpg' },
		{ name: 'Drip Coffee Casa 01', sku: 'DRP-001', units: 6, minimum: 10, image: '/images/products/p21.jpg' },
		{ name: 'Coador V60', sku: 'MET-V60-01', units: 3, minimum: 5, image: '/images/products/p29.jpg' }
	]);
	type InventoryMovement = { date: string; item: string; sku: string; type: string; quantity: string; reason: string };
	let inventoryMovements: InventoryMovement[] = $state([
		{ date: 'Hoje, 09:14', item: 'Drip Coffee Casa 01', sku: 'DRP-001', type: 'Saída automática', quantity: '−2', reason: 'Pedido #PT-1047 pago' },
		{ date: 'Ontem, 16:28', item: 'Casa 01 — Chocolate e Castanhas', sku: 'CAF-250-001', type: 'Entrada', quantity: '+12', reason: 'Compra recebida' },
		{ date: '18 out, 11:02', item: 'Coador V60', sku: 'MET-V60-01', type: 'Saída automática', quantity: '−1', reason: 'Pedido #PT-1041 pago' }
	]);
	const bestSellers = [
		{ name: 'Casa 01 — Chocolate e Castanhas', category: 'Cafés', units: 38, value: 'R$ 1.858,20', image: '/images/products/p01.jpg' },
		{ name: 'Kit Degustação Drip', category: 'Drip coffee', units: 26, value: 'R$ 1.817,40', image: '/images/products/p27.jpg' },
		{ name: 'Coador V60', category: 'Métodos', units: 19, value: 'R$ 1.708,10', image: '/images/products/p29.jpg' }
	];
	const views: Record<string, { title: string; intro: string }> = {
		visao: { title: 'Visão geral', intro: 'Acompanhe os principais números da loja.' },
		produtos: { title: 'Produtos', intro: 'Catálogo, categorias, variantes e estoque.' },
		estoque: { title: 'Estoque', intro: 'Acompanhe quantidades, entradas e saídas automáticas.' },
		pedidos: { title: 'Pedidos', intro: 'Consulte e acompanhe os pedidos recentes.' },
		cupons: { title: 'Cupons', intro: 'Cupons e regras de desconto da loja.' },
		conteudo: { title: 'Conteúdo', intro: 'Receitas, guias, páginas e perguntas frequentes.' },
		historico: { title: 'Histórico de alterações', intro: 'Registro de mudanças em estoque, preços e pedidos.' }
	};
	let active: View = $state('visao');
	let period = $state('30 dias');
	let search = $state('');
	let statusFilter = $state('Todos');
	let mobileMenuOpen = $state(false);
	let selectedOrder: Order | null = $state(null);
	let orderStatus = $state('');
	let orderCarrier = $state('');
	let orderTracking = $state('');
	let orderSaved = $state(false);
	let orderDialog: HTMLDialogElement | undefined = $state(undefined);
	let showStockForm = $state(false);
	let stockDialog: HTMLDialogElement | undefined = $state(undefined);
	let stockProductSku = $state('CAF-250-001');
	let stockQuantity = $state(1);
	let stockReason = $state('Compra recebida');
	let stockSaved = $state(false);
	let current = $derived(views[active]);
	let filteredOrders = $derived(orders.filter((order) => `${order.code} ${order.customer} ${order.status}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'Todos' || order.status === statusFilter)));
	const periodData: Record<string, { sales: string; orders: number; ticket: string; coupons: number; bars: number[]; labels: string[] }> = {
		'7 dias': { sales: 'R$ 3.240,80', orders: 22, ticket: 'R$ 147,31', coupons: 4, bars: [28, 48, 37, 65, 52, 78, 62], labels: ['13 out', '14 out', '15 out', '16 out', '17 out', '18 out', '19 out'] },
		'30 dias': { sales: 'R$ 12.480,50', orders: 86, ticket: 'R$ 145,12', coupons: 14, bars: [38, 52, 45, 66, 58, 78, 55, 72, 62, 88, 69, 96, 76, 82], labels: ['20 set', '27 set', '04 out', '11 out', '19 out'] },
		'90 dias': { sales: 'R$ 34.910,20', orders: 244, ticket: 'R$ 143,07', coupons: 39, bars: [34, 43, 39, 56, 47, 61, 55, 69, 62, 80, 72, 91], labels: ['21 jul', '06 ago', '22 ago', '07 set', '19 out'] }
	};
	let stats = $derived(periodData[period]);
	let couponRate = $derived(((stats.coupons / stats.orders) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
	$effect(() => {
		if (!orderDialog) return;
		if (selectedOrder && !orderDialog.open) orderDialog.showModal();
		if (!selectedOrder && orderDialog.open) orderDialog.close();
	});
	$effect(() => {
		if (!stockDialog) return;
		if (showStockForm && !stockDialog.open) stockDialog.showModal();
		if (!showStockForm && stockDialog.open) stockDialog.close();
	});
	const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	const statusTone: Record<string, string> = { 'Aguardando pagamento': 'waiting', 'Em preparação': 'preparing', Enviado: 'sent', Entregue: 'delivered', Cancelado: 'waiting' };
	function openOrder(order: Order) { selectedOrder = order; orderStatus = order.status; orderCarrier = order.carrier ?? ''; orderTracking = order.trackingCode ?? ''; }
	function saveOrder() {
		if (!selectedOrder) return;
		orders = orders.map((order) => order.code === selectedOrder?.code ? { ...order, status: orderStatus, tone: statusTone[orderStatus] ?? 'waiting', carrier: orderCarrier.trim(), trackingCode: orderTracking.trim() } : order);
		selectedOrder = null;
		orderSaved = true;
		setTimeout(() => orderSaved = false, 3200);
	}
	function openStockEntry(sku?: string) {
		stockProductSku = sku ?? stock[0]?.sku ?? '';
		stockQuantity = 1;
		stockReason = 'Compra recebida';
		showStockForm = true;
	}
	function saveStockEntry() {
		const qty = Math.floor(Number(stockQuantity));
		const item = stock.find((row) => row.sku === stockProductSku);
		if (!item || !Number.isFinite(qty) || qty < 1) return;
		stock = stock.map((row) => row.sku === item.sku ? { ...row, units: row.units + qty } : row);
		inventoryMovements = [{ date: 'Agora', item: item.name, sku: item.sku, type: 'Entrada', quantity: `+${qty}`, reason: stockReason }, ...inventoryMovements];
		showStockForm = false;
		stockSaved = true;
		setTimeout(() => stockSaved = false, 3200);
	}

	function exportCsv() {
		const csv = ['Pedido,Cliente,Data,Total,Status', ...orders.map((o) => [o.code, o.customer, o.date, o.total.toFixed(2).replace('.', ','), o.status].map((v) => `"${v}"`).join(','))].join('\n');
		const file = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(file);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'ponto-de-torra-pedidos.csv';
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>Painel administrativo — Ponto de Torra</title>
	<meta name="description" content="Painel de administração demonstrativo da loja Ponto de Torra." />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

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
					{#if item.id === 'pedidos'}<span class="nav-count">8</span>{/if}
				</button>
			{/each}
		</nav>
		<div class="sidebar-bottom">
			<div class="admin-user"><span class="avatar">SA</span><span><strong>Segundo Almeida</strong><small>Administrador</small></span><span class="user-menu" aria-hidden="true">···</span></div>
			<a class="back-store" href="/">← <span>Voltar para a loja</span></a>
		</div>
	</aside>
	<div class="admin-main">
		<header class="admin-topbar">
			<button class="menu-toggle" aria-label="Abrir navegação" aria-expanded={mobileMenuOpen} onclick={() => mobileMenuOpen = !mobileMenuOpen}>☰</button>
			<div class="admin-breadcrumb"><span>Ponto de Torra</span><b>/</b>{current.title}</div>
			<div class="topbar-actions"><span class="status-indicator"><i></i> Loja demonstrativa</span><button class="icon-button" aria-label="Notificações">♧<i class="notification-dot"></i></button><span class="topbar-avatar" aria-label="Segundo Almeida">SA</span></div>
		</header>
		<div class="admin-content">
			<div class="portfolio-banner"><span class="banner-icon" aria-hidden="true">i</span><span><strong>Interface de portfólio</strong> · dados ilustrativos, sem pedidos reais ou conexão com sistemas.</span></div>
			{#if orderSaved}<div class="save-toast" role="status">Pedido atualizado nesta demonstração. Nenhuma alteração foi enviada a um sistema.</div>{/if}
			{#if stockSaved}<div class="save-toast" role="status">Entrada de estoque registrada nesta demonstração; o saldo da amostra foi atualizado.</div>{/if}
			<div class="page-heading"><div><p class="admin-eyebrow">PAINEL ADMINISTRATIVO</p><h1>{current.title}</h1><p class="page-description">{current.intro}</p></div>
				{#if active === 'visao'}<label class="period-select">Período <select bind:value={period} aria-label="Filtrar período"><option>7 dias</option><option>30 dias</option><option>90 dias</option></select></label>{:else if active === 'pedidos'}<button class="admin-button secondary" onclick={exportCsv}><span aria-hidden="true">↓</span> Exportar CSV</button>{:else if active === 'estoque'}<button class="admin-button" onclick={() => openStockEntry()}>+ Registrar entrada</button>{:else}<button class="admin-button" onclick={() => window.alert('Ação visual de portfólio. A edição será conectada na etapa de backend.')}>+ Adicionar {active === 'produtos' ? 'produto' : active === 'cupons' ? 'cupom' : active === 'conteudo' ? 'conteúdo' : 'registro'}</button>{/if}
			</div>

			{#if active === 'visao'}
				<section class="metrics-grid" aria-label="Indicadores do período">
					<article class="metric-card"><div class="metric-top"><span>Vendas no período</span><span class="metric-icon coffee-icon">R$</span></div><strong>{stats.sales}</strong><small><b class="positive">↗ 12,8%</b> em relação ao período anterior</small><div class="metric-sparkline" aria-hidden="true"><i style="height:32%"></i><i style="height:46%"></i><i style="height:38%"></i><i style="height:59%"></i><i style="height:48%"></i><i style="height:76%"></i><i style="height:68%"></i><i style="height:92%"></i></div></article>
					<article class="metric-card"><div class="metric-top"><span>Pedidos</span><span class="metric-icon">▤</span></div><strong>{stats.orders}</strong><small><b class="positive">↗ 8,2%</b> em relação ao período anterior</small><div class="metric-sparkline sage" aria-hidden="true"><i style="height:48%"></i><i style="height:34%"></i><i style="height:62%"></i><i style="height:52%"></i><i style="height:78%"></i><i style="height:65%"></i><i style="height:86%"></i><i style="height:72%"></i></div></article>
					<article class="metric-card"><div class="metric-top"><span>Ticket médio</span><span class="metric-icon">↗</span></div><strong>{stats.ticket}</strong><small><b class="positive">↗ 4,3%</b> em relação ao período anterior</small><div class="metric-sparkline clay" aria-hidden="true"><i style="height:35%"></i><i style="height:57%"></i><i style="height:47%"></i><i style="height:70%"></i><i style="height:59%"></i><i style="height:84%"></i><i style="height:73%"></i><i style="height:93%"></i></div></article>
					<article class="metric-card"><div class="metric-top"><span>Cupons utilizados</span><span class="metric-icon">％</span></div><strong>{stats.coupons}</strong><small><b class="neutral">{couponRate}%</b> dos pedidos no período</small><div class="metric-sparkline gold" aria-hidden="true"><i style="height:25%"></i><i style="height:48%"></i><i style="height:39%"></i><i style="height:62%"></i><i style="height:44%"></i><i style="height:79%"></i><i style="height:65%"></i><i style="height:84%"></i></div></article>
				</section>

				<div class="dashboard-grid">
					<section class="panel-card sales-card"><div class="panel-heading"><div><h2>Vendas ao longo do tempo</h2><p>Receita bruta · últimos {period.toLowerCase()}</p></div><div class="chart-legend"><i></i> Vendas</div></div>
						<div class="chart-wrap" role="img" aria-label="Gráfico ilustrativo de vendas no período selecionado."><div class="chart-y-labels"><span>R$ 1.200</span><span>R$ 900</span><span>R$ 600</span><span>R$ 300</span><span>R$ 0</span></div><div class="chart"><div class="chart-grid"><i></i><i></i><i></i><i></i><i></i></div><div class="chart-bars">{#each stats.bars as bar, i}<div class="chart-bar-group"><div class="chart-bar" style={`height:${bar}%`} title={`Ponto ${i + 1}: vendas ilustrativas`}></div></div>{/each}</div></div></div><div class="chart-x-labels">{#each stats.labels as label}<span>{label}</span>{/each}</div>
					</section>
					<section class="panel-card status-card"><div class="panel-heading"><div><h2>Pedidos por status</h2><p>Distribuição dos pedidos</p></div><button class="more-button" aria-label="Mais opções">···</button></div>
						<div class="status-donut" role="img" aria-label="86 pedidos: 32 entregues, 24 em preparação, 18 enviados e 12 aguardando"><div><strong>86</strong><span>pedidos</span></div></div><div class="status-legend"><div><i class="dot delivered"></i><span>Entregues</span><b>32</b></div><div><i class="dot preparing"></i><span>Em preparação</span><b>24</b></div><div><i class="dot sent"></i><span>Enviados</span><b>18</b></div><div><i class="dot waiting"></i><span>Aguardando</span><b>12</b></div></div>
					</section>
				</div>

				<div class="dashboard-grid lower-grid">
					<section class="panel-card table-card"><div class="panel-heading"><div><h2>Pedidos recentes</h2><p>Últimas movimentações da loja</p></div><button class="subtle-link" onclick={() => active = 'pedidos'}>Ver todos <span>→</span></button></div><div class="table-scroll"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{#each orders.slice(0, 3) as order}<tr><td class="order-code">{order.code}</td><td>{order.customer}</td><td class="muted-cell">{order.date}</td><td class="money-cell">{money(order.total)}</td><td><span class={`order-status ${order.tone}`}>{order.status}</span></td><td><button class="row-more" aria-label={`Editar pedido ${order.code}`} onclick={() => openOrder(order)}>↗</button></td></tr>{/each}</tbody></table></div></section>
					<section class="panel-card best-card"><div class="panel-heading"><div><h2>Mais vendidos</h2><p>Por unidades no período</p></div><button class="subtle-link" onclick={() => active = 'produtos'}>Ver catálogo <span>→</span></button></div><div class="best-list">{#each bestSellers as product, i}<div class="best-item"><span class="rank">0{i + 1}</span><img src={product.image} alt="" loading="lazy"/><span class="best-name"><strong>{product.name}</strong><small>{product.category} · {product.units} unidades</small></span><b>{product.value}</b></div>{/each}</div></section>
				</div>

				<section class="panel-card stock-card"><div class="panel-heading"><div><h2>Estoque baixo</h2><p>Produtos que precisam de atenção</p></div><button class="subtle-link" onclick={() => active = 'estoque'}>Gerenciar estoque <span>→</span></button></div><div class="stock-list">{#each stock as product}<div class="stock-item"><img src={product.image} alt="" loading="lazy"/><span class="stock-name"><strong>{product.name}</strong><small>SKU {product.sku}</small></span><span class:critical={product.units <= 3} class="stock-level"><i></i>{product.units} unidades</span><button class="small-action" aria-label={`Registrar entrada de ${product.name}`} onclick={() => { active = 'estoque'; openStockEntry(product.sku); }}>+ Entrada</button></div>{/each}</div></section>
				<section class="panel-card insight-card"><div class="panel-heading"><div><h2>Pontos de atenção</h2><p>Leituras operacionais para orientar as próximas ações</p></div><span class="insight-tag">AMOSTRA ILUSTRATIVA</span></div><div class="insight-grid"><article><span class="insight-mark stock-mark">!</span><div><strong>Revisar reposição</strong><p>3 itens aparecem com 6 unidades ou menos. Confira prazo de reposição antes de uma ruptura.</p><button onclick={() => active = 'estoque'}>Abrir estoque <span>→</span></button></div></article><article><span class="insight-mark order-mark">↻</span><div><strong>Conciliar pagamentos</strong><p>Há pedidos aguardando pagamento na amostra. Confirme o retorno do meio de pagamento antes de separar ou cancelar.</p><button onclick={() => { active = 'pedidos'; statusFilter = 'Aguardando pagamento'; }}>Ver pendentes <span>→</span></button></div></article><article><span class="insight-mark coupon-mark">％</span><div><strong>Avaliar cupons pela margem</strong><p>O uso de cupom precisa ser comparado ao custo e à margem dos itens antes de repetir a promoção.</p><button onclick={() => active = 'cupons'}>Revisar cupons <span>→</span></button></div></article></div></section>
			{:else if active === 'estoque'}
				<div class="stock-metrics"><article class="panel-card"><span>Unidades monitoradas na amostra</span><strong>{stock.reduce((sum, item) => sum + item.units, 0)}</strong></article><article class="panel-card"><span>Itens abaixo do mínimo</span><strong class="stock-alert-number">{stock.filter((item) => item.units <= item.minimum).length}</strong></article><article class="panel-card"><span>Itens sem saldo</span><strong>{stock.filter((item) => item.units === 0).length}</strong></article></div>
				<section class="panel-card stock-management-card"><div class="panel-heading"><div><h2>Saldo por produto</h2><p>Adicione recebimentos e acompanhe o nível mínimo configurado.</p></div><button class="admin-button secondary" onclick={() => active = 'produtos'}>+ Cadastrar produto</button></div><div class="table-scroll"><table><thead><tr><th>Produto</th><th>SKU / variante</th><th>Disponível</th><th>Mínimo</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{#each stock as item}<tr><td><div class="product-cell"><img src={item.image} alt=""/><strong>{item.name}</strong></div></td><td class="muted-cell">{item.sku}</td><td class="money-cell">{item.units} un.</td><td>{item.minimum} un.</td><td><span class:low-stock={item.units <= item.minimum} class="inventory-badge">{item.units <= item.minimum ? 'Repor estoque' : 'Normal'}</span></td><td><button class="small-action" onclick={() => openStockEntry(item.sku)}>+ Entrada</button></td></tr>{/each}</tbody></table></div><div class="stock-automation-note"><span aria-hidden="true">↻</span><div><strong>Saída automática em vendas</strong><p>O sistema reserva a quantidade quando o pedido é iniciado e confirma a baixa ao aprovar o pagamento. Se o pedido expirar ou for cancelado antes do pagamento, a reserva é liberada.</p></div></div></section>
				<section class="panel-card movements-card"><div class="panel-heading"><div><h2>Movimentações recentes</h2><p>Entradas e baixas vinculadas a pedidos</p></div><span class="insight-tag">HISTÓRICO DA AMOSTRA</span></div><div class="table-scroll"><table><thead><tr><th>Data</th><th>Produto</th><th>Movimentação</th><th>Quantidade</th><th>Motivo / referência</th></tr></thead><tbody>{#each inventoryMovements as movement}<tr><td class="muted-cell">{movement.date}</td><td>{movement.item}<small class="movement-sku">{movement.sku}</small></td><td>{movement.type}</td><td class:movement-in={movement.quantity.startsWith('+')} class="money-cell">{movement.quantity}</td><td class="muted-cell">{movement.reason}</td></tr>{/each}</tbody></table></div></section>
			{:else if active === 'pedidos'}
				<section class="panel-card page-table-card"><div class="table-toolbar"><label class="table-search"><span aria-hidden="true">⌕</span><input bind:value={search} placeholder="Buscar pedido ou cliente" aria-label="Buscar pedido ou cliente" /></label><label class="filter-select">Status <select bind:value={statusFilter} aria-label="Filtrar pedidos por status"><option>Todos</option><option>Aguardando pagamento</option><option>Em preparação</option><option>Enviado</option><option>Entregue</option><option>Cancelado</option></select></label></div><div class="table-scroll"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{#each filteredOrders as order}<tr><td class="order-code">{order.code}</td><td>{order.customer}</td><td class="muted-cell">{order.date}</td><td class="money-cell">{money(order.total)}</td><td><span class={`order-status ${order.tone}`}>{order.status}</span></td><td><button class="row-more" aria-label={`Editar pedido ${order.code}`} onclick={() => openOrder(order)}>Editar</button></td></tr>{/each}</tbody></table>{#if filteredOrders.length === 0}<p class="empty-results">Nenhum pedido corresponde à busca.</p>{/if}</div><div class="table-footer">Exibindo {filteredOrders.length} de 86 pedidos <button>← Anterior</button><button class="current-page">1</button><button>Próxima →</button></div></section>
			{:else if active === 'produtos'}
				<section class="panel-card page-table-card"><div class="table-toolbar"><label class="table-search"><span aria-hidden="true">⌕</span><input placeholder="Buscar produto" aria-label="Buscar produto" /></label><label class="filter-select">Categoria <select aria-label="Filtrar categoria"><option>Todas as categorias</option><option>Cafés</option><option>Drip coffee</option><option>Métodos</option></select></label></div><div class="table-scroll"><table><thead><tr><th>Produto</th><th>Categoria</th><th>SKU</th><th>Preço</th><th>Estoque</th><th>Status</th></tr></thead><tbody>{#each [...bestSellers, ...stock.map((p) => ({ ...p, category: 'Cafés', units: p.units, value: 'R$ 49,90' }))] as product, i}<tr><td><div class="product-cell"><img src={product.image} alt=""/><strong>{product.name}</strong></div></td><td>{product.category}</td><td class="muted-cell">PT-{String(101 + i)}</td><td class="money-cell">{product.value}</td><td><span class:low={product.units < 8} class="quantity-cell">{product.units} un.</span></td><td><span class="order-status delivered">Ativo</span></td></tr>{/each}</tbody></table></div></section>
			{:else if active === 'cupons'}
				<div class="simple-cards"><article class="panel-card coupon-card"><span class="coupon-icon">％</span><div><strong>BEMVINDO10</strong><p>10% de desconto · primeira compra</p><small>Validade ilustrativa até 31 out 2026</small></div><span class="order-status delivered">Ativo</span></article><article class="panel-card coupon-card"><span class="coupon-icon sage-coupon">☕</span><div><strong>FRETEGRATIS</strong><p>Frete grátis em compras acima de R$ 150</p><small>Validade ilustrativa até 15 nov 2026</small></div><span class="order-status preparing">Agendado</span></article></div>
			{:else if active === 'conteudo'}
				<div class="simple-cards"><article class="panel-card content-row"><span class="content-type">GUIA</span><div><strong>Como escolher a moagem ideal</strong><p>Guia de preparo · Atualizado em 12 out 2026</p></div><span class="order-status delivered">Publicado</span><button class="row-more" aria-label="Opções do conteúdo">···</button></article><article class="panel-card content-row"><span class="content-type recipe">RECEITA</span><div><strong>V60: um coado doce e equilibrado</strong><p>Receitas · Atualizado em 08 out 2026</p></div><span class="order-status delivered">Publicado</span><button class="row-more" aria-label="Opções do conteúdo">···</button></article><article class="panel-card content-row"><span class="content-type faq">FAQ</span><div><strong>Dúvidas sobre moagem e conservação</strong><p>Perguntas frequentes · 8 respostas</p></div><span class="order-status waiting">Rascunho</span><button class="row-more" aria-label="Opções do conteúdo">···</button></article></div>
			{:else}
				<section class="panel-card audit-card"><div class="audit-row"><span class="audit-symbol price">R$</span><div><strong>Preço atualizado</strong><p>Casa 01 — Chocolate e Castanhas <span>· de R$ 46,90 para R$ 48,90</span></p><small>Segundo Almeida · hoje às 10:32</small></div></div><div class="audit-row"><span class="audit-symbol stock-symbol">▤</span><div><strong>Estoque ajustado</strong><p>Drip Coffee Casa 01 <span>· de 8 para 6 unidades</span></p><small>Segundo Almeida · hoje às 09:14</small></div></div><div class="audit-row"><span class="audit-symbol order-symbol">↻</span><div><strong>Status do pedido alterado</strong><p>Pedido #PT-1047 <span>· pagamento confirmado, em preparação</span></p><small>Segundo Almeida · hoje às 09:02</small></div></div><div class="audit-row"><span class="audit-symbol content-symbol">✎</span><div><strong>Conteúdo atualizado</strong><p>Como escolher a moagem ideal <span>· texto revisado</span></p><small>Segundo Almeida · ontem às 16:48</small></div></div></section>
			{/if}
			<footer class="admin-footer"><span>© 2026 Ponto de Torra · Painel de portfólio</span><span>Desenvolvido por <strong>LMX Soluções Digitais/Segundo Almeida</strong></span></footer>
		</div>
	</div>
</div>

{#if selectedOrder}
	<div class="order-modal-backdrop">
		<dialog bind:this={orderDialog} class="order-modal" aria-labelledby="order-modal-title" onclose={() => selectedOrder = null}>
			<header class="order-modal-header"><div><p class="admin-eyebrow">PEDIDO · AMOSTRA DE PORTFÓLIO</p><h2 id="order-modal-title">{selectedOrder.code}</h2><p>{selectedOrder.customer} · {money(selectedOrder.total)}</p></div><button class="modal-close" aria-label="Fechar edição do pedido" onclick={() => selectedOrder = null}>×</button></header>
			<form onsubmit={(event) => { event.preventDefault(); saveOrder(); }}>
				<label>Status do pedido<select bind:value={orderStatus}><option>Aguardando pagamento</option><option>Em preparação</option><option>Enviado</option><option>Entregue</option><option>Cancelado</option></select></label>
				<div class="tracking-fields"><label>Transportadora<input bind:value={orderCarrier} placeholder="Ex.: Correios" /></label><label>Código de rastreio<input bind:value={orderTracking} placeholder="Informe o código" /></label></div>
				{#if orderStatus === 'Enviado'}<div class="tracking-hint">Ao conectar as integrações, o código poderá ser compartilhado com o cliente e consultado no rastreamento.</div>{:else if orderStatus === 'Entregue'}<div class="tracking-hint delivered-hint">Marcar como entregue concluirá o acompanhamento do pedido e ficará registrado no histórico.</div>{/if}
				<div class="modal-actions"><button type="button" class="admin-button secondary" onclick={() => selectedOrder = null}>Cancelar</button><button type="submit" class="admin-button">Salvar alterações</button></div>
			</form>
			<p class="modal-footnote">Esta demonstração salva somente no estado desta página; nada é gravado em um sistema.</p>
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
				<div class="modal-actions"><button type="button" class="admin-button secondary" onclick={() => showStockForm = false}>Cancelar</button><button type="submit" class="admin-button">Registrar entrada</button></div>
			</form>
			<p class="modal-footnote">Entrada atualiza o saldo e cria um registro no histórico desta demonstração.</p>
		</dialog>
	</div>
{/if}

<style>
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
	.user-menu { margin-left:auto; color:#cbbcad; font-size:19px; }
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
	.dot { width:7px; height:7px; border-radius:50%; flex:0 0 auto; }.delivered.dot { background:#839078; }.preparing.dot { background:#b98965; }.sent.dot { background:#d0aa7c; }.waiting.dot { background:#ddd3c6; }
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
	.order-modal-backdrop { position:fixed;z-index:50;inset:0;display:grid;place-items:center;padding:20px;background:rgba(33,24,18,.48); }.order-modal { width:min(100%,520px);padding:23px;border:1px solid #e9e1d8;border-radius:16px;background:#fffdfa;box-shadow:0 24px 70px rgba(34,23,16,.25); }.order-modal-header { display:flex;justify-content:space-between;gap:15px;padding-bottom:17px;border-bottom:1px solid #eee7df; }.order-modal-header .admin-eyebrow { margin-bottom:7px; }.order-modal-header h2 { margin:0;color:#3e2e25;font:500 27px/1.1 Georgia,serif; }.order-modal-header p:last-child { margin:6px 0 0;color:#81766c;font-size:10px; }.modal-close { width:32px;height:32px;border:0;border-radius:50%;color:#715d4c;background:#f4eee7;font-size:22px;cursor:pointer; }.order-modal form { display:grid;gap:14px;padding-top:18px; }.order-modal form > label,.tracking-fields label { display:grid;gap:6px;color:#6f6257;font-size:10px;font-weight:600; }.order-modal input,.order-modal select { min-height:39px;padding:0 11px;border:1px solid #e4dbd1;border-radius:8px;color:#473a31;background:#fff;font-size:11px; }.tracking-fields { display:grid;grid-template-columns:.8fr 1.2fr;gap:10px; }.tracking-hint { padding:10px 12px;border-radius:8px;color:#74634f;background:#f5f0e8;font-size:9px;line-height:1.5; }.tracking-hint.delivered-hint { color:#5f7051;background:#eef2e9; }.modal-actions { display:flex;justify-content:flex-end;gap:9px;padding-top:5px; }.modal-footnote { margin:14px 0 0;color:#9a9087;font-size:9px;text-align:center; }
	.page-table-card { padding:0; overflow:hidden; }
	.table-toolbar { min-height:63px; display:flex; align-items:center; gap:12px; padding:12px 17px; border-bottom:1px solid var(--admin-line); }
	.table-search { width:min(320px,100%); min-height:35px; display:flex; align-items:center; gap:8px; padding:0 10px; border:1px solid #e8e1d9; border-radius:8px; color:#958b80; background:#fff; }
	.table-search input { width:100%; min-width:0; border:0; outline:0; color:#51463e; background:transparent; font-size:10px; }.table-search input::placeholder { color:#aaa197; }
	.table-toolbar .filter-select { margin-left:auto; }
	.page-table-card th { height:41px; padding-inline:17px; }.page-table-card td { height:59px; padding-inline:17px; font-size:10px; }.page-table-card th:first-child,.page-table-card td:first-child { padding-left:20px; }
	.row-more { font-size:18px; }
	.table-footer { display:flex; align-items:center; gap:6px; min-height:50px; padding:0 17px; border-top:1px solid #f1ede8; color:#9b9187; font-size:9px; }.table-footer button { width:27px;height:27px;border:1px solid #e9e3dc;border-radius:6px;color:#786b5f;background:#fff;font-size:9px;cursor:pointer; }.table-footer button:first-of-type { margin-left:auto; }.table-footer .current-page { color:#fff;background:#654638;border-color:#654638; }
	.empty-results { padding:25px; color:#92877c; text-align:center; font-size:11px; }
	.product-cell { display:flex; align-items:center; gap:9px; }.product-cell img { width:33px;height:33px;object-fit:cover;border-radius:7px; }.product-cell strong { font-size:9px; }.quantity-cell { color:#758263; font-weight:600; }.quantity-cell.low { color:#a06a4c; }
	.simple-cards { display:grid; gap:12px; }.coupon-card,.content-row { display:flex; align-items:center; gap:16px; padding:18px; }.coupon-icon { width:42px;height:42px;display:grid;place-items:center;border-radius:11px;color:#765840;background:#f3eadf;font-size:20px; }.sage-coupon { color:#6e795e;background:#edf0e8; }.coupon-card > div,.content-row > div { min-width:0; flex:1; }.coupon-card strong,.content-row strong { color:#493a30;font:600 15px Georgia,serif; }.coupon-card p,.content-row p { margin:5px 0;color:#786d62;font-size:10px; }.coupon-card small { color:#a1968b;font-size:9px; }.content-type { min-width:64px;padding:8px 9px;border-radius:7px;color:#765c43;background:#f1e8dc;text-align:center;font-size:8px;font-weight:700;letter-spacing:.08em; }.content-type.recipe { color:#6c795f;background:#edf0e8; }.content-type.faq { color:#856d7a;background:#f3eaf0; }
	.audit-card { padding:0 19px; }.audit-row { display:flex; gap:14px; padding:18px 0; border-bottom:1px solid #f0ece7; }.audit-row:last-child { border:0; }.audit-symbol { width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border-radius:9px;color:#765840;background:#f3eadf;font-size:10px;font-weight:700; }.stock-symbol { color:#6e795e;background:#edf0e8; }.order-symbol { color:#8d775e;background:#f4efdf; }.content-symbol { color:#856d7a;background:#f3eaf0; }.audit-row strong { color:#4c3e34;font-size:11px; }.audit-row p { margin:4px 0;color:#70655b;font-size:10px; }.audit-row p span { color:#9a9085; }.audit-row small { color:#a0968c;font-size:9px; }
	@media(max-width:1120px) { .admin-shell { grid-template-columns:220px minmax(0,1fr); }.admin-sidebar { padding-inline:13px; }.admin-content { padding-inline:23px; }.admin-topbar { padding-inline:23px; }.metrics-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }.dashboard-grid.lower-grid { grid-template-columns:1fr; }.insight-grid { grid-template-columns:1fr; } }
	@media(max-width:760px) { .admin-shell { display:block; }.admin-sidebar { position:fixed; z-index:20; left:0; top:0; width:250px; height:100dvh; box-shadow:15px 0 40px rgba(24,15,10,.18); transform:translateX(-105%); transition:transform .2s ease; }.admin-sidebar.mobile-open { transform:translateX(0); }.menu-toggle { width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:8px;color:#5e493a;background:#f3eee8;font-size:17px;cursor:pointer; }.admin-topbar { height:62px; gap:12px; padding-inline:16px; }.admin-breadcrumb { flex:1;gap:7px;font-size:10px; }.admin-breadcrumb span { display:none; }.topbar-actions { gap:10px; }.status-indicator { font-size:0; }.status-indicator i { width:8px;height:8px; }.icon-button { font-size:17px; }.admin-content { padding:17px 15px; }.portfolio-banner { align-items:flex-start; font-size:9px; }.page-heading { align-items:flex-start; flex-direction:column; gap:14px; margin:22px 0 16px; }.page-heading h1 { font-size:29px; }.page-heading > :last-child { align-self:flex-start; }.metrics-grid { gap:9px; }.metric-card { min-height:126px;padding:13px; }.metric-top { font-size:9px; }.metric-card > strong { font-size:21px; }.metric-card > small { max-width:150px; font-size:8px; }.dashboard-grid { grid-template-columns:1fr; gap:10px; margin-top:10px; }.panel-card { border-radius:10px; }.sales-card { padding:14px 12px; }.chart-wrap { grid-template-columns:44px 1fr;gap:7px;height:160px; }.chart-x-labels { margin-left:51px; }.status-card { padding:14px; }.lower-grid { margin-top:10px; }.table-card .panel-heading,.best-card .panel-heading { padding-inline:13px; }.stock-card { padding:14px; }.stock-item { gap:7px; }.stock-level { font-size:8px; }.small-action { font-size:7px; }.admin-footer { flex-direction:column;gap:5px;padding-top:15px;font-size:8px; }.table-toolbar { align-items:stretch;flex-wrap:wrap;padding:12px; }.table-search { flex:1;min-width:180px; }.table-toolbar .filter-select { margin:0; }.page-table-card th { padding-inline:12px; }.page-table-card td { padding-inline:12px; }.page-table-card th:first-child,.page-table-card td:first-child { padding-left:14px; }.table-footer { padding-inline:12px; }.simple-cards .coupon-card { align-items:flex-start;gap:10px;flex-wrap:wrap; }.coupon-card > .order-status { margin-left:52px; }.content-row { gap:10px;padding:13px; }.content-type { min-width:53px; }.content-row strong { font:600 13px Georgia,serif; }.audit-card { padding-inline:14px; }.tracking-fields { grid-template-columns:1fr; }.order-modal { max-height:calc(100dvh - 32px);overflow-y:auto;padding:19px; }.insight-grid article { padding:11px; } }
	@media(max-width:390px) { .metrics-grid { grid-template-columns:1fr 1fr; }.metric-card > strong { font-size:19px; }.metric-card > small { max-width:125px; }.topbar-actions { gap:6px; }.topbar-avatar { width:27px;height:27px; }.stock-name strong { max-width:150px; } }
	@media(prefers-reduced-motion:reduce) { .admin-sidebar,.chart-bar { transition:none; } }
</style>
