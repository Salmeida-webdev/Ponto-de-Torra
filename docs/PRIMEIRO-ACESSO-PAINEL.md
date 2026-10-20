# Primeiro acesso ao painel

O painel não tem cadastro público. Crie a conta somente para o administrador da loja:

1. No projeto Supabase `Ponto de Torra`, abra **Authentication → Users → Add user**.
2. Crie o usuário com o e-mail e a senha que serão usados em `/painel`.
3. No **SQL Editor**, rode a consulta abaixo substituindo o endereço pelo e-mail da conta criada:

```sql
insert into public.staff_memberships (user_id, role)
select id, 'admin'::public.staff_role
from auth.users
where lower(email) = lower('SEU-EMAIL-DE-LOGIN')
on conflict (user_id) do update set role = 'admin';
```

Se a consulta não inserir uma linha, confira se o usuário existe em Authentication e se o e-mail está correto. Não compartilhe a senha, a chave `service_role` ou segredos dos gateways.

O painel exige associação ativa com o papel `admin`. Usuários sem essa associação não conseguem consultar pedidos, dados de clientes, estoque ou executar alterações administrativas.
