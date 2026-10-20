# Teste local — Ponto de Torra

Este pacote prepara o site e o checkout de sandbox para revisão local. Ele não publica o site.

## No Windows

Abra o PowerShell e execute:

```powershell
Expand-Archive -LiteralPath "$HOME\Downloads\Ponto-de-Torra-local.zip" -DestinationPath "$HOME\Downloads\Ponto-de-Torra" -Force; powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\Downloads\Ponto-de-Torra\INICIAR-TESTE-LOCAL.ps1"
```

O `.env.example` já contém a URL e a chave publicável do Supabase. O inicializador não pede `service_role`; chaves privadas ficam nos secrets do Supabase e não devem ser compartilhadas nem copiadas para o `.env`.

O banco já tem as 5 categorias, 50 produtos e 270 variantes demo. As 20 opções de café usam IDs, preços, estoque e dimensões por tamanho/moagem que correspondem ao carrinho e ao checkout. As dimensões e os pesos são estimativas de embalagem para simular cotações; confirme as medidas físicas antes de vender.

## Primeiro acesso administrativo

No Supabase, abra **Authentication → Users → Add user** e crie o usuário que usará `/painel`. Depois abra o SQL Editor e rode, trocando o e-mail pelo e-mail usado na criação. O passo está detalhado em `docs/PRIMEIRO-ACESSO-PAINEL.md`:

```sql
insert into public.staff_memberships (user_id, role)
select id, 'admin'::public.staff_role
from auth.users
where lower(email) = lower('SEU-EMAIL-DE-LOGIN')
on conflict (user_id) do update set role = 'admin';
```

O usuário precisa existir em Authentication antes de executar o SQL. Esse acesso é restrito ao usuário correspondente; não compartilhe senha nem chave administrativa.

O banco já tem as fotos do catálogo no Storage. Inicie o servidor local:

```powershell
npm run dev -- --host 127.0.0.1 --port 5180
```

Abra a URL local que o Vite informar. O teste E2E só começa depois que o painel de administração estiver ligado ao Supabase e protegido por autenticação. No checkout use dados fictícios, faça a cotação Melhor Envio e pague apenas no Sandbox Asaas. A tela de retorno fica pendente até o webhook confirmar o pagamento.

No painel `/painel`, entre com o usuário administrador. Pedidos e pagamentos começam vazios; o catálogo e os saldos são demonstrativos. As entradas de estoque e as atualizações de envio feitas no painel são persistidas no Supabase.

## Validação técnica

```powershell
npm run check
npm run build
```

As imagens estão incluídas em `static/images/products`. O deploy do site só deve ocorrer depois da revisão local e da aprovação final.
