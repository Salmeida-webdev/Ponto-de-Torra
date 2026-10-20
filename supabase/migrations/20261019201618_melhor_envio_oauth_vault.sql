create or replace function public.me_cart_fingerprint(p_items jsonb)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  canonical_items text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'invalid_cart' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    where x.variant_id is null or x.quantity is null or x.quantity not between 1 and 20
  ) then
    raise exception 'invalid_cart_items' using errcode = '22023';
  end if;
  select string_agg(grouped.variant_id::text || ':' || grouped.quantity::text, ',' order by grouped.variant_id)
    into canonical_items
    from (
      select x.variant_id, sum(x.quantity)::integer as quantity
      from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
      group by x.variant_id
    ) grouped;
  return encode(extensions.digest(canonical_items, 'sha256'), 'hex');
end;
$$;

create or replace function public.me_save_oauth_state(p_state_hash text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_state_hash is null or p_state_hash !~ '^[0-9a-f]{64}$' or p_user_id is null then
    raise exception 'invalid_oauth_state' using errcode = '22023';
  end if;
  insert into private.melhor_envio_oauth_states(state_hash, initiated_by, expires_at)
    values (p_state_hash, p_user_id, now() + interval '10 minutes');
end;
$$;

create or replace function public.me_consume_oauth_state(p_state_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  initiating_user uuid;
begin
  update private.melhor_envio_oauth_states s
    set consumed_at = now()
    where s.state_hash = p_state_hash and s.consumed_at is null and s.expires_at > now()
    returning s.initiated_by into initiating_user;
  if initiating_user is null then raise exception 'oauth_state_invalid_or_expired' using errcode = 'P0001'; end if;
  return initiating_user;
end;
$$;

create or replace function public.me_save_oauth_tokens(
  p_access_token text,
  p_refresh_token text,
  p_access_expires_at timestamptz,
  p_refresh_expires_at timestamptz,
  p_authorized_by uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_id uuid;
  token_json text;
begin
  if coalesce(length(p_access_token), 0) < 20 or coalesce(length(p_refresh_token), 0) < 20
    or p_access_expires_at <= now() or p_refresh_expires_at <= p_access_expires_at then
    raise exception 'invalid_oauth_tokens' using errcode = '22023';
  end if;
  token_json := jsonb_build_object('access_token', p_access_token, 'refresh_token', p_refresh_token)::text;
  select c.vault_secret_id into secret_id
    from private.melhor_envio_oauth_credentials c where c.id = 1 for update;
  if secret_id is null then
    select vault.create_secret(token_json, 'ponto-de-torra-melhor-envio-oauth', 'OAuth tokens for Better Envio API', null)
      into secret_id;
    insert into private.melhor_envio_oauth_credentials(
      id, vault_secret_id, access_expires_at, refresh_expires_at, authorized_by, updated_at
    ) values (1, secret_id, p_access_expires_at, p_refresh_expires_at, p_authorized_by, now());
  else
    perform vault.update_secret(secret_id, token_json, 'ponto-de-torra-melhor-envio-oauth', 'OAuth tokens for Better Envio API', null);
    update private.melhor_envio_oauth_credentials set
      access_expires_at = p_access_expires_at,
      refresh_expires_at = p_refresh_expires_at,
      refresh_locked_until = null,
      authorized_by = coalesce(p_authorized_by, authorized_by),
      updated_at = now()
      where id = 1;
  end if;
end;
$$;

create or replace function public.me_get_oauth_tokens()
returns table(token_payload jsonb, access_expires_at timestamptz, refresh_expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.decrypted_secret::jsonb, c.access_expires_at, c.refresh_expires_at
  from private.melhor_envio_oauth_credentials c
  join vault.decrypted_secrets d on d.id = c.vault_secret_id
  where c.id = 1;
$$;

create or replace function public.me_claim_token_refresh()
returns table(token_payload jsonb, access_expires_at timestamptz, refresh_expires_at timestamptz, claimed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  credential private.melhor_envio_oauth_credentials%rowtype;
  token_json jsonb;
begin
  select * into credential from private.melhor_envio_oauth_credentials c where c.id = 1 for update;
  if not found then return; end if;
  select d.decrypted_secret::jsonb into token_json
    from vault.decrypted_secrets d where d.id = credential.vault_secret_id;
  if credential.refresh_expires_at <= now() then
    raise exception 'melhor_envio_reauthorization_required' using errcode = 'P0001';
  end if;
  if credential.access_expires_at > now() + interval '5 minutes' then
    return query select token_json, credential.access_expires_at, credential.refresh_expires_at, false;
    return;
  end if;
  if credential.refresh_locked_until is not null and credential.refresh_locked_until > now() then
    return query select token_json, credential.access_expires_at, credential.refresh_expires_at, false;
    return;
  end if;
  update private.melhor_envio_oauth_credentials set refresh_locked_until = now() + interval '30 seconds'
    where id = 1;
  return query select token_json, credential.access_expires_at, credential.refresh_expires_at, true;
end;
$$;

-- SECURITY DEFINER RPCs are server-only from their first committed version.
revoke all on function public.me_cart_fingerprint(jsonb) from public, anon, authenticated;
revoke all on function public.me_save_oauth_state(text, uuid) from public, anon, authenticated;
revoke all on function public.me_consume_oauth_state(text) from public, anon, authenticated;
revoke all on function public.me_save_oauth_tokens(text, text, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.me_get_oauth_tokens() from public, anon, authenticated;
revoke all on function public.me_claim_token_refresh() from public, anon, authenticated;
grant execute on function public.me_cart_fingerprint(jsonb) to service_role;
grant execute on function public.me_save_oauth_state(text, uuid) to service_role;
grant execute on function public.me_consume_oauth_state(text) to service_role;
grant execute on function public.me_save_oauth_tokens(text, text, timestamptz, timestamptz, uuid) to service_role;
grant execute on function public.me_get_oauth_tokens() to service_role;
grant execute on function public.me_claim_token_refresh() to service_role;

