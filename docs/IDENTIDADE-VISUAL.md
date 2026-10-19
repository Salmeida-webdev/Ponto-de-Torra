# Identidade visual — Ponto de Torra

## Direção

Uma cafeteria de origem com personalidade editorial, acolhedora e contemporânea. A interface usa espaço, textura fotográfica e tipografia legível para valorizar o ritual do café. Evita cores fluorescentes, títulos comprimidos em caixa alta e enquadramentos com cantos rígidos.

## Paleta

| Papel | Cor | Uso |
|---|---|---|
| Papel | `#F7F3ED` | Fundo principal |
| Tinta | `#30241E` | Texto e fundos escuros |
| Café | `#694533` | Ações, links e elementos de marca |
| Barro | `#955038` | Ênfase editorial e foco |
| Areia | `#EADFCF` | Áreas de apoio e destaque suave |
| Sálvia | `#77816D` | Acentos discretos |
| Texto secundário | `#76685E` | Descrições e metadados |

## Tipografia

- Títulos: Georgia ou serifas locais equivalentes, com peso regular e caixa natural.
- Texto e interface: sistema sem serifa (`Segoe UI`, `system-ui`), sem carregar fontes de terceiros.
- Rótulos: mesma família da interface, caixa alta moderada e espaçamento amplo; sem aparência de código/terminal.

## Marca

O símbolo autoral simplifica um grão de café e acompanha o nome em duas escalas. `static/logo.svg` é a versão para fundos claros; `static/logo-light.svg` atende o rodapé escuro. `static/favicon.svg` reduz o símbolo sem o nome. O arquivo social `static/social-card.svg` usa a mesma paleta e tipografia. Manter proporção, respiro e cores originais; não distorcer nem inserir em fundos de baixo contraste.

## Imagens e cartões

- Hero: composição ampla e assimétrica, fotografia conceitual em moldura arredondada e legenda transparente.
- Produto: cartões com fundo claro, borda fina, sombra discreta e foto com raio arredondado. A proporção de catálogo 4:3 mantém os produtos inteiros e evita a grade de quadrados rígidos.
- Mobile: catálogo em uma coluna; títulos e preços centralizados, com o preço imediatamente abaixo do nome.
- Categorias, produto, sobre e carrinho usam o mesmo sistema de cantos suaves.
- As imagens atuais são conceituais fotorealistas geradas por IA, correspondem ao tipo de produto descrito e seguem uma direção visual comum. Elas não representam itens físicos, embalagens ou lotes. O catálogo e os arquivos estão documentados em `IMAGENS-E-CREDITOS.md`.

## Acessibilidade e desempenho visual

- Contrastes de texto principais revisados para manter legibilidade na paleta.
- Indicador de foco visível preservado com a cor barro.
- Respeito a `prefers-reduced-motion` mantido.
- Fontes do sistema e imagens locais evitam dependência de serviços externos; fotos fora da dobra carregam sob demanda.
