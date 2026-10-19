# Briefing final detalhado — E-commerce próprio 2

## Ponto de Torra

Este projeto será a segunda loja própria do portfólio. A proposta é demonstrar uma experiência de compra de **cafés especiais e acessórios de preparo**, complementando a Fio de Varanda com outro nicho, linguagem visual, framework e nível de painel.

**Status:** briefing aprovado para orientar a implementação.\
**Nome:** conceitual; disponibilidade de marca, domínio e redes ainda precisa ser verificada.\
**Importante:** este documento define o projeto, mas não significa que a loja já tenha sido construída, integrada ou testada.

---

## 1. Papel no conjunto de projetos

| Projeto próprio    | Nicho                                 | Complexidade do dashboard | Direção técnica              |
| ------------------ | ------------------------------------- | ------------------------- | ---------------------------- |
| Fio de Varanda     | Cama, mesa e banho, com foco em redes | Básica                    | Astro com componentes React  |
| **Ponto de Torra** | **Cafés especiais e preparo**         | **Intermediária**         | **SvelteKit com TypeScript** |
| Terceira loja      | Nicho a definir                       | Avançada                  | A definir                    |

As lojas devem demonstrar competências diferentes. O padrão profissional de cards definido para os próximos projetos será aplicado também aqui, mas os componentes visuais serão próprios da marca Ponto de Torra.

---

## 2. Marca e posicionamento

**Nome de trabalho:** Ponto de Torra\
**Assinatura:** *Encontre seu próximo café.*\
**Categoria:** cafés, drip coffee, métodos, acessórios e kits.\
**Proposta:** ajudar o cliente a encontrar cafés adequados ao seu paladar e ao método de preparo, explicando as características do produto de maneira clara e acessível.

### Público

- Quem está começando a conhecer cafés especiais.
- Quem já compra café em grãos ou moído com frequência.
- Pessoas que procuram métodos e acessórios de preparo.
- Quem busca kits de café para presentear.

### Personalidade

Curiosa, segura, urbana, direta e acessível. A marca deve transmitir conhecimento sem elitismo. Deve explicar conceitos sem exigir que o cliente já conheça termos técnicos.

### Voz da marca

- Usar explicações curtas para torra, moagem, origem e método.
- Explicar notas sensoriais como descrições de perfil, não como garantia de que todas as pessoas sentirão o mesmo sabor.
- Não usar alegações como “o melhor do Brasil”, “produção sustentável”, “orgânico” ou “direto da fazenda” sem comprovação.
- Informar origem, variedade, altitude, processo e certificações somente quando os dados forem confirmados para o lote vendido.

---

## 3. Identidade visual

A marca terá uma direção **editorial, gráfica e contemporânea**, inspirada em embalagens de torrefação e publicações de cultura urbana. Ela deve se distinguir da linguagem acolhedora e têxtil da Fio de Varanda.

### Paleta proposta

| Cor             | Código    | Aplicação                      |
| --------------- | --------- | ------------------------------ |
| Papel claro     | `#F5F3EE` | Fundo principal                |
| Espresso        | `#211D1B` | Texto e contraste              |
| Azul cobalto    | `#2947D7` | Cor principal de marca e ações |
| Amarelo cítrico | `#D9F26A` | Pequenos acentos e etiquetas   |
| Coral queimado  | `#E45F42` | Destaques secundários          |

As cores precisam manter contraste suficiente em textos, botões e controles, especialmente no celular.

### Tipografia

- **Títulos:** sans-serif condensada e expressiva, como Archivo Narrow ou alternativa local equivalente.
- **Interface:** sans-serif neutra e legível, como Manrope ou alternativa local.
- **Dados técnicos:** fonte monoespaçada como detalhe para origem, lote, moagem e preparo; nunca em textos longos.

### Logo e entregáveis

Criar uma identidade própria para **Ponto de Torra**, usando um ponto, círculo ou marca gráfica como símbolo. Evitar o ícone genérico de xícara fumegante.

Entregar:

- Logo principal e versão horizontal.
- Versões para fundos claros e escuros.
- Símbolo reduzido e favicon.
- PNG com fundo transparente e SVG.
- Aplicações em embalagem, site, painel e imagem social.
- Logo artística com leitura clara em tamanhos pequenos.

---

## 4. Padrão obrigatório de acabamento dos cards

