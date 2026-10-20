-- Use the persisted quote option, never a browser-supplied shipping price.
create or replace function public.create_order_and_reserve(
  p_idempotency_key text,
  p_request_hash text,
  p_cart_fingerprint text,
  p_shipping_quote_option_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_items jsonb
)
returns table(order_id uuid, order_number bigint, total_cents integer, expires_at timestamptz, already_created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order_id uuid;
  existing_order public.orders%rowtype;
  quote_option public.shipping_quote_options%rowtype;
  new_order_number bigint;
  new_total integer;
  new_expiry timestamptz;
  source_count integer;
begin
  if length(coalesce(p_idempotency_key, '')) < 16 or length(p_idempotency_key) > 128
     or length(coalesce(p_request_hash, '')) <> 64
     or p_cart_fingerprint is null or p_cart_fingerprint !~ '^[0-9a-f]{64}$'
     or p_shipping_quote_option_id is null
     or p_customer_name is null or length(trim(p_customer_name)) not between 2 and 120
     or p_customer_email is null or p_customer_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(p_customer_email) > 254
     or p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object'
     or p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'invalid_order_request' using errcode = '22023';
  end if;
  if public.me_cart_fingerprint(p_items) <> p_cart_fingerprint then
    raise exception 'cart_fingerprint_mismatch' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    where x.variant_id is null or x.quantity is null or x.quantity not between 1 and 20
  ) then
    raise exception 'invalid_order_items' using errcode = '22023';
  end if;
  select count(*) into source_count from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer);
  if source_count <> jsonb_array_length(p_items) then
    raise exception 'invalid_order_items' using errcode = '22023';
  end if;

  select * into existing_order from public.orders o where o.idempotency_key = p_idempotency_key for update;
  if found then
    if existing_order.request_hash is distinct from p_request_hash
      or existing_order.shipping_quote_option_id is distinct from p_shipping_quote_option_id then
      raise exception 'idempotency_key_reused_with_different_request' using errcode = '22023';
    end if;
    return query select existing_order.id, existing_order.order_number, existing_order.total_cents,
      existing_order.expires_at, true;
    return;
  end if;

  select * into quote_option from public.shipping_quote_options q
    where q.id = p_shipping_quote_option_id for update;
  if not found or quote_option.expires_at <= now() or quote_option.consumed_at is not null
    or quote_option.cart_fingerprint <> p_cart_fingerprint then
    raise exception 'shipping_quote_invalid_expired_or_used' using errcode = 'P0001';
  end if;

  -- Recheck after acquiring the quote lock so a concurrent retry remains idempotent.
  select * into existing_order from public.orders o where o.idempotency_key = p_idempotency_key for update;
  if found then
    if existing_order.request_hash is distinct from p_request_hash
      or existing_order.shipping_quote_option_id is distinct from p_shipping_quote_option_id then
      raise exception 'idempotency_key_reused_with_different_request' using errcode = '22023';
    end if;
    return query select existing_order.id, existing_order.order_number, existing_order.total_cents,
      existing_order.expires_at, true;
    return;
  end if;

  insert into public.orders(
    customer_name, customer_email, customer_phone, shipping_address,
    subtotal_cents, discount_cents, shipping_cents, total_cents,
    idempotency_key, request_hash, shipping_quote_option_id
  ) values (
    trim(p_customer_name), lower(trim(p_customer_email)), nullif(trim(p_customer_phone), ''), p_shipping_address,
    0, 0, quote_option.price_cents, quote_option.price_cents,
    p_idempotency_key, p_request_hash, p_shipping_quote_option_id
  ) returning id into new_order_id;

  insert into public.order_items(
    order_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot,
    sku_snapshot, quantity, unit_price_cents
  )
  select new_order_id, p.id, v.id, p.name, v.label, v.sku, cart.quantity, v.price_cents
  from (
    select x.variant_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by x.variant_id
  ) cart
  join public.product_variants v on v.id = cart.variant_id and v.is_active
  join public.products p on p.id = v.product_id and p.is_active and p.archived_at is null;

  if (select count(*) from public.order_items oi where oi.order_id = new_order_id)
     <> (select count(distinct x.variant_id) from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)) then
    raise exception 'product_unavailable' using errcode = 'P0001';
  end if;

  select coalesce(sum(oi.line_total_cents), 0)::integer into new_total
    from public.order_items oi where oi.order_id = new_order_id;
  update public.orders o set subtotal_cents = new_total,
    total_cents = new_total - o.discount_cents + o.shipping_cents
    where o.id = new_order_id;

  insert into public.shipments(
    order_id, provider, provider_service_id, provider_company_id,
    service_code, service_name, shipping_cents, estimated_delivery_days, package_snapshot
  ) values (
    new_order_id, 'melhor_envio', quote_option.service_id, quote_option.company_id,
    quote_option.service_id, quote_option.service_name, quote_option.price_cents,
    quote_option.delivery_days, quote_option.packages
  );
  update public.shipping_quote_options set consumed_at = now() where id = quote_option.id;

  perform public.reserve_order_stock(new_order_id, 20);

  select o.order_number, o.total_cents, o.expires_at into new_order_number, new_total, new_expiry
    from public.orders o where o.id = new_order_id;
  return query select new_order_id, new_order_number, new_total, new_expiry, false;
end;
$$;

revoke all on function public.me_cart_fingerprint(jsonb) from public, anon, authenticated;
revoke all on function public.me_save_oauth_state(text, uuid) from public, anon, authenticated;
revoke all on function public.me_consume_oauth_state(text) from public, anon, authenticated;
revoke all on function public.me_save_oauth_tokens(text, text, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.me_get_oauth_tokens() from public, anon, authenticated;
revoke all on function public.me_claim_token_refresh() from public, anon, authenticated;
revoke all on function public.create_order_and_reserve(text, text, text, uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.create_order_and_reserve(text, text, text, text, text, jsonb, jsonb, integer) from public, anon, authenticated, service_role;
grant execute on function public.me_cart_fingerprint(jsonb) to service_role;
grant execute on function public.me_save_oauth_state(text, uuid) to service_role;
grant execute on function public.me_consume_oauth_state(text) to service_role;
grant execute on function public.me_save_oauth_tokens(text, text, timestamptz, timestamptz, uuid) to service_role;
grant execute on function public.me_get_oauth_tokens() to service_role;
grant execute on function public.me_claim_token_refresh() to service_role;
grant execute on function public.create_order_and_reserve(text, text, text, uuid, text, text, text, jsonb, jsonb) to service_role;
