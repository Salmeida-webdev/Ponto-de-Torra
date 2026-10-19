export type CategoryId = 'cafes' | 'drip' | 'metodos' | 'acessorios' | 'kits';

export type Product = {
	id: string;
	slug: string;
	name: string;
	category: CategoryId;
	description: string;
	image: string;
	price: number;
	unit: string;
	badge?: string;
};

export const categories: { id: CategoryId; title: string; short: string; description: string; image: string }[] = [
	{ id: 'cafes', title: 'Cafés', short: 'Café em grãos e moído', description: 'Perfis para descobrir no seu ritmo, com informações de lote a confirmar.', image: '/images/products/p01.jpg' },
	{ id: 'drip', title: 'Drip coffee', short: 'Seu coado, em qualquer lugar', description: 'Porções individuais para uma pausa simples. Composição demonstrativa.', image: '/images/products/p21.jpg' },
	{ id: 'metodos', title: 'Métodos', short: 'Encontre seu jeito de preparar', description: 'Equipamentos de preparo com especificações ilustrativas.', image: '/images/products/p29.jpg' },
	{ id: 'acessorios', title: 'Acessórios', short: 'Pequenos detalhes, bom preparo', description: 'Itens de apoio para montar seu ritual de café.', image: '/images/products/p35.jpg' },
	{ id: 'kits', title: 'Kits & presentes', short: 'Um convite para experimentar', description: 'Combinações conceituais para presentear e descobrir.', image: '/images/products/p43.jpg' }
];

