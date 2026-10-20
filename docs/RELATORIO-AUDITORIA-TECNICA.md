# Auditoria técnica — Ponto de Torra

**Data:** 20/10/2026
**Escopo:** código local disponível nesta cópia, contrato oficial Asaas via MCP, estado remoto do Supabase, logs filtrados do Checkout e assessores do banco.
**Limites:** nenhuma cobrança, migration, secret, configuração remota, deploy, commit ou push foi alterado. O MCP Asaas desta sessão forneceu documentação, mas não tinha o esquema `access_token` para consultar a conta Asaas.

## Diagnóstico do pagamento

Os logs do Supabase mostram a sequência real das falhas:

| Horário UTC em 20/10 | Evidência | Interpretação |
|---|---|---|
| 00:43 | `PUBLIC_SITE_URL` ausente | A função não tinha a origem necessária para montar os callbacks. |
| 00:50 e 00:55 | HTTP 400: Checkout desabilitado, chave Pix ausente e `callback` obrigatório | Bloqueios cadastrais e de configuração naquela tentativa. Depois disso, Segundo informou que a conta estava aprovada e a chave Pix estava ativa. |
| 01:09 | `PUBLIC_SITE_URL` rejeitada por não ser HTTPS | O segredo estava ausente ou inválido naquela execução. |
| 01:12, 01:25 e 02:13 | HTTP 400: `successUrl`, `cancelUrl` e `expiredUrl` inválidas | O erro persistente mais recente era a rejeição das URLs de retorno. |

O código publicado no Supabase ainda era a versão 11 de `asaas-create-checkout`: podia omitir `callback`, não enviava `User-Agent` e montava o fallback do Checkout no formato antigo. A rota pública `/checkout/retorno` havia retornado HTTP 404 em uma verificação anterior, enquanto o código local contém essa rota. **Inferência de causa:** as URLs apontavam para uma rota ainda inexistente na publicação vigente; isso é compatível com a rejeição dos três callbacks. A causa precisa ser confirmada quando a rota atual estiver publicada e acessível.

O MCP oficial confirmou que o Checkout exige `billingTypes`, `chargeTypes`, `callback` e `items`; orienta usar URLs reais, construir o link com o ID retornado e confirmar pagamento por `CHECKOUT_PAID`, nunca pelo redirect. A referência atual demonstra `https://asaas.com/checkoutSession/show?id=...`. A API também retorna um campo `link`; o código agora o prioriza quando o host e o ID correspondem ao ambiente e à sessão.

## Correções feitas nesta cópia

- **Checkout Asaas:** valida `PUBLIC_SITE_URL` como origem HTTPS pública e permite somente os endpoints oficiais de Sandbox ou Produção antes de qualquer gravação no banco. Gera os três callbacks com `URL`/`URLSearchParams`, envia `User-Agent`, melhora a mensagem de HTTP 401 e não devolve descrições arbitrárias do provedor ao comprador.
- **Link de pagamento:** aceita o link do Asaas somente em `asaas.com` ou `sandbox.asaas.com`, no ambiente correto e com o ID da sessão correspondente; o fallback usa o formato atual documentado.
- **Webhook:** valida os tipos dos campos recebidos, reivindica cada ID de evento por função atômica no banco e recupera o vínculo do pagamento com `externalReference` quando o webhook chega antes da gravação do ID do Checkout.
- **CORS e painel:** configuração CORS inválida não derruba as funções; preflight HTTP 204 não envia corpo. As funções de estoque e envio usam os helpers compartilhados de autenticação e CORS.
- **Saldo de produtos:** variantes novas começam com zero. O formulário de catálogo não grava saldo; o estoque é movimentado pela aba Estoque e pelo fluxo auditável.
- **Permissões de banco:** migration local restringe gravação direta de pedidos, pagamentos, envios, eventos e tabelas de estoque. Para `product_variants`, usuários autenticados recebem apenas gravação de campos de catálogo, sem permissão para alterar saldo. A migration também revoga `TRUNCATE` para os papéis expostos.
- **Histórico de migrations:** comparei os SQLs locais com as instruções armazenadas no histórico remoto. Cinco arquivos tinham nome ou versão local divergente apesar do SQL equivalente; renomeei-os para coincidir com o histórico aplicado. As duas migrations novas permanecem depois da última versão remota.
- **Documentação:** atualizei `docs/BACKEND-ARQUITETURA.md` e registrei este relatório.

## Estado remoto observado

