import variantIds from './variant-ids.json';
import coffeeVariants from './coffee-variants.json';

export type CategoryId = 'cafes' | 'drip' | 'metodos' | 'acessorios' | 'kits';

export type Product = {
	id: string;
	slug: string;
	name: string;
	category: CategoryId;
	variantId: string;
	variants?: { id: string; sku: string; price: number; unit: string; weight: string; grind: string }[];
	description: string;
	image: string;
	price: number;
	unit: string;
	badge?: string;
};

export const categories: { id: CategoryId; title: string; short: string; description: string; image: string }[] = [
	{ id: 'cafes', title: 'Cafés', short: 'Café em grãos e moído', description: 'Cafés especiais em diferentes perfis de torra, com opções para grãos e moagem.', image: '/images/products/p01.jpg' },
	{ id: 'drip', title: 'Drip coffee', short: 'Seu coado, em qualquer lugar', description: 'Drip coffee individual para preparar uma xícara fresca onde estiver.', image: '/images/products/p21.jpg' },
	{ id: 'metodos', title: 'Métodos', short: 'Encontre seu jeito de preparar', description: 'Utensílios para explorar diferentes técnicas de preparo.', image: '/images/products/p29.jpg' },
	{ id: 'acessorios', title: 'Acessórios', short: 'Pequenos detalhes, bom preparo', description: 'Itens para organizar sua bancada e acompanhar o preparo do café.', image: '/images/products/p35.jpg' },
	{ id: 'kits', title: 'Kits & presentes', short: 'Um convite para experimentar', description: 'Combinações de cafés e acessórios para experimentar ou presentear.', image: '/images/products/p43.jpg' }
];

