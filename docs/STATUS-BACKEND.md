# Status do backend

## Configuração confirmada

- Supabase `Ponto de Torra` (`ujmjeizvektvctfrlgia`) ativo. Banco com 5 categorias, 50 produtos, 270 variantes e 50 fotos no bucket `product-images`.
- A cotação Melhor Envio foi testada e confirmada pelo responsável.
- Asaas permanece em Sandbox para os testes. Webhook, checkout e funções de gestão do estoque/envio continuam ativos.
- Catálogo do site lê os produtos publicados do Supabase. Imagens são públicas para leitura; upload e gestão permanecem limitados a administradores.
- A aba Produtos permite adicionar/editar produto, imagem, variantes, preço e dimensões; ajustes de estoque existente são feitos na aba Estoque.
- A aba Cupons permite criar/editar regras. Cupom é calculado a partir dos preços no banco, revalidado ao criar o pedido, reservado enquanto aguarda pagamento e contabilizado após confirmação do webhook. Pagamentos expirados/recusados liberam a reserva.
- Pedidos exibem nome, e-mail, WhatsApp e endereço completo. O painel permite registrar transportadora/rastreio e concluir a entrega após pagamento aprovado.
- Não houve novo deploy da vitrine. A próxima publicação fica para depois da revisão e aprovação dos testes locais.

## Pendências de homologação

- Confirmar que o usuário administrador consegue entrar em `/painel`.
- Fazer um pagamento de teste no Asaas Sandbox e confirmar no banco a aprovação via webhook e a baixa automática do estoque.
- Testar criar produto e cupom no painel e conferir a exibição do item e o desconto no checkout.
- Validar cancelamento/expiração, liberação de estoque/cupom e atualização de rastreio até entrega.
- Dimensões e pesos de catálogo são estimativas de portfólio; conferir cada embalagem física antes de qualquer venda real.