O acabamento profissional e o refinamento dos cards passam a ser um padrão dos próximos projetos. Esse padrão define legibilidade, consistência e qualidade; não obriga os sites a usarem o mesmo desenho.

### Cards de produto

- Fotografia real e autorizada do produto correspondente.
- Enquadramento consistente por categoria, sem deformar embalagem ou produto.
- **Nome do produto centralizado em uma linha própria acima do preço.**
- **Preço centralizado em uma linha própria abaixo do nome.**
- Peso, moagem ou método recomendado podem aparecer como informação secundária.
- Variantes devem ter rótulos compreensíveis, além de indicação visual.
- Botão principal claramente identificável.
- Estados de indisponibilidade, carregamento e erro visíveis.
- Nome, preço e controles sem corte em celular ou desktop.
- Altura flexível para que descrições e títulos não sejam truncados para forçar uniformidade.

### Outros cards

Receitas, métodos, kits, artigos e recomendações devem ter hierarquia visual, espaçamento, contraste e estados de interação consistentes. A composição pode variar por finalidade: um card de receita pode ser editorial; um card de equipamento pode ser mais funcional.

### Movimento e responsividade

- Efeitos discretos e rápidos.
- Animações não podem bloquear leitura, navegação ou compra.
- Respeitar a preferência de movimento reduzido do dispositivo.
- No celular, ações devem funcionar por toque; não podem depender somente de hover.
- Foco de teclado visível e controles com nomes acessíveis.

---

## 5. Catálogo de 50 produtos

A loja terá exatamente **50 produtos distintos**. Peso, moagem, cor ou tamanho serão variantes do produto e não contarão como produtos adicionais.

| Categoria                         | Quantidade |
| --------------------------------- | ---------- |
| Cafés                             | 20         |
| Drip coffee e porções individuais | 8          |
| Métodos e equipamentos            | 6          |
| Acessórios                        | 8          |
| Kits                              | 8          |
| **Total**                         | **50**     |

Os nomes abaixo são nomes conceituais. Perfis sensoriais, origem, processo, preço e outros dados precisam ser confirmados no produto ou lote que será usado.

### Cafés — 20 produtos

1. Casa 01 — Chocolate e Castanhas &#x20;
2. Fruta 02 — Frutas Amarelas &#x20;
3. Cítrico 03 — Perfil Cítrico &#x20;
4. Doce 04 — Caramelo &#x20;
5. Floral 05 — Perfil Floral &#x20;
6. Cacau 06 — Cacau e Especiarias &#x20;
7. Clássico 07 — Perfil Equilibrado &#x20;
8. Intenso 08 — Perfil para Espresso &#x20;
9. Leve 09 — Perfil para Filtro &#x20;
10. Doce da Casa — Blend da Marca &#x20;
11. Lote da Estação 01 &#x20;
12. Lote da Estação 02 &#x20;
13. Microlote Experimental 01 &#x20;
14. Microlote Experimental 02 &#x20;
15. Descafeinado da Casa &#x20;
16. Blend para Espresso &#x20;
17. Blend para Coado &#x20;
18. Café para Cold Brew &#x20;
19. Café de Torra Clara &#x20;
20. Café de Torra Média

### Drip coffee — 8 produtos

21. Drip Coffee Casa 01 &#x20;
22. Drip Coffee Fruta 02 &#x20;
23. Drip Coffee Cítrico 03 &#x20;
24. Drip Coffee Doce 04 &#x20;
25. Drip Coffee Clássico 07 &#x20;
26. Drip Coffee Descafeinado &#x20;
27. Kit Degustação Drip &#x20;
28. Refil Drip Coffee

A quantidade de sachês ou porções por caixa será definida no cadastro e deverá corresponder ao produto fotografado e descrito.

### Métodos e equipamentos — 6 produtos

29. Coador V60 — tamanho e material a confirmar &#x20;
30. Prensa Francesa — capacidade e material a confirmar &#x20;
31. Cafeteira Italiana — capacidade a confirmar &#x20;
32. Coador de Pano Reutilizável — tamanho e composição a confirmar &#x20;
33. Balança Digital para Café — especificações a confirmar &#x20;
34. Moedor Manual — capacidade e ajustes a confirmar

### Acessórios — 8 produtos

35. Filtros de Papel para V60 &#x20;
36. Filtros de Papel para Cafeteira &#x20;
37. Servidor de Café &#x20;
38. Colher Dosadora &#x20;
39. Pote Hermético para Café &#x20;
40. Caneca Ponto de Torra &#x20;
41. Copo Térmico &#x20;
42. Escova de Limpeza para Moedor

