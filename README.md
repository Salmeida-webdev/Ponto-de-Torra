# Ponto de Torra · front da loja e painel

Vitrine conceitual de cafés especiais, drip coffee, métodos, acessórios e kits, com primeira versão visual do painel administrativo.

## Estado desta etapa

- 50 produtos distribuídos nas cinco categorias do briefing.
- Busca, filtros demonstrativos, ordenação, páginas de produto e carrinho persistido no navegador.
- Checkout visual sem coleta de dados, criação de pedido, pagamento ou frete.
- Painel visual em `/painel`, com dashboard, catálogo, estoque, pedidos, cupons, conteúdo e histórico usando somente dados ilustrativos locais.
- Filtro de período no dashboard, busca local na tabela de pedidos e exportação de uma pequena amostra CSV ilustrativa.
- Edição demonstrativa de pedido com mudança de status, transportadora e rastreio; a mudança permanece somente na página aberta.
- Aba de estoque com registro local de entradas e histórico ilustrativo de saídas automáticas relacionadas a pedidos pagos. No backend, haverá reserva atômica na abertura do checkout, baixa na confirmação do pagamento e liberação em cancelamento/expiração.
- Bloco de atenção operacional com sugestões condicionadas a estoque, pagamentos pendentes e uso de cupons, todas identificadas como amostras.
- Imagens conceituais fotorealistas geradas para os 50 produtos, em um padrão comum de catálogo, documentadas em [`docs/IMAGENS-E-CREDITOS.md`](docs/IMAGENS-E-CREDITOS.md).
- Produtos, preços, apresentações e disponibilidade são dados fictícios de portfólio. As imagens geradas ilustram os produtos conceituais e não comprovam itens físicos, embalagens ou lotes.
- O painel não possui autenticação nem grava alterações. Banco de dados, acesso protegido, integrações, domínio e publicação pertencem às próximas etapas.

## Executar localmente

Requer Node.js 24 e npm.

```bash
npm install
npm run dev
```

Para validar e compilar:

```bash
npm run check
npm run build
```

O projeto usa SvelteKit, TypeScript e o adaptador oficial da Netlify. Nenhuma credencial ou serviço externo é necessário para visualizar o front.

## Extrair no Windows

Depois de baixar `Ponto-de-Torra-Frontend.zip` para a pasta Downloads, execute no PowerShell:

```powershell
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\Ponto-de-Torra-Frontend.zip" -DestinationPath "$env:USERPROFILE\Downloads\Ponto-de-Torra" -Force
```

Em seguida:

```powershell
Set-Location "$env:USERPROFILE\Downloads\Ponto-de-Torra"
npm install
npm run dev
```

## Conteúdo

- `docs/BRIEFING-ORIGINAL.md` — briefing fornecido para a loja e escopo de produtos.
- `docs/IDENTIDADE-VISUAL.md` — paleta, tipografia, marca e tratamento das imagens.
- `src/routes/` — páginas públicas e o painel visual em `/painel`.
- `src/lib/data/products.ts` — catálogo demonstrativo com 50 itens.
- `src/lib/stores/cart.ts` — carrinho local de demonstração.
- `static/images/products/` — imagens conceituais de produto otimizadas.
- `static/images/credits.json` e `src/lib/data/photo-credits.json` — manifesto legível no site e no código.
- `scripts/fetch_product_photos.py` — utilitário legado para obtenção/otimização de fotografias licenciadas; as imagens atuais foram geradas para esta vitrine.
- `docs/IMAGENS-E-CREDITOS.md` — relação de cada nome de arquivo, produto, fonte e licença.
- `docs/PERFORMANCE.md` — medidas do build e limites das verificações executadas.

## Painel visual

Abra `/painel` após iniciar o projeto para revisar a interface. Os dados e interações exibidos são ilustrativos: a navegação entre áreas, filtros, busca, edição de status/rastreio de pedidos e exportação da amostra funcionam no navegador; as alterações são temporárias. Os formulários completos de cadastro e edição para produtos/variantes/estoque, cupons e conteúdo, além do login e da persistência, serão definidos e conectados nas próximas etapas do painel e backend.

## Contato e rodapé

WhatsApp: `+55 83 99873-9712` (`https://wa.me/5583998739712`).

Crédito fixo no rodapé: **Desenvolvido por LMX Soluções Digitais/Segundo Almeida**.

## Domínio e publicação

O nome e o domínio precisam de confirmação pelo responsável antes da publicação. Configure o domínio e a URL canônica somente depois da validação e da compra/associação do domínio. Não há projeto de hospedagem conectado nesta etapa.