- O projeto Supabase `Ponto de Torra` está `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- O banco tinha 14 migrations aplicadas até `20261020020919_sync_order_payment_status_on_release`. As migrations locais `20261020120000_secure_order_stock_direct_writes`, `20261020120100_claim_asaas_webhook_events` e `20261020130000_coupon_percentage_limit` ainda não estão aplicadas.
- As funções publicadas eram: `asaas-create-checkout` v11, `asaas-webhook` v6, `admin-stock-entry` v4 e `admin-update-order-shipping` v4. As quatro ainda continham o código anterior.
- A consulta somente leitura confirmou que `authenticated` possui `INSERT`, `UPDATE` e `DELETE` em `orders`, `shipments` e `product_variants`; as políticas RLS da equipe permitem essas operações. A migration local remove esse caminho direto e mantém a leitura administrativa.
- O advisor de segurança apontou **Leaked Password Protection Disabled**. Recomenda-se habilitar a proteção contra senhas comprometidas no painel Supabase.
- O advisor de performance encontrou 15 índices sem uso observado. Como a loja é recente e vários índices cobrem chaves estrangeiras e consultas futuras, não os removi.
- O banco mostra um pagamento de teste cancelado sem `provider_checkout_id` e nenhum evento de webhook registrado. Não alterei esse registro; precisa ser conferido antes de qualquer teste repetido para não deixar uma sessão ou reserva ambígua.

## Testes executados nesta cópia

| Verificação | Resultado |
|---|---|
| `npm run test:asaas-contracts` | 5 passaram; URLs, callbacks, ambientes, links e regras de cupom. |
| `npm run check` | 0 erros e 0 avisos Svelte/TypeScript do app. |
| `npm run build` | Build Netlify concluído; a rota `checkout/retorno` aparece no build. |
| Transpilação sintática das Edge Functions | 10 arquivos, 0 diagnósticos sintáticos. |
| `npm audit --offline --omit=dev` | 0 vulnerabilidades reportadas com os dados locais disponíveis. |
| SQL | Revisão manual; sem `psql`, Supabase CLI ou Deno nesta cópia para lint/execução local. |

A tentativa de abrir o servidor de preview para um teste HTTP local não foi concluída neste ambiente isolado; o processo iniciou, mas o `curl` local não conseguiu alcançá-lo. Portanto, o build comprova que a rota está incluída, mas não substitui o teste HTTP local nem o teste público depois da publicação.

## Pendências antes de considerar o Checkout pronto

1. Aplicar as três migrations locais pendentes ao Supabase depois da revisão final. Não usar `db reset` nem reaplicar migrations antigas; os nomes e conteúdos agora estão alinhados com o histórico remoto.
2. Publicar as Edge Functions atualizadas somente junto da próxima janela de deploy aprovada.
3. Fazer uma única publicação do front e confirmar HTTP 200 para os três callbacks em `/checkout/retorno`; antes disso, o endereço público antigo pode continuar respondendo 404.
4. Conferir no painel Asaas se os eventos `CHECKOUT_CREATED`, `CHECKOUT_PAID`, `CHECKOUT_CANCELED` e `CHECKOUT_EXPIRED` apontam para a função atual e usam o mesmo token secreto. A conta Asaas não pôde ser consultada pelo MCP nesta sessão.
5. Executar um único fluxo Sandbox controlado, confirmar evento no webhook, pagamento aprovado, baixa única do estoque e atualização do pedido; repetir com cancelamento/expiração.
6. Revisar o pagamento de teste sem ID de Checkout e confirmar que não há Checkout ativo correspondente antes de limpar qualquer registro.

**Decisão de release:** código corrigido e build local aprovado; **ainda não liberado para deploy** até aplicar as migrations, publicar a rota de retorno e concluir o teste Sandbox do webhook.

## Revisão dos achados adicionais do Codex — 20/10/2026

O relatório posterior encontrou riscos adicionais e foi conferido contra os arquivos desta cópia:

- **CEP da cotação:** o achado de que a RPC não vincula o CEP é incompleto. A migration `20261019201823_melhor_envio_rate_limit_address_guard.sql` cria o trigger `orders_validate_shipping_quote_address`, que compara CEPs normalizados antes de inserir ou alterar o pedido. Como essa migration consta no histórico remoto informado, não há evidência para abrir uma correção duplicada. Convém confirmar o trigger no remoto durante a próxima verificação de schema.
- **Privilégio `TRUNCATE`:** incluída revogação explícita para `PUBLIC`, `anon` e `authenticated` na migration ainda pendente `20261020120000_secure_order_stock_direct_writes.sql`. Essa permissão não é filtrada por RLS.
- **Cupons percentuais acima de 90%:** a interface já limitava a 90%, mas a API e o banco ainda não protegiam esse limite. A validação de cupom agora usa helper compartilhado que rejeita valores fora da faixa; a função de criação do Checkout bloqueia dados percentuais inválidos antes da RPC. Foi criada a migration `20261020130000_coupon_percentage_limit.sql`, com constraint `NOT VALID`: novas gravações e alterações ficam protegidas sem bloquear a migração por dados legados. Linhas legadas acima de 90% devem ser identificadas e corrigidas (por exemplo, reduzindo o valor) antes de validar a constraint.
- **Diagnóstico da chave:** ausência de `ASAAS_API_KEY` agora retorna mensagem operacional específica e segura; o valor da chave nunca é mostrado.
- **Tamanho do token de webhook:** a função agora aceita configuração somente entre 32 e 255 caracteres, conforme o limite documentado.

Essas alterações foram feitas apenas na cópia de trabalho. As migrations não foram aplicadas ao Supabase e as Edge Functions não foram implantadas. Não há Deno, Supabase CLI ou `psql` nesta cópia; por isso a validação SQL local continua pendente. O teste de contrato ampliado e o check/build precisam ser reexecutados depois destas mudanças.

## Verificação remota somente de leitura — Supabase MCP — 20/10/2026 (estado anterior às migrations)

O projeto conectado foi consultado sem executar DDL, gravar dados, ler valores de segredos ou implantar funções. A lista remota confirmou 14 migrations, terminando em `20261020020919_sync_order_payment_status_on_release`; as três migrations locais `20261020120000`, `20261020120100` e `20261020130000` não aparecem no banco.

| Verificação remota | Resultado | Consequência |
|---|---|---|
| Trigger de validação do CEP em `orders` | Existe | O achado de cotação vinculada a CEP divergente não se confirma no banco atual. |
| Cupons percentuais acima de 90% | 0 registros | A migration nova pode ser aplicada sem corrigir cupons legados. A constraint ainda precisa ser validada depois. |
| `claim_asaas_webhook_event(text)` | Ausente | O código local atualizado do webhook não pode ser implantado antes da migration `20261020120100`. |
| Coluna `processing_started_at` | Ausente | Mesma dependência de migration do webhook. |
| `TRUNCATE` nas tabelas sensíveis | Concedido a `anon` e `authenticated` | Aplicar a migration de segurança e repetir a consulta de privilégios. |
| DML em pedidos/envios/variantes | `authenticated` ainda tem `INSERT`, `UPDATE` e `DELETE` | O caminho de escrita direta permanece até a migration de segurança ser aplicada. A política RLS não substitui o privilégio SQL. |

As Edge Functions remotas permanecem em `asaas-create-checkout` v11 e `asaas-webhook` v6. A leitura do código remoto confirmou que o Checkout ainda pode omitir o `callback`, não envia `User-Agent` e usa link de sessão no formato antigo; o webhook remoto ainda não reivindica eventos pelo RPC e não inclui a recuperação de vínculo pelo `externalReference`. Portanto, o backend atualizado no ZIP não está refletido no Supabase.

O advisor remoto mantém um aviso: **Leaked Password Protection Disabled**. O advisor de performance continua listando 15 índices sem uso observado; não removê-los sem métricas. Não consultei configurações ou cobranças da conta Asaas: o MCP do Asaas usado nesta etapa é documental, e nenhuma credencial foi lida.

### Sequência de liberação revisada

1. Corrigir o Git root para que o projeto não herde o repositório `Casa-Candeia` do diretório pai; não fazer commit/push nesse estado.
2. Confirmar backup do Supabase e aplicar, em ordem, as três migrations locais pendentes, depois reconsultar RPC, coluna, constraint e grants.
3. Implantar as Edge Functions atualizadas em conjunto com essas migrations e conferir que as versões remotas correspondem à cópia aprovada.
4. Fazer a única publicação planejada, validar os três callbacks públicos e então executar testes Sandbox controlados de pagamento, cancelamento, expiração, webhook duplicado e estoque.
5. Habilitar Leaked Password Protection e testar o fluxo de autenticação administrativa.

## Atualização de execução — Supabase MCP — 20/10/2026

Após a revisão acima, as três migrations foram aplicadas ao projeto `ujmjeizvektvctfrlgia` em sequência, usando as ferramentas oficiais do Supabase MCP. As versões registradas pelo remoto foram sincronizadas com os nomes dos arquivos locais:

| Migration | Versão registrada no remoto | Validação após aplicação |
|---|---:|---|
| `secure_order_stock_direct_writes` | `20261020122753` | Nenhum grant de `TRUNCATE` para `anon`/`authenticated`; nenhum DML direto nas tabelas protegidas; nenhuma escrita nas colunas de saldo de `product_variants`. |
| `claim_asaas_webhook_events` | `20261020122814` | Coluna e função presentes; execução concedida a `service_role` e negada a `PUBLIC`, `anon` e `authenticated`. |
| `coupon_percentage_limit` | `20261020122840` | Constraint criada como `NOT VALID`; zero cupons existentes fora da regra. A constraint continua pendente de validação formal (`VALIDATE CONSTRAINT`). |

O banco agora registra 17 migrations. As Edge Functions ainda não foram implantadas nesta atualização: `asaas-create-checkout` continua na v11 e `asaas-webhook` na v6. A próxima alteração backend requer conferir no painel apenas a presença dos nomes de segredos necessários (`PUBLIC_SITE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`), sem revelar seus valores, antes de publicar as funções atualizadas. O frontend Netlify não foi publicado.

O advisor de segurança ainda aponta `Leaked Password Protection Disabled`. O advisor de performance ainda reporta 15 índices sem uso observado; não removê-los sem evidência de carga. Nenhum valor de segredo, dado de cliente ou pagamento foi consultado ou exposto.