Compatibilidade, capacidade, material e quantidade por embalagem deverão ser preenchidos com dados confirmados.

### Kits — 8 produtos

43. Primeiro Coado — café e método de entrada &#x20;
44. Ritual V60 — café, coador e filtros compatíveis &#x20;
45. Ritual Prensa — café e prensa francesa &#x20;
46. Espresso em Casa — café adequado ao equipamento especificado &#x20;
47. Cold Brew em Casa — café e acessórios compatíveis &#x20;
48. Kit Degustação da Casa — seleção de perfis de café &#x20;
49. Kit Presente Pequeno — composição a definir &#x20;
50. Kit Presente Completo — composição a definir

Cada kit deve listar os itens incluídos. Seu estoque precisa considerar a disponibilidade dos componentes para evitar a venda de uma combinação incompleta.

---

## 6. Variantes, preços, imagens e estoque

### Variantes

Nos cafés, as opções previstas são:

- Peso: 250 g, 500 g e 1 kg, quando o fornecedor oferecer esses formatos.
- Forma: em grãos ou moído.
- Moagem: espresso, moka, filtro/coado e prensa francesa, quando a operação permitir moagem adequada.
- SKU único para cada combinação realmente disponível.

Nos métodos e acessórios, as variantes poderão incluir tamanho, capacidade, cor ou material, somente quando existirem no item real.

A seleção de variante deve atualizar preço, estoque, SKU e imagem. Combinações inexistentes não devem aparecer.

### Fotografias reais

O usuário definiu que imagens de produto devem ser reais. Portanto:

- Não utilizar imagens geradas por IA para representar produtos à venda.
- Usar fotografias próprias, de fornecedor ou licenciadas, com permissão de uso.
- A imagem deve corresponder ao produto e à variante cadastrados.
- Não usar fotografia de marca de terceiros como se fosse produto Ponto de Torra.
- Se a embalagem for exclusiva da marca conceitual, fotografar um protótipo físico e identificar o projeto como conceitual no portfólio.

### Preços

- Pesquisar valores atuais de fornecedores e de produtos comparáveis quando o catálogo for implementado.
- Não apresentar preço estimado como preço real.
- Registrar a data e a fonte do preço de referência.
- Confirmar os valores finais com custo do produto, embalagem, taxas, impostos, frete e margem antes de qualquer operação comercial.

### Estoque

- O painel pode conter estoque demonstrativo não zerado para mostrar as funções.
- Esses números não representam estoque físico e não devem ser divulgados como disponibilidade real.
- O projeto precisa identificar o portfólio como demonstração se não houver operação comercial.

---

## 7. Estrutura da loja

### Páginas públicas

- **Início:** apresentação da marca, cafés em destaque, guia “comece por aqui”, categorias, kits e receitas.
- **Cafés:** listagem com filtros e informações confirmadas.
- **Drip coffee:** produtos individuais, caixas e kits.
- **Métodos e equipamentos.**
- **Acessórios.**
- **Kits e presentes.**
- **Busca.**
- **Página de produto.**
- **Carrinho.**
- **Checkout.**
- **Guia de moagem.**
- **Guia de preparo.**
- **Sobre a marca.**
- **Perguntas frequentes.**
- **Contato.**
- **Políticas de privacidade, cookies, entrega, pagamento, troca e devolução.**

### Busca e filtros

- Perfil sensorial confirmado.
- Intensidade ou torra, se houver dado definido.
- Método recomendado.
- Peso.
- Em grãos, moído ou drip coffee.
- Preço.
- Disponibilidade.
- Ordenação por relevância, menor preço ou maior preço.

O conteúdo deve explicar que moagem e preparo influenciam o resultado e que a percepção sensorial varia entre pessoas.

---

## 8. Jornada de compra

1. Cliente acessa uma categoria, busca ou recomendação.
2. Compara produto, peso, moagem e método.
3. Seleciona a variante.
4. Consulta disponibilidade e frete pelo CEP.
5. Adiciona o produto ao carrinho.
6. Revê variantes, quantidades, valores e frete.
7. Informa dados necessários à entrega.
8. Seleciona o meio de pagamento.
9. Recebe confirmação e estado do pedido.
10. A equipe atualiza o pedido pelo painel.