const rows: [string, string, CategoryId, string, number, string, string?][] = [
	['casa-01-chocolate-e-castanhas','Casa 01 — Chocolate e Castanhas','cafes','Um perfil conceitual de torra média, pensado para começar a explorar o café especial.',4890,'250 g','Mais pedido'],
	['fruta-02-frutas-amarelas','Fruta 02 — Frutas Amarelas','cafes','Descrição sensorial de referência. A percepção varia entre pessoas e lotes.',5290,'250 g','Perfil frutado'],
	['citrico-03-perfil-citrico','Cítrico 03 — Perfil Cítrico','cafes','Um café de perfil cítrico para métodos filtrados. Origem e lote a confirmar.',5290,'250 g'],
	['doce-04-caramelo','Doce 04 — Caramelo','cafes','Notas de caramelo como referência sensorial, não como garantia de sabor.',4990,'250 g'],
	['floral-05-perfil-floral','Floral 05 — Perfil Floral','cafes','Uma proposta leve e aromática. Informações do lote serão definidas depois.',5590,'250 g'],
	['cacau-06-cacau-e-especiarias','Cacau 06 — Cacau e Especiarias','cafes','Perfil conceitual com notas de cacau e especiarias.',4990,'250 g'],
	['classico-07-perfil-equilibrado','Clássico 07 — Perfil Equilibrado','cafes','Uma sugestão equilibrada para o café do dia a dia.',4690,'250 g'],
	['intenso-08-perfil-para-espresso','Intenso 08 — Perfil para Espresso','cafes','Perfil pensado para espresso. Compatibilidade depende do equipamento.',4990,'250 g'],
	['leve-09-perfil-para-filtro','Leve 09 — Perfil para Filtro','cafes','Perfil de referência para métodos filtrados.',5190,'250 g'],
	['doce-da-casa-blend-da-marca','Doce da Casa — Blend da Marca','cafes','Nome conceitual de blend. Composição e origem ainda não definidas.',4790,'250 g'],
	['lote-da-estacao-01','Lote da Estação 01','cafes','Nome demonstrativo. Safra, origem e processo dependem de um lote real.',5990,'250 g','Lote conceitual'],
	['lote-da-estacao-02','Lote da Estação 02','cafes','Nome demonstrativo. Safra, origem e processo dependem de um lote real.',5990,'250 g'],
	['microlote-experimental-01','Microlote Experimental 01','cafes','Perfil de produto conceitual, sem alegações de origem ou certificação.',6490,'250 g'],
	['microlote-experimental-02','Microlote Experimental 02','cafes','Perfil de produto conceitual, sem alegações de origem ou certificação.',6490,'250 g'],
	['descafeinado-da-casa','Descafeinado da Casa','cafes','Opção descafeinada de referência. Processo e fornecedor a confirmar.',5290,'250 g'],
	['blend-para-espresso','Blend para Espresso','cafes','Blend de referência para espresso. Receita e proporções a definir.',4890,'250 g'],
	['blend-para-coado','Blend para Coado','cafes','Blend de referência para métodos filtrados. Receita a definir.',4890,'250 g'],
	['cafe-para-cold-brew','Café para Cold Brew','cafes','Perfil de referência para extração a frio. Moagem a confirmar.',4990,'250 g'],
	['cafe-de-torra-clara','Café de Torra Clara','cafes','Categoria de torra demonstrativa. Curva e lote a confirmar.',5390,'250 g'],
	['cafe-de-torra-media','Café de Torra Média','cafes','Categoria de torra demonstrativa. Curva e lote a confirmar.',4990,'250 g'],
	['drip-coffee-casa-01','Drip Coffee Casa 01','drip','Porção individual de café para preparo direto na xícara. Conteúdo ilustrativo.',1290,'1 sachê'],
	['drip-coffee-fruta-02','Drip Coffee Fruta 02','drip','Porção individual de referência para levar e preparar onde estiver.',1390,'1 sachê'],
	['drip-coffee-citrico-03','Drip Coffee Cítrico 03','drip','Perfil cítrico conceitual em formato drip.',1390,'1 sachê'],
	['drip-coffee-doce-04','Drip Coffee Doce 04','drip','Perfil doce conceitual em formato drip.',1390,'1 sachê'],
	['drip-coffee-classico-07','Drip Coffee Clássico 07','drip','Perfil equilibrado de referência em porção individual.',1290,'1 sachê'],
	['drip-coffee-descafeinado','Drip Coffee Descafeinado','drip','Opção descafeinada de referência em porção individual.',1490,'1 sachê'],
	['kit-degustacao-drip','Kit Degustação Drip','drip','Seleção conceitual de porções individuais. Quantidades a confirmar.',6990,'5 sachês','Para experimentar'],
	['refil-drip-coffee','Refil Drip Coffee','drip','Refil conceitual. Compatibilidade e quantidade da caixa a definir.',5990,'5 sachês'],
	['coador-v60','Coador V60','metodos','Coador de referência. Tamanho, material e compatibilidade a confirmar.',8990,'1 unidade'],
	['prensa-francesa','Prensa Francesa','metodos','Método de imersão. Capacidade e materiais demonstrativos.',12990,'1 unidade'],
	['cafeteira-italiana','Cafeteira Italiana','metodos','Método moka de referência. Capacidade e materiais a confirmar.',11990,'1 unidade'],
	['coador-de-pano-reutilizavel','Coador de Pano Reutilizável','metodos','Método tradicional de referência. Tamanho e composição a confirmar.',2990,'1 unidade'],
	['balanca-digital-para-cafe','Balança Digital para Café','metodos','Acessório conceitual. Precisão, dimensões e alimentação a confirmar.',8990,'1 unidade'],
	['moedor-manual','Moedor Manual','metodos','Moedor de referência. Ajustes, capacidade e material a confirmar.',15990,'1 unidade'],
	['filtros-de-papel-para-v60','Filtros de Papel para V60','acessorios','Consumível de referência. Formato, quantidade e compatibilidade a confirmar.',2490,'1 pacote'],
	['filtros-de-papel-para-cafeteira','Filtros de Papel para Cafeteira','acessorios','Consumível de referência. Formato e quantidade a confirmar.',1990,'1 pacote'],
	['servidor-de-cafe','Servidor de Café','acessorios','Servidor de referência. Capacidade e material a confirmar.',7990,'1 unidade'],
	['colher-dosadora','Colher Dosadora','acessorios','Acessório de referência. Material e volume a confirmar.',2490,'1 unidade'],
	['pote-hermetico-para-cafe','Pote Hermético para Café','acessorios','Pote de referência. Capacidade e material a confirmar.',6990,'1 unidade'],
	['caneca-ponto-de-torra','Caneca Ponto de Torra','acessorios','Produto conceitual de marca. Foto não representa uma embalagem oficial.',5990,'1 unidade','Conceito'],
	['copo-termico','Copo Térmico','acessorios','Acessório de referência. Capacidade, material e vedação a confirmar.',8990,'1 unidade'],
	['escovas-de-limpeza','Conjunto de Escovas de Limpeza','acessorios','Fotografia real de um conjunto de escovas para limpeza de utensílios. O modelo final é demonstrativo.',1990,'1 conjunto'],
	['primeiro-coado','Primeiro Coado','kits','Combinação conceitual de café e método de entrada. Itens a definir.',13990,'1 kit','Comece por aqui'],
	['ritual-v60','Ritual V60','kits','Combinação conceitual de café, coador e filtros compatíveis.',18990,'1 kit'],
	['ritual-prensa','Ritual Prensa','kits','Combinação conceitual de café e prensa. Componentes a definir.',22990,'1 kit'],
	['espresso-em-casa','Espresso em Casa','kits','Combinação conceitual para preparo de espresso. Equipamento não incluído.',15990,'1 kit'],
	['cold-brew-em-casa','Cold Brew em Casa','kits','Combinação conceitual para extração a frio. Componentes a definir.',16990,'1 kit'],
	['kit-degustacao-da-casa','Kit Degustação da Casa','kits','Seleção conceitual de cafés para comparar perfis.',17990,'1 kit'],
	['kit-presente-pequeno','Kit Presente Pequeno','kits','Composição ilustrativa. Itens finais e embalagem a definir.',9990,'1 kit','Para presentear'],
	['kit-presente-completo','Kit Presente Completo','kits','Composição ilustrativa. Itens finais e embalagem a definir.',28990,'1 kit']
];

export const products: Product[] = rows.map(([slug, name, category, description, price, unit, badge], index) => ({
	id: `p${String(index + 1).padStart(2, '0')}`,
	slug,
	name,
	category,
	description,
	price,
	unit,
	badge,
	image: `/images/products/p${String(index + 1).padStart(2, '0')}.jpg`
}));

export const categoryName = (id: CategoryId) => categories.find((item) => item.id === id)?.title ?? 'Produtos';
export const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
