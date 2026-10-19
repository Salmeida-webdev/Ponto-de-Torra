# Backend — Ponto de Torra

## Decisões aprovadas

- Projeto Supabase novo e isolado dos projetos das outras lojas.
- PostgreSQL, Auth e Storage do Supabase.
- Asaas para checkout/pagamento.
- Frenet para cotação e operações de frete.
- Aplicação SvelteKit hospedada na Netlify.
- A loja continua em modo de portfólio até que catálogo, fotos, fornecedores, preços, estoque, políticas e credenciais reais sejam confirmados.

## Modelo de dados inicial

A migration `supabase/migrations/20261019000000_initial_schema.sql` prepara categorias, produtos, variantes/SKUs, imagens, funcionários e papéis, pedidos e itens com snapshots, reservas, movimentações, pagamentos e eventos de webhook, remessas, cupons, componentes de kits, conteúdo e auditoria administrativa.

Valores monetários são guardados em centavos. Estoque físico e estoque reservado ficam separados. Nenhum preço, endereço, total ou estoque enviado pelo navegador será considerado fonte confiável.

## Fluxo transacional previsto

1. O servidor valida o carrinho, consulta preços e disponibilidade no Supabase e calcula descontos.
2. O servidor valida o CEP e recalcula a cotação escolhida na Frenet com pesos e dimensões cadastrados.
3. Em uma operação transacional, cria pedido e snapshots dos itens; a função `reserve_order_stock` reserva as unidades sem permitir saldo negativo nem overselling concorrente.
4. O servidor cria um Checkout Asaas e relaciona o ID ao pedido por `externalReference`; o pedido continua pendente.
5. Um webhook Asaas autenticado e idempotente consulta/valida o estado financeiro. Só o evento confiável de pagamento aprovado converte reserva em baixa definitiva e libera o processamento do pedido.
6. Falha, expiração ou cancelamento libera a reserva uma única vez. Estorno não recompõe estoque até a conferência física da devolução.
7. A operação de expedição registra serviço, etiqueta e rastreio Frenet apenas quando a API confirmar esses recursos.

O callback de sucesso no navegador nunca confirma pagamento. Webhooks podem ser repetidos ou chegar fora de ordem, portanto o processamento precisa ser idempotente e validar pedido, valor, moeda e identificadores no servidor.

## Integrações e credenciais

O `.env.example` contém apenas nomes de variáveis, sem valores secretos. `SUPABASE_SECRET_KEY`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN` e os dois tokens Frenet devem existir somente no ambiente de servidor/Netlify. Nunca usar prefixo `PUBLIC_` para esses segredos.

O Asaas documenta Checkout hospedado com Pix e cartão, associação por `externalReference` e confirmação por webhooks. A criação do Checkout ou o redirecionamento não significa que houve pagamento.

A documentação de autenticação da Frenet exige Token do cliente e Partner Token. A referência atual da cotação expõe um endereço HTTP; por segurança, nenhum token ou dado de cliente será enviado antes de a Frenet confirmar um endpoint HTTPS de homologação e fornecer o Partner Token correspondente. O token de produção depende do processo de homologação da Frenet.

## Contrato de endpoints a implementar

| Método e rota | Acesso | Responsabilidade |
|---|---|---|
| `POST /api/shipping/quotes` | Público, limitado por IP | Recebe CEP e variantes/quantidades; recalcula cubagem/preço no servidor; retorna opções Frenet com prazo e validade curta. |
| `POST /api/orders` | Público, protegido contra abuso | Valida campos; refaz totais e frete; cria pedido idempotente; reserva estoque; cria Checkout Asaas; responde somente com número do pedido e URL de pagamento. |
| `POST /api/webhooks/asaas` | Webhook autenticado | Deduplica evento; confirma estado e valor; atualiza pagamento/pedido e executa a baixa de estoque uma única vez. |
| `GET /api/admin/*` e `POST/PATCH /api/admin/*` | Funcionário autenticado | CRUD de catálogo/conteúdo/cupons, estoque auditável e operações de pedido; autorização checada no servidor e reforçada por RLS. |

## Pontos ainda pendentes antes da aplicação remota

1. Criar um projeto Supabase separado na organização escolhida, definir região e revisar o custo que o painel da Supabase cotar.
2. Confirmar se será usado sandbox do Asaas e obter credencial de API/webhook.
3. Obter da Frenet conta/tokens de homologação, Partner Token e URL HTTPS.
4. Aplicar a migration no projeto novo, verificar advisors de segurança/performance e gerar tipos TypeScript.
5. Implementar e testar autenticação admin, endpoints, webhook, baixa final de estoque e expiração automática de reservas.
6. Validar integração E2E em sandbox antes de qualquer mudança para produção.

## Status desta entrega

A migration e o contrato inicial estão preparados no repositório. Nenhum projeto/banco remoto foi criado ou alterado, nenhuma credencial foi recebida e as rotas de integração ainda não estão implementadas. O checkout do site permanece demonstrativo.
