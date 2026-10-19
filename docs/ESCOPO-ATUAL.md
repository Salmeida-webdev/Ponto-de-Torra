# Escopo e sequência de entrega

## Concluído: front público

Revisados identidade, hierarquia visual, navegação, responsividade, busca, cards, páginas de produto, carrinho demonstrativo, conteúdo, fotos e microcopy. O botão da seção de preparo recebeu correção de contraste; os marcadores repetidos de demonstração foram removidos dos produtos. O site deixa explícito que é um projeto de portfólio.

## Em revisão: front do painel

Primeira versão de interface em `/painel`: dashboard com indicadores, gráfico, pedidos, mais vendidos, estoque baixo e recomendações operacionais; áreas navegáveis de produtos, estoque, pedidos, cupons, conteúdo e histórico. Período do dashboard, busca/filtro de pedidos, exportação CSV, edição demonstrativa de status/rastreio e registro de entradas de estoque funcionam localmente com amostras. A interface identifica todos os dados como ilustrativos. Para o painel final, cada módulo terá operações de cadastro, consulta, edição e arquivamento compatíveis com o briefing: catálogo/variantes/estoque, pedidos (incluindo enviado/rastreio/entregue/cancelado), cupons e conteúdo.

## Backend aprovado: Supabase, Asaas e Frenet

O painel foi aprovado para avançar. O banco será um projeto Supabase novo e exclusivo do Ponto de Torra. O gateway financeiro escolhido é o Asaas e o cálculo de frete será pela Frenet. A migração inicial já está preparada em `supabase/migrations`; ela ainda não foi aplicada a um projeto remoto.

O backend deve registrar entradas/saídas auditáveis por SKU/variante; reservar saldo atomicamente ao iniciar o checkout; converter a reserva em baixa definitiva ao confirmar pagamento via webhook do Asaas; liberar reserva em falha, expiração ou cancelamento; impedir saldo negativo e dupla venda concorrente. Estorno financeiro só recompõe estoque quando a mercadoria retornada for conferida.

A integração de frete deverá cotar pela Frenet no servidor, recalcular a opção escolhida antes de criar o pedido e só exibir etiqueta/rastreio após confirmação real do serviço. Credenciais Asaas e Frenet ficam apenas em variáveis de ambiente do servidor.

## Revisão final e publicação

Quando as etapas anteriores estiverem aprovadas: revisar segurança, acessibilidade, SEO e desempenho com dados reais; versionar; confirmar domínio e configurações; então publicar.

O checkout e os dados comerciais continuam como demonstrações. O painel não deve ser usado como ferramenta operacional até o projeto Supabase ser criado, a migração ser aplicada, as credenciais de sandbox configuradas e autenticação/backend serem implementados e revisados.
