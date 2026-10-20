# Backend — Ponto de Torra

## Decisões

- Uma única base Supabase dedicada à loja; Postgres, Auth, Storage, Row Level Security e Vault.
- Asaas para pagamentos, inicialmente em sandbox.
- Melhor Envio para cotação em produção; compra de etiquetas permanece desativada nesta etapa.
- Frontend SvelteKit na Netlify.
- O site permanece como portfólio até confirmar catálogo comercial, fotos, medidas, preços, estoque, políticas e credenciais.

## Dados e segurança

As migrations preparam catálogo e variantes, papéis de equipe, pedidos e snapshots, estoque e reservas, pagamentos, eventos de webhook, remessas, cupons, conteúdo e auditoria. Valores monetários são centavos; o estoque físico é separado das unidades reservadas.

RLS está habilitado nas tabelas expostas. RPCs `SECURITY DEFINER` de pedido, estoque, tokens OAuth e rate limit têm execução restrita a `service_role`. Access e refresh tokens da Melhor Envio são armazenados no Vault, nunca no navegador nem em texto plano numa tabela pública. Preços, CEP, dimensões e estoque são lidos do servidor.

## Pedido, estoque e frete

1. O backend valida variantes e quantidades pelo catálogo e estoque disponível.
2. A Edge Function de cotações pede CEP, calcula dimensões e envia produtos com preço de seguro à API oficial Melhor Envio.
3. A opção cotada é salva por dez minutos, vinculada a um fingerprint do carrinho, CEP, serviço, transportadora, preço e prazo.
4. A criação do pedido consome uma opção não expirada e não usada. O trigger do banco verifica que o CEP do endereço coincide com o CEP cotado; um RPC transacional calcula os preços do banco e reserva estoque sem overselling.
5. O backend cria a cobrança/checkout Asaas. O redirecionamento do navegador não confirma pagamento.
6. Um webhook autenticado e idempotente consulta e valida status, pedido e valor. Só a confirmação real de pagamento converte a reserva em baixa única de estoque.
7. Depois da aprovação do pagamento, a operação cria e acompanha a remessa Melhor Envio; falhas/cancelamentos liberam reservas segundo a política de estoque.

## Endpoints Supabase

| Edge Function | Acesso | Responsabilidade |
|---|---|---|
| `melhor-envio-oauth-start` | JWT de administrador | Gera state de uso único e inicia o OAuth. |
| `melhor-envio-oauth-callback` | Callback público de OAuth | Consome state e grava tokens rotacionáveis no Vault. |
| `melhor-envio-quotes` | Público, rate limit | Calcula opções usando catálogo e endereço cotado no servidor. |
| `asaas-create-checkout` | Pública, configuração validada antes de qualquer gravação | Cria pedido e reserva, gera Checkout PIX/cartão, persiste o ID retornado pelo Asaas e usa URL oficial de Checkout. Recusa produto sem imagem principal no Storage. |
| `asaas-webhook` | Pública, protegida por `asaas-access-token` | Registra eventos, reivindica cada ID atomicamente, recupera a associação pelo `externalReference` quando o evento chega antes de o ID ser salvo e confirma pagamento/baixa ou libera reserva. |
| etiqueta, rastreio e cancelamento | Pendente | Executa ciclo logístico após o pedido ser pago. |

## Configuração e estado

As variáveis e os passos para criar o app estão em `docs/CONFIGURACAO-MELHOR-ENVIO.md` e `.env.example`. Segredos devem ser definidos em Supabase Edge Function Secrets. O projeto ativo é `Ponto de Torra` (`ujmjeizvektvctfrlgia`) e a nova migração mantém uma única base.

O estado remoto foi consultado em 20/10/2026. O Supabase está saudável, mas as Edge Functions Asaas publicadas ainda não incluem estas correções e as duas novas migrations locais ainda não foram aplicadas. A homologação do Checkout permanece pendente.

## Checkout Asaas (sandbox)

`POST /functions/v1/asaas-create-checkout` recebe `idempotency_key`, `shipping_quote_option_id`, `customer`, `shipping_address` e itens `{ variant_id, quantity }`. O cliente não escolhe preço, total, link do Asaas ou situação do pagamento. O servidor calcula o fingerprint do carrinho, chama `create_order_and_reserve`, monta itens com snapshots do banco e só envia o checkout quando cada produto tiver imagem principal acessível no bucket `product-images`. A API atual do Asaas exige `imageBase64` nos itens.

O Sandbox é o padrão (`ASAAS_API_BASE_URL=https://api-sandbox.asaas.com/v3`) e o Checkout usa PIX e cartão à vista. `PUBLIC_SITE_URL` precisa ser uma origem HTTPS pública. A função valida essa origem e o domínio oficial da API antes de gravar pedido ou reserva, gera os três callbacks em `/checkout/retorno` e envia um `User-Agent` que identifica a aplicação. A resposta prioriza o link do Asaas quando o domínio e o ID da sessão são válidos; o fallback segue o formato `checkoutSession/show?id=...`. O redirecionamento do navegador não confirma pagamento.

Se a requisição ao Asaas expirar depois de ser enviada, o backend mantém o pedido e a reserva para evitar criar uma sessão duplicada. Um evento autenticado com `externalReference` pode associar o Checkout quando chega antes de o ID ser salvo. Se nenhum evento chegar, ainda é necessária reconciliação operacional; a referência do Asaas consultada não oferece leitura de Checkout por referência externa.

`POST /functions/v1/asaas-webhook` compara `ASAAS_WEBHOOK_AUTH_TOKEN` com o cabeçalho `asaas-access-token`. `CHECKOUT_PAID` chama `commit_order_stock`; cancelamento/expiração chama a liberação da reserva. Cada evento é reivindicado atomicamente pelo ID, com retomada após dez minutos se um processamento for interrompido. Use token com pelo menos 32 caracteres, sem espaços e diferente da API key.
