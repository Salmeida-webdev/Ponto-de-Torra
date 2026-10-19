# Verificação de desempenho

Medições locais da compilação de produção desta etapa. O SvelteKit divide JavaScript e CSS por rota; os arquivos do painel não são baixados ao navegar apenas pela vitrine.

- CSS compartilhado da vitrine: 32,27 KiB sem gzip e 7,27 KiB gzip.
- Fotografias: 50 imagens de produto em JPEG progressivo, 2.604,8 KiB no total; cada uma com 760 × 570 px. Duas imagens editoriais acrescentam 251,3 KiB.
- Fontes externas e scripts de terceiros: nenhum carregamento obrigatório.
- Painel `/painel`: CSS exclusivo de 27,52 KiB (5,57 KiB gzip) e chunk da rota de 38,68 KiB (10,37 KiB gzip), conforme a compilação local.
- Recursos visuais fora da dobra: carregamento tardio; imagem principal com prioridade.

`npm run check` e `npm run build` foram executados com sucesso. Esta etapa ainda não tem hospedagem ou domínio conectados. Lighthouse, WebPageTest e métricas de campo (Core Web Vitals) não foram medidos; não há pontuação de laboratório ou dado de usuários reais a declarar. Repetir as medições após publicar no domínio final, com o painel e as integrações aprovados.
