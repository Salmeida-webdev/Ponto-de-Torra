# Ponto de Torra — loja de portfólio

Vitrine de cafés, drip coffee, métodos, acessórios e kits em SvelteKit. O projeto usa Supabase, cotações Melhor Envio e checkout Asaas Sandbox. Não está configurado para receber pagamentos reais.

## Estado do projeto

- Supabase com 5 categorias, 50 produtos, 270 variantes e 50 fotos principais no Storage.
- Os 20 cafés têm variações de peso e moagem; os demais itens têm variantes conforme cadastro.
- O painel exige login administrativo e permite gerir produtos, variantes, imagens, cupons, estoque e pedidos com rastreio.
- Vitrine, coleções, busca e detalhes de produto leem o catálogo publicado no Supabase.
- Cupons são calculados e revalidados no servidor; reserva e uso dependem do estado do pagamento.
- Cotação Melhor Envio foi testada e confirmada. As medidas e pesos ainda são estimativas para testes.
- O checkout cria pedidos com reserva de estoque. Só o webhook autenticado do Asaas confirma pagamento e baixa estoque.

## Rodar no Windows

Extraia o ZIP e execute `INICIAR-TESTE-LOCAL.ps1` no PowerShell. O script instala dependências com `npm ci` e inicia a aplicação na porta 5180 (ou indica outra porta se estiver ocupada). Ele não pede `service_role`.

O `.env.example` contém somente a URL e a chave publicável do Supabase. Segredos do Asaas, Melhor Envio e `service_role` ficam nos secrets do Supabase e não são necessários no front local.

Para instalar dependências manualmente:

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5180
```

## Validação local

```powershell
npm run check
npm run build
```

Use dados fictícios e o Sandbox do Asaas. Confirme produto/cupom no painel, desconto no checkout, cotação de frete, pagamento via webhook, baixa/liberação do estoque e atualização do rastreio. O site não foi publicado novamente; o deploy final só ocorre após aprovação dos testes.

## Estrutura

- `src/routes/` — vitrine, produto, carrinho, checkout e painel.
- `src/lib/data/products.ts` — catálogo de fallback e categorias.
- `src/lib/data/live-catalog.ts` — leitura do catálogo publicado no Supabase.
- `scripts/catalog-seed.json` — catálogo e perfis estimados de embalagem.
- `scripts/seed-supabase-catalog.mjs` e `.ps1` — sincronização administrativa opcional.
- `static/images/products/` — fotos otimizadas do catálogo.
- `supabase/` — migrations e código local das Edge Functions.
- `docs/` — briefing, identidade, integrações e critérios de teste.

## Marca e contato

WhatsApp: [83 99873-9712](https://wa.me/5583998739712).

Rodapé: **Desenvolvido por LMX Soluções Digitais/Segundo Almeida**.
