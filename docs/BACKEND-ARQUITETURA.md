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
| `asaas-create-checkout` | Ativa no Supabase (v4) | Cria pedido e reserva, gera checkout PIX/cartão no Sandbox, persiste link e impede duplicidade por pedido. Recusa produto sem imagem principal no Storage; aceita origem local para testes. |
| `asaas-webhook` | Ativa no Supabase (v3) | Valida `asaas-access-token`, deduplica por ID de evento e confirma pagamento/baixa ou libera reserva. |
| etiqueta, rastreio e cancelamento | Pendente | Executa ciclo logístico após o pedido ser pago. |

## Configuração e estado

As variáveis e os passos para criar o app estão em `docs/CONFIGURACAO-MELHOR-ENVIO.md` e `.env.example`. Segredos devem ser definidos em Supabase Edge Function Secrets. O projeto ativo é `Ponto de Torra` (`ujmjeizvektvctfrlgia`) e a nova migração mantém uma única base.

O backend de cotação está preparado e ativo no Supabase (v14); sua execução depende do app OAuth da Melhor Envio, CEP de origem, User-Agent e credenciais configuradas. Checkout e webhook Asaas estão ativos no Supabase Sandbox; o responsável confirmou o token do webhook e o pepper de rate limit. Ainda faltam catálogo/imagens e testes integrados locais. Etiquetas e rastreio seguem pendentes; não abrir vendas antes desses testes.

## Checkout Asaas (sandbox)

`POST /functions/v1/asaas-create-checkout` recebe `idempotency_key`, `shipping_quote_option_id`, `customer`, `shipping_address` e itens `{ variant_id, quantity }`. O cliente não escolhe preço, total, link do Asaas ou situação do pagamento. O servidor calcula o fingerprint do carrinho, chama `create_order_and_reserve`, monta itens com snapshots do banco e só envia o checkout quando cada produto tiver imagem principal acessível no bucket `product-images`. A API atual do Asaas exige `imageBase64` nos itens.

O pagamento permanece em Sandbox (`ASAAS_API_BASE_URL=https://api-sandbox.asaas.com/v3`) e usa PIX e cartão à vista. A resposta retorna `checkout_url`; o redirecionamento do navegador não altera o pedido. Se a chamada à API expirar sem resposta, a função mantém a trava e não cria outra sessão automaticamente para evitar duplicidade; a reconciliação manual ainda precisa ser definida.

`POST /functions/v1/asaas-webhook` compara `ASAAS_WEBHOOK_AUTH_TOKEN` com o cabeçalho `asaas-access-token`. `CHECKOUT_PAID` chama `commit_order_stock`; cancelamento/expiração chama a liberação da reserva. Eventos repetidos são deduplicados por `(provider, provider_event_id)`. Use token com pelo menos 32 caracteres, sem espaços e diferente da API key.
