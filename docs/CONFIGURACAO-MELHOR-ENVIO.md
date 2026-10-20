# Melhor Envio — configuração de integração

## Ambiente de produção

Use a conta e o aplicativo de desenvolvedor da Melhor Envio em produção, conforme a escolha do projeto. A URL base oficial da API de produção é `https://melhorenvio.com.br`. O sandbox é separado e exige outra conta e outro app; ele poderá ser usado depois para testes sem gerar envios reais.

Configure o callback exatamente como:

```text
https://ujmjeizvektvctfrlgia.supabase.co/functions/v1/melhor-envio-oauth-callback
```

O callback cadastrado no aplicativo e o valor de `MELHOR_ENVIO_REDIRECT_URI` precisam ser idênticos. Defina no Supabase Edge Function Secrets:

```text
MELHOR_ENVIO_ENV=production
MELHOR_ENVIO_API_BASE_URL=https://melhorenvio.com.br
MELHOR_ENVIO_CLIENT_ID=<client id do app de produção>
MELHOR_ENVIO_CLIENT_SECRET=<client secret do app de produção>
MELHOR_ENVIO_REDIRECT_URI=https://ujmjeizvektvctfrlgia.supabase.co/functions/v1/melhor-envio-oauth-callback
MELHOR_ENVIO_USER_AGENT=Ponto de Torra (email de suporte monitorado)
STORE_ORIGIN_POSTAL_CODE=<CEP de origem com 8 dígitos>
RATE_LIMIT_PEPPER=<segredo aleatório com pelo menos 32 caracteres>
PUBLIC_SITE_URL=<URL do front atual>
```

Não envie `client_secret`, access token ou refresh token ao navegador, ao GitHub ou pelo chat. Os tokens retornados pelo OAuth são salvos no Supabase Vault; a Edge Function renova o access token e grava a nova rotação sem expor o conteúdo dos tokens.

## OAuth e permissões

O botão de conexão do painel chama `melhor-envio-oauth-start` autenticado por uma conta com papel `admin`. O callback utiliza `state` aleatório, expira em dez minutos e só pode ser consumido uma vez. Nesta etapa é solicitado apenas `shipping-calculate`, que é necessário para cotações. Escopos de carrinho e etiqueta só serão solicitados quando o fluxo de compra de etiquetas estiver implementado.

## Cotação de frete

`POST /functions/v1/melhor-envio-quotes` recebe `postal_code` e `items: [{ variant_id, quantity }]`. O servidor busca nome, preço, disponibilidade, peso e medidas das variantes no banco; ignora valores enviados pelo navegador. As medidas devem ser cadastradas em milímetros no campo `dimensions_mm` e peso em gramas no campo `weight_grams`; antes da cotação são convertidos para centímetros e quilogramas.

O resultado da Melhor Envio é persistido por dez minutos, ligado ao hash canônico do carrinho e ao CEP. O pedido usa o ID da opção persistida; o banco calcula o frete em centavos e rejeita opção vencida, já usada, com carrinho diferente ou cujo CEP não corresponda ao endereço do pedido. A função pública de cotações limita a 20 solicitações por minuto por IP; o pepper de rate limit é obrigatório.

## Conexão e limites atuais

1. Cadastrar o aplicativo na conta de produção e usar o callback acima, idêntico ao cadastrado.
2. Solicitar somente `shipping-calculate` nesta etapa.
3. Guardar os secrets de produção no Supabase, sem enviá-los pelo chat ou versioná-los.
4. Conectar a conta e verificar as primeiras cotações com variantes com peso, dimensões, preço e estoque preenchidos.
5. O checkout de pagamento em Sandbox está preparado no front local. A cotação da Melhor Envio usa o ambiente configurado no Supabase (atualmente produção); ela consulta preço/prazo, mas não compra etiqueta. Não use dados pessoais reais durante os testes.

## Referências oficiais

- [Fluxo OAuth e escopos](https://docs.melhorenvio.com.br/reference/fluxo-de-autoriza%C3%A7%C3%A3o): cadastro do app, callback e permissões mínimas.
- [Solicitação e renovação de tokens](https://docs.melhorenvio.com.br/reference/solicitacao-do-token): troca do código OAuth, refresh token e User-Agent.
- [Cálculo por produtos](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos): endpoint, campos e unidades.
- [Introdução e URLs oficiais](https://docs.melhorenvio.com.br/reference/introducao-api-melhor-envio): URL base de produção/sandbox e particularidades.
- [Aplicativo de produção](https://melhorenvio.com.br/): acesse Integrações → Área Dev.