const rows: [string, string, CategoryId, string, number, string, string?][] = [
	['casa-01-chocolate-e-castanhas','Casa 01 — Chocolate e Castanhas','cafes','Torra média, com notas de chocolate e castanhas. Versátil para espresso e métodos filtrados.',4890,'250 g','Mais pedido'],
	['fruta-02-frutas-amarelas','Fruta 02 — Frutas Amarelas','cafes','Perfil frutado, com notas de frutas amarelas, acidez equilibrada e finalização doce.',5290,'250 g','Perfil frutado'],
	['citrico-03-perfil-citrico','Cítrico 03 — Perfil Cítrico','cafes','Perfil cítrico e delicado, especialmente agradável em métodos filtrados.',5290,'250 g'],
	['doce-04-caramelo','Doce 04 — Caramelo','cafes','Doçura marcante e corpo equilibrado, com notas que remetem ao caramelo.',4990,'250 g'],
	['floral-05-perfil-floral','Floral 05 — Perfil Floral','cafes','Perfil leve e aromático, com notas florais e finalização delicada.',5590,'250 g'],
	['cacau-06-cacau-e-especiarias','Cacau 06 — Cacau e Especiarias','cafes','Notas envolventes de cacau e especiarias, com corpo presente e finalização longa.',4990,'250 g'],
	['classico-07-perfil-equilibrado','Clássico 07 — Perfil Equilibrado','cafes','Uma sugestão equilibrada para o café do dia a dia.',4690,'250 g'],
	['intenso-08-perfil-para-espresso','Intenso 08 — Perfil para Espresso','cafes','Perfil pensado para espresso. Compatibilidade depende do equipamento.',4990,'250 g'],
	['leve-09-perfil-para-filtro','Leve 09 — Perfil para Filtro','cafes','Perfil delicado, com acidez suave e aromas que se destacam em métodos filtrados.',5190,'250 g'],
	['doce-da-casa-blend-da-marca','Doce da Casa — Blend da Marca','cafes','Blend de torra média, com doçura equilibrada e notas de chocolate ao leite.',4790,'250 g'],
	['lote-da-estacao-01','Lote da Estação 01','cafes','Edição especial de torra clara, com perfil aromático e acidez delicada.',5990,'250 g','Edição especial'],
	['lote-da-estacao-02','Lote da Estação 02','cafes','Edição especial de torra média, com notas doces e textura aveludada.',5990,'250 g'],
	['microlote-experimental-01','Microlote Experimental 01','cafes','Café de perfil floral e cítrico, com acidez brilhante e finalização limpa.',6490,'250 g'],
	['microlote-experimental-02','Microlote Experimental 02','cafes','Café de corpo delicado, com notas de frutas maduras e doçura prolongada.',6490,'250 g'],
	['descafeinado-da-casa','Descafeinado da Casa','cafes','Sabor equilibrado e notas adocicadas para aproveitar café a qualquer hora.',5290,'250 g'],
	['blend-para-espresso','Blend para Espresso','cafes','Blend encorpado, desenvolvido para uma extração equilibrada e cremosa.',4890,'250 g'],
	['blend-para-coado','Blend para Coado','cafes','Blend suave e aromático, ideal para métodos filtrados.',4890,'250 g'],
	['cafe-para-cold-brew','Café para Cold Brew','cafes','Perfil doce e refrescante, pensado para extração a frio.',4990,'250 g'],
	['cafe-de-torra-clara','Café de Torra Clara','cafes','Torra clara que destaca aromas delicados, acidez viva e notas frutadas.',5390,'250 g'],
	['cafe-de-torra-media','Café de Torra Média','cafes','Torra média equilibrada, com doçura presente e corpo aveludado.',4990,'250 g'],
	['drip-coffee-casa-01','Drip Coffee Casa 01','drip','Café em sachê individual com suporte integrado para preparar direto na xícara.',1290,'1 sachê'],
	['drip-coffee-fruta-02','Drip Coffee Fruta 02','drip','Um café de perfil frutado em sachê individual, prático para levar e preparar.',1390,'1 sachê'],
	['drip-coffee-citrico-03','Drip Coffee Cítrico 03','drip','Notas cítricas e aroma delicado em um sachê pronto para o preparo individual.',1390,'1 sachê'],
	['drip-coffee-doce-04','Drip Coffee Doce 04','drip','Perfil doce e equilibrado, embalado individualmente para preservar o aroma.',1390,'1 sachê'],
	['drip-coffee-classico-07','Drip Coffee Clássico 07','drip','Perfil equilibrado em sachê individual, perfeito para uma pausa prática.',1290,'1 sachê'],
	['drip-coffee-descafeinado','Drip Coffee Descafeinado','drip','Café descafeinado em sachê individual para um preparo prático e aromático.',1490,'1 sachê'],
	['kit-degustacao-drip','Kit Degustação Drip','drip','Cinco sachês com perfis variados para descobrir seu favorito.',6990,'5 sachês','Para experimentar'],
	['refil-drip-coffee','Refil Drip Coffee','drip','Cinco unidades individuais para manter seu café favorito sempre por perto.',5990,'5 sachês'],
	['coador-v60','Coador V60','metodos','Coador para preparo manual, com extração limpa e controle sobre o despejo.',8990,'1 unidade'],
	['prensa-francesa','Prensa Francesa','metodos','Preparo por imersão que realça o corpo e a textura do café.',12990,'1 unidade'],
	['cafeteira-italiana','Cafeteira Italiana','metodos','O clássico preparo moka para um café intenso e encorpado.',11990,'1 unidade'],
	['coador-de-pano-reutilizavel','Coador de Pano Reutilizável','metodos','Uma forma tradicional de preparar café, reutilizável e fácil de incorporar à rotina.',2990,'1 unidade'],
	['balanca-digital-para-cafe','Balança Digital para Café','metodos','Mais precisão na proporção entre água e café em cada preparo.',8990,'1 unidade'],
	['moedor-manual','Moedor Manual','metodos','Moa os grãos na hora e ajuste a granulometria ao seu método favorito.',15990,'1 unidade'],
	['filtros-de-papel-para-v60','Filtros de Papel para V60','acessorios','Filtros para acompanhar seu coador e proporcionar uma extração uniforme.',2490,'1 pacote'],
	['filtros-de-papel-para-cafeteira','Filtros de Papel para Cafeteira','acessorios','Filtros de papel para facilitar o preparo diário na cafeteira.',1990,'1 pacote'],
	['servidor-de-cafe','Servidor de Café','acessorios','Sirva o café com praticidade e acompanhe o fluxo da extração.',7990,'1 unidade'],
	['colher-dosadora','Colher Dosadora','acessorios','Uma medida prática para repetir sua proporção favorita no preparo.',2490,'1 unidade'],
	['pote-hermetico-para-cafe','Pote Hermético para Café','acessorios','Armazene os grãos com praticidade e mantenha sua bancada organizada.',6990,'1 unidade'],
	['caneca-ponto-de-torra','Caneca Ponto de Torra','acessorios','Uma caneca especial para acompanhar suas pausas com café.',5990,'1 unidade','Presente favorito'],
	['copo-termico','Copo Térmico','acessorios','Leve seu café com você e aproveite a bebida durante a rotina.',8990,'1 unidade'],
	['escovas-de-limpeza','Conjunto de Escovas de Limpeza','acessorios','Escovas para facilitar a limpeza de coadores, jarras e utensílios de preparo.',1990,'1 conjunto'],
	['primeiro-coado','Primeiro Coado','kits','Uma combinação prática para começar a explorar o preparo manual de café.',13990,'1 kit','Comece por aqui'],
	['ritual-v60','Ritual V60','kits','Itens essenciais para preparar café no método V60 e aproveitar cada etapa.',18990,'1 kit'],
	['ritual-prensa','Ritual Prensa','kits','Uma combinação para apreciar café encorpado preparado por imersão.',22990,'1 kit'],
	['espresso-em-casa','Espresso em Casa','kits','Uma seleção para montar seu ritual de espresso com praticidade.',15990,'1 kit'],
	['cold-brew-em-casa','Cold Brew em Casa','kits','Uma combinação para preparar café extraído a frio em casa.',16990,'1 kit'],
	['kit-degustacao-da-casa','Kit Degustação da Casa','kits','Uma seleção de cafés para comparar aromas, sabores e diferentes perfis.',17990,'1 kit'],
	['kit-presente-pequeno','Kit Presente Pequeno','kits','Uma seleção especial para presentear quem aprecia um bom café.',9990,'1 kit','Para presentear'],
	['kit-presente-completo','Kit Presente Completo','kits','Uma experiência completa para descobrir novos cafés e métodos de preparo.',28990,'1 kit']
];

export const products: Product[] = rows.map(([slug, name, category, description, price, unit, badge], index) => ({
	id: `p${String(index + 1).padStart(2, '0')}`,
	slug,
	name,
	category,
	variantId: variantIds[slug as keyof typeof variantIds],
	variants: coffeeVariants[slug as keyof typeof coffeeVariants]?.map((variant) => ({
		id: variant.id, sku: variant.sku, price: variant.price, unit: variant.unit,
		weight: variant.weight, grind: variant.grind
	})),
	description,
	price,
	unit,
	badge,
	image: `/images/products/p${String(index + 1).padStart(2, '0')}.jpg`
}));

export const categoryName = (id: CategoryId) => categories.find((item) => item.id === id)?.title ?? 'Produtos';
export const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