O carrinho deve persistir durante a navegação e após recarregamento. Erros de estoque ou pagamento devem ser apresentados de modo claro e orientar o cliente sobre o próximo passo.

---

## 9. Tecnologias

| Camada                  | Escolha definida                            |
| ----------------------- | ------------------------------------------- |
| Aplicação               | SvelteKit com TypeScript                    |
| Hospedagem              | Netlify                                     |
| Adaptador de publicação | Adaptador oficial do SvelteKit para Netlify |
| Banco de dados          | Supabase PostgreSQL                         |
| Autenticação            | Supabase Auth                               |
| Imagens e arquivos      | Supabase Storage                            |
| Pagamento               | Asaas                                       |
| Frete                   | Frenet                                      |
| Repositório             | GitHub                                      |

A Netlify documenta a publicação de projetos SvelteKit com o adaptador correspondente e o uso de Netlify Functions para endpoints.  O Supabase mantém uma orientação específica para SvelteKit; autenticação com renderização no servidor deve usar o fluxo compatível com sessões em cookies.&#x20;

Planos gratuitos podem ter limites e condições que mudam. Esses detalhes devem ser verificados na implementação. Uma demonstração de portfólio não deve ser apresentada como uma operação comercial com disponibilidade garantida.

---

## 10. Painel administrativo intermediário

O painel será mais analítico que o da Fio de Varanda, mas menos complexo que o previsto para a terceira loja.

### Dashboard

- Vendas por período.
- Número de pedidos.
- Ticket médio.
- Gráfico de vendas por dia ou mês.
- Pedidos agrupados por status.
- Produtos e categorias mais vendidos.
- Produtos com estoque baixo.
- Uso de cupons.
- Filtro de período.
- Exportação de relatório simples em CSV.

Não exibir indicadores como taxa de conversão, recompra ou desempenho de campanha sem instrumentação e dados suficientes. Dados simulados devem ser identificados.

### Operações do painel

- Acesso protegido para administradores.
- Criar, editar, consultar e arquivar produtos.
- Gerenciar categorias, descrições e imagens.
- Gerenciar variantes, SKU, preço, estoque, peso e dimensões.
- Administrar pedidos e atualizar status.
- Consultar dados necessários ao atendimento.
- Criar cupons simples.
- Gerenciar receitas, perguntas frequentes e conteúdo institucional.
- Consultar alterações de estoque, preço e status do pedido.
- Exportar pedidos e relatórios básicos.

**Não incluir:** previsão de vendas, automação complexa de marketing, programa de fidelidade, segmentação avançada ou análise de coortes.

---

## 11. Dados e estrutura do banco

O banco deverá contemplar:

- **Produtos:** nome, slug, descrição, categoria, status, informações técnicas, origem confirmada, SEO e imagens.
- **Variantes:** peso, moagem, SKU, preço, estoque e imagens.
- **Categorias:** nome, slug, descrição, imagem e ordenação.
- **Clientes:** dados necessários à compra e ao atendimento.
- **Pedidos:** cliente, itens, valores no momento da compra, endereço, envio, pagamento, status e datas.
- **Itens do pedido:** produto, variante, quantidade e preço registrados na compra.
- **Kits:** composição e disponibilidade calculada a partir dos componentes.
- **Cupons:** código, regras, validade, limites e estado.
- **Movimentações de estoque:** variante, quantidade, motivo e data.
- **Conteúdo:** páginas, receitas, guias e perguntas frequentes.

O pedido deve preservar o nome, SKU, variante e preço registrados no momento da compra, mesmo que o catálogo mude depois.

---

## 12. Asaas e Frenet

### Asaas

- Começar pelo ambiente de sandbox e por uma página de Checkout hospedada pelo Asaas.
- Criar o Checkout no servidor, associando-o ao pedido por `externalReference`.
- Nunca expor a chave da API ou o token de autenticação de webhook no navegador.
- Recalcular no servidor o valor, desconto, quantidade e estoque antes de criar o Checkout.
- Confirmar pagamentos por webhook autenticado; redirecionamentos do navegador não comprovam pagamento.
- Processar webhooks com idempotência, considerando reentregas e eventos fora de ordem.
- Exibir estados: pendente, aprovado, recusado, cancelado, expirado e estornado.

### Frenet

