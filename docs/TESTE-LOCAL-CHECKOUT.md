# Teste local — Ponto de Torra

## O que está preparado

- Catálogo ativo no Supabase: 50 produtos, 270 variantes e 50 imagens principais no Storage.
- Fotos públicas para exibição no site; envio e alteração ficam limitados a administradores autenticados.
- A vitrine, coleções, busca e páginas de produto consultam o catálogo publicado do Supabase. Se o banco não responder, o front usa os produtos locais de contingência.
- O painel permite criar e editar produtos, adicionar/remover variantes, cadastrar imagens, preço, peso, dimensões e saldo inicial.
- Cupons podem ser criados e editados no painel; o checkout valida código, validade, subtotal mínimo e limite de usos no servidor.
- O desconto é revalidado e reservado na criação do pedido. O Asaas recebe itens com os valores já distribuídos; o cupom só conta como usado após o webhook confirmar o pagamento. Expiração ou recusa libera a reserva.
- O painel exibe nome, e-mail, WhatsApp e endereço completo do cliente, e permite avançar pedido pago para enviado com transportadora e rastreio e depois para entregue.
- Melhor Envio e Asaas permanecem em sandbox/teste. O site ainda não foi publicado novamente.

## Iniciar no Windows

Extraia o ZIP e rode `INICIAR-TESTE-LOCAL.ps1` no PowerShell. O script instala dependências com `npm ci` e abre o site na porta 5180; se ela estiver ocupada, o Vite indica a porta livre. O inicializador não pede chave `service_role`.

O `.env.example` contém apenas a URL e a chave publicável do Supabase. Segredos do Asaas e do Melhor Envio permanecem nos secrets das Edge Functions.

## Roteiro de teste

1. Entre em `/painel` com o usuário administrador do Supabase.
2. Em **Produtos**, edite um produto e confira preço, dimensões e imagem; depois crie um produto de teste com imagem real e duas variantes. A imagem deve aparecer na vitrine, coleção, busca e página do produto. Ajustes de saldo existentes continuam sendo feitos na aba **Estoque**.
3. Em **Cupons**, crie um cupom percentual com mínimo e limite de uso. No checkout, adicione itens, informe o código e confirme desconto e total; teste também código incorreto, subtotal abaixo do mínimo e cupom inativo.
4. Faça a cotação de frete com CEP válido, selecione uma modalidade e prossiga para o checkout Asaas de teste. Use dados fictícios e conclua um pagamento Sandbox.
5. Após o webhook do Asaas confirmar o pagamento, confira o pedido, contato/endereço, saldo baixado e uso do cupom. Marque o pedido como enviado com transportadora e código de rastreio, depois marque como entregue.
6. Repita a tentativa com pagamento cancelado ou expirado e verifique que o saldo reservado e o uso do cupom foram liberados.

Não use cartão real nem dados de cliente real durante essa homologação. A publicação do site fica para depois da revisão e aprovação do teste local.
