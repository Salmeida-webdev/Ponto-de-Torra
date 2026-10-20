-- Keep public quote traffic bounded and bind the final order address to its quote.
create table private.shipping_quote_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);
revoke all on private.shipping_quote_rate_limits from public, anon, authenticated;

create or replace function public.me_check_quote_rate_limit(p_key_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_limit_key' using errcode = '22023';
  end if;
  insert into private.shipping_quote_rate_limits(key_hash, window_started_at, request_count, updated_at)
    values (p_key_hash, now(), 1, now())
  on conflict (key_hash) do update set
    request_count = case
      when private.shipping_quote_rate_limits.window_started_at <= now() - interval '1 minute' then 1
      else private.shipping_quote_rate_limits.request_count + 1
    end,
    window_started_at = case
      when private.shipping_quote_rate_limits.window_started_at <= now() - interval '1 minute' then now()
      else private.shipping_quote_rate_limits.window_started_at
    end,
    updated_at = now()
  returning request_count into current_count;
  delete from private.shipping_quote_rate_limits where updated_at < now() - interval '2 hours';
  return current_count <= 20;
end;
$$;
revoke all on function public.me_check_quote_rate_limit(text) from public, anon, authenticated;
grant execute on function public.me_check_quote_rate_limit(text) to service_role;

create or replace function private.validate_shipping_quote_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quoted_cep text;
  address_cep text;
begin
  if new.shipping_quote_option_id is null then
    raise exception 'shipping_quote_required' using errcode = '22023';
  end if;
  select regexp_replace(q.recipient_postal_code::text, '[^0-9]', '', 'g') into quoted_cep
    from public.shipping_quote_options q where q.id = new.shipping_quote_option_id;
  address_cep := regexp_replace(coalesce(
    new.shipping_address->>'postal_code',
    new.shipping_address->>'cep',
    new.shipping_address->>'postalCode',
    ''
  ), '[^0-9]', '', 'g');
  if quoted_cep is null or address_cep <> quoted_cep then
    raise exception 'shipping_quote_address_mismatch' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_shipping_quote_address() from public, anon, authenticated, service_role;
create trigger orders_validate_shipping_quote_address
  before insert or update of shipping_quote_option_id, shipping_address on public.orders
  for each row execute function private.validate_shipping_quote_address();

create policy "server only shipping quote options"
  on public.shipping_quote_options
  for all to service_role
  using (true) with check (true);