- Calcular opções com CEP de origem/destino, valor declarado, peso e dimensões cadastradas.
- Fazer a cotação no servidor com o token do cliente e Partner Token mantidos em segredo.
- Exibir preço e prazo estimado antes da finalização e revalidar o serviço escolhido.
- Confirmar com a Frenet o endpoint HTTPS e o processo de homologação antes de enviar tokens ou dados de clientes.
- Não afirmar que há etiqueta, postagem ou rastreio ativos sem integração configurada e testada.

### Checkout

- O servidor é a fonte confiável dos preços, descontos, estoque e frete.
- Não confiar em totais enviados pelo navegador sem recálculo.
- Impedir a compra de variantes sem estoque.
- Mostrar resumo do pedido antes do pagamento.
- Identificar transações de teste como demonstrativas.

---

## 13. Segurança, acessibilidade e desempenho

### Segurança e privacidade

- Manter segredos em variáveis de ambiente no servidor.
- Proteger rotas administrativas.
- Separar permissões públicas e administrativas no banco.
- Validar dados no servidor.
- Não armazenar dados de cartão.
- Coletar somente dados necessários à compra.
- Limitar tentativas de login e proteger alterações sensíveis.
- Incluir política de privacidade.
- Não publicar tokens, credenciais ou dados reais no repositório.

### Acessibilidade e desempenho

- Foco visível e navegação por teclado.
- Campos com rótulos e erros compreensíveis.
- Não transmitir estado apenas pela cor.
- Imagens otimizadas e com dimensões definidas.
- Texto alternativo que descreva a imagem.
- Carregamento progressivo de imagens fora da área inicial.
- Fontes limitadas aos pesos usados.
- Navegação e compra utilizáveis em celular e sem depender de animações.

### SEO

- URLs próprias para produtos, categorias e receitas.
- Título e descrição únicos por página.
- Metadados para compartilhamento.
- Sitemap e `robots.txt`.
- Dados estruturados de produto somente quando os dados forem válidos.

---

## 14. Critérios de aceite

A loja estará pronta quando:

1. Houver exatamente 50 produtos cadastrados nas cinco categorias.
2. Cada produto tiver descrição, variante e imagem real autorizada correspondente.
3. As variantes atualizarem preço, SKU, estoque, peso e moagem corretamente.
4. Kits respeitarem o estoque dos itens que os compõem.
5. Os cards exibirem título e preço completos em desktop e celular.
6. Busca, filtros, ordenação e carrinho funcionarem.
7. O checkout validar os dados no servidor.
8. O Asaas estiver validado em sandbox ou identificado como demonstração.
9. A Frenet estiver testada ou identificada como pendente de homologação/configuração.
10. O painel gerenciar catálogo, variantes, pedidos, estoque, cupons e conteúdo.
11. O dashboard apresentar os indicadores intermediários definidos.
12. Imagens, preços e estoques demonstrarem corretamente se são reais ou demonstrativos.
13. Não houver credenciais expostas.
14. Loja e painel forem revisados em celular, teclado e estados de erro.

---

## 15. Fora do escopo

- WordPress e WooCommerce.
- Venda real antes da definição de fornecedor, preço, estoque, políticas e credenciais.
- Imagens de produto geradas por IA.
- Alegações não confirmadas sobre origem, certificações, avaliação ou produção.
- Assinatura recorrente de café.
- Programa de fidelidade.
- ERP, marketplace ou automações avançadas.
- Dashboard avançado, reservado à terceira loja própria.

---

## 16. Ordem de execução

1. Verificar disponibilidade do nome e finalizar a logo.
2. Definir se o catálogo será de produtos reais de fornecedor ou de demonstração conceitual.
3. Confirmar fornecedores, especificações, variantes, preços e estoque.
4. Obter fotografias reais e permissões de uso.
5. Fechar design system e linguagem visual dos cards.
6. Implementar páginas públicas e conteúdo editorial.
7. Criar banco, autenticação e painel intermediário.
8. Implementar catálogo, variantes, kits e controle de estoque.
9. Implementar carrinho, checkout, Asaas e Frenet em modo de teste.
10. Revisar segurança, responsividade, acessibilidade, SEO e desempenho.
11. Publicar a demonstração e documentar limitações para uso comercial.

**Resumo da definição:** Ponto de Torra será uma loja de cafés especiais com identidade gráfica urbana, catálogo de 50 produtos, fotografias reais autorizadas, painel intermediário e arquitetura SvelteKit com TypeScript. O refinamento dos cards seguirá o padrão geral do portfólio, com nome e preço centralizados em linhas separadas, mantendo uma composição visual exclusiva para esta marca.
