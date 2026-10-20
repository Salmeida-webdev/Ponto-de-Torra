# Escopo e sequência de entrega

## Front público — aprovado, com catálogo dinâmico

Identidade, responsividade, busca, cards, páginas de produto, carrinho, conteúdo e fotos foram revisados. O projeto continua claramente identificado como portfólio. O site não recebeu novo deploy.

## Painel — funções integradas, em homologação

O `/painel` exige login de administrador e consulta pedidos, produtos, variantes, estoque, cupons e histórico no Supabase. Permite cadastrar/editar produtos e variantes com fotos, configurar cupons, registrar entradas de estoque e acompanhar pedidos com contato, endereço, transportadora, rastreio e entrega.

Vitrine, coleções, busca e detalhes de produto leem o catálogo ativo do Supabase. O checkout valida cupom no servidor e registra a reserva do desconto de forma atômica com o pedido. O cupom só conta após pagamento aprovado.

## Backend — Supabase, Asaas e Melhor Envio

O projeto Supabase `Ponto de Torra` está ativo. O banco contém 5 categorias, 50 produtos, 270 variantes, 50 imagens e perfis estimados de peso/dimensões. A cotação Melhor Envio foi testada e confirmada pelo responsável.

Asaas permanece em Sandbox. Falta homologar pagamento via webhook, idempotência, expiração/recusa, baixa/liberação de estoque e cupom, e atualização de envio até entrega. Nenhuma venda real está habilitada.

## Revisão e publicação

Concluir os testes locais de painel e checkout, revisar segurança, acessibilidade, SEO, desempenho e operação, versionar o projeto e confirmar domínio. Publicar o front apenas após a aprovação final.
