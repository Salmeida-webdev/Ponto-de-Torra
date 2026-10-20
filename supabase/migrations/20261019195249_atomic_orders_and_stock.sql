-- Secure server-only order creation and one-time stock commitment.
alter table public.orders
  add column if not exists request_hash text;

create or replace function public.create_order_and_reserve(
  p_idempotency_key text,
  p_request_hash text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_items jsonb,
  p_shipping_cents integer default 0
)
returns table(order_id uuid, order_number bigint, total_cents integer, expires_at timestamptz, already_created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order_id uuid;
  existing_order public.orders%rowtype;
  new_order_number bigint;
  new_total integer;
  new_expiry timestamptz;
  source_count integer;
begin
  if length(coalesce(p_idempotency_key, '')) < 16 or length(p_idempotency_key) > 128
     or length(coalesce(p_request_hash, '')) <> 64
     or p_customer_name is null or length(trim(p_customer_name)) not between 2 and 120
     or p_customer_email is null or length(p_customer_email) > 254
     or p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object'
     or p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 50
     or p_shipping_cents is null or p_shipping_cents < 0 or p_shipping_cents > 1000000 then
    raise exception 'invalid_order_request' using errcode = '22023';
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

  insert into public.orders(
    customer_name, customer_email, customer_phone, shipping_address,
    subtotal_cents, discount_cents, shipping_cents, total_cents, idempotency_key, request_hash
  ) values (
    trim(p_customer_name), lower(trim(p_customer_email)), nullif(trim(p_customer_phone), ''), p_shipping_address,
    0, 0, p_shipping_cents, p_shipping_cents, p_idempotency_key, p_request_hash
  ) on conflict (idempotency_key) do nothing
  returning id into new_order_id;

  if new_order_id is null then
    select * into existing_order from public.orders o
      where o.idempotency_key = p_idempotency_key for update;
    if existing_order.request_hash is distinct from p_request_hash then
      raise exception 'idempotency_key_reused_with_different_request' using errcode = '22023';
    end if;
    return query select existing_order.id, existing_order.order_number, existing_order.total_cents,
      existing_order.expires_at, true;
    return;
  end if;

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

  perform public.reserve_order_stock(new_order_id, 20);

  select o.order_number, o.total_cents, o.expires_at into new_order_number, new_total, new_expiry
    from public.orders o where o.id = new_order_id;
  return query select new_order_id, new_order_number, new_total, new_expiry, false;
end;
$$;

create or replace function public.commit_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.orders%rowtype;
  reservation record;
begin
  select * into current_order from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;
  if current_order.status in ('paid', 'processing', 'shipped', 'delivered') then return; end if;
  if current_order.status <> 'awaiting_payment' then
    raise exception 'order_not_payable' using errcode = 'P0001';
  end if;

  for reservation in
    select r.id, r.variant_id, r.quantity from public.stock_reservations r
    where r.order_id = p_order_id and r.status = 'reserved'
    order by r.variant_id for update
  loop
    update public.product_variants v
      set stock_on_hand = v.stock_on_hand - reservation.quantity,
          stock_reserved = v.stock_reserved - reservation.quantity
      where v.id = reservation.variant_id
        and v.stock_on_hand >= reservation.quantity
        and v.stock_reserved >= reservation.quantity;
    if not found then raise exception 'stock_commit_invariant_failed' using errcode = 'P0001'; end if;

    insert into public.stock_movements(
      variant_id, movement_type, quantity_delta, reason, order_id, idempotency_key
    ) values (
      reservation.variant_id, 'sale', -reservation.quantity, 'Asaas payment confirmed', p_order_id,
      'sale:' || p_order_id::text || ':' || reservation.variant_id::text
    ) on conflict (idempotency_key) do nothing;

    update public.stock_reservations set status = 'committed', committed_at = now()
      where id = reservation.id and status = 'reserved';
  end loop;

  if not exists (
    select 1 from public.stock_reservations r where r.order_id = p_order_id and r.status = 'committed'
  ) then
    raise exception 'order_has_no_reserved_stock' using errcode = 'P0001';
  end if;

  update public.orders set status = 'processing', payment_status = 'approved', paid_at = now()
    where id = p_order_id;
  update public.payments set status = 'approved' where order_id = p_order_id and provider = 'asaas';
end;
$$;

-- These SECURITY DEFINER functions must only be executable by trusted Edge Functions.
revoke all on function public.reserve_order_stock(uuid, integer) from public, anon, authenticated;
revoke all on function public.release_order_stock(uuid, text) from public, anon, authenticated;
revoke all on function public.create_order_and_reserve(text, text, text, text, text, jsonb, jsonb, integer) from public, anon, authenticated;
revoke all on function public.commit_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.reserve_order_stock(uuid, integer) to service_role;
grant execute on function public.release_order_stock(uuid, text) to service_role;
grant execute on function public.create_order_and_reserve(text, text, text, text, text, jsonb, jsonb, integer) to service_role;
grant execute on function public.commit_order_stock(uuid) to service_role;
