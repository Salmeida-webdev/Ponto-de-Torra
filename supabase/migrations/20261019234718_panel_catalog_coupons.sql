-- Product media can be displayed by the storefront; write access stays staff-only.
update storage.buckets
set public = true,
    file_size_limit = 4000000,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';

drop policy if exists "public reads product images" on storage.objects;
create policy "public reads product images" on storage.objects
for select to public using (bucket_id = 'product-images');
drop policy if exists "staff uploads product images" on storage.objects;
create policy "staff uploads product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and (select private.is_staff()));
drop policy if exists "staff updates product images storage" on storage.objects;
create policy "staff updates product images storage" on storage.objects
for update to authenticated using (bucket_id = 'product-images' and (select private.is_staff()))
with check (bucket_id = 'product-images' and (select private.is_staff()));
drop policy if exists "staff deletes product images storage" on storage.objects;
create policy "staff deletes product images storage" on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and (select private.is_staff()));

alter table public.orders add column if not exists coupon_id uuid references public.coupons(id) on delete set null;
alter table public.orders add column if not exists coupon_code text;

create table if not exists public.coupon_redemptions (
  order_id uuid primary key references public.orders(id) on delete restrict,
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  status text not null check (status in ('reserved', 'committed', 'released')),
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  released_at timestamptz
);
create index if not exists coupon_redemptions_coupon_reserved_idx
  on public.coupon_redemptions(coupon_id) where status = 'reserved';
alter table public.coupon_redemptions enable row level security;
revoke all on public.coupon_redemptions from public, anon, authenticated;
grant select, insert, update, delete on public.coupon_redemptions to service_role;

create or replace function public.create_order_and_reserve(
  p_idempotency_key text,
  p_request_hash text,
  p_cart_fingerprint text,
  p_shipping_quote_option_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_items jsonb,
  p_coupon_code text default null
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
  active_coupon public.coupons%rowtype;
  new_order_number bigint;
  new_total integer;
  new_expiry timestamptz;
  source_count integer;
  new_subtotal integer;
  new_discount integer := 0;
  normalized_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  reserved_uses integer := 0;
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
  if exists (select 1 from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    where x.variant_id is null or x.quantity is null or x.quantity not between 1 and 20) then
    raise exception 'invalid_order_items' using errcode = '22023';
  end if;
  select count(*) into source_count from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer);
  if source_count <> jsonb_array_length(p_items) then raise exception 'invalid_order_items' using errcode = '22023'; end if;

  select * into existing_order from public.orders o where o.idempotency_key = p_idempotency_key for update;
  if found then
    if existing_order.request_hash is distinct from p_request_hash
      or existing_order.shipping_quote_option_id is distinct from p_shipping_quote_option_id then
      raise exception 'idempotency_key_reused_with_different_request' using errcode = '22023';
    end if;
    return query select existing_order.id, existing_order.order_number, existing_order.total_cents, existing_order.expires_at, true;
    return;
  end if;

  select * into quote_option from public.shipping_quote_options q
    where q.id = p_shipping_quote_option_id for update;
  if not found or quote_option.expires_at <= now() or quote_option.consumed_at is not null
    or quote_option.cart_fingerprint <> p_cart_fingerprint then
    raise exception 'shipping_quote_invalid_expired_or_used' using errcode = 'P0001';
  end if;
  select * into existing_order from public.orders o where o.idempotency_key = p_idempotency_key for update;
  if found then
    if existing_order.request_hash is distinct from p_request_hash
      or existing_order.shipping_quote_option_id is distinct from p_shipping_quote_option_id then
      raise exception 'idempotency_key_reused_with_different_request' using errcode = '22023';
    end if;
    return query select existing_order.id, existing_order.order_number, existing_order.total_cents, existing_order.expires_at, true;
    return;
  end if;

  if normalized_code is not null then
    select * into active_coupon from public.coupons c where c.code = normalized_code for update;
    if not found or not active_coupon.is_active
      or (active_coupon.starts_at is not null and active_coupon.starts_at > now())
      or (active_coupon.ends_at is not null and active_coupon.ends_at <= now()) then
      raise exception 'coupon_invalid' using errcode = 'P0001';
    end if;
    select count(*) into reserved_uses from public.coupon_redemptions r
      where r.coupon_id = active_coupon.id and r.status = 'reserved';
    if active_coupon.usage_limit is not null and active_coupon.usage_count + reserved_uses >= active_coupon.usage_limit then
      raise exception 'coupon_limit_reached' using errcode = 'P0001';
    end if;
  end if;

  insert into public.orders(
    customer_name, customer_email, customer_phone, shipping_address,
    subtotal_cents, discount_cents, shipping_cents, total_cents,
    idempotency_key, request_hash, shipping_quote_option_id, coupon_id, coupon_code
  ) values (
    trim(p_customer_name), lower(trim(p_customer_email)), nullif(trim(p_customer_phone), ''), p_shipping_address,
    0, 0, quote_option.price_cents, quote_option.price_cents,
    p_idempotency_key, p_request_hash, p_shipping_quote_option_id,
    case when normalized_code is null then null else active_coupon.id end, normalized_code
  ) returning id into new_order_id;

  insert into public.order_items(order_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot, sku_snapshot, quantity, unit_price_cents)
  select new_order_id, p.id, v.id, p.name, v.label, v.sku, cart.quantity, v.price_cents
  from (select x.variant_id, sum(x.quantity)::integer as quantity from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer) group by x.variant_id) cart
  join public.product_variants v on v.id = cart.variant_id and v.is_active
  join public.products p on p.id = v.product_id and p.is_active and p.archived_at is null;
  if (select count(*) from public.order_items oi where oi.order_id = new_order_id)
     <> (select count(distinct x.variant_id) from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)) then
    raise exception 'product_unavailable' using errcode = 'P0001';
  end if;
  select coalesce(sum(oi.line_total_cents), 0)::integer into new_subtotal from public.order_items oi where oi.order_id = new_order_id;
  if normalized_code is not null then
    if new_subtotal < active_coupon.minimum_subtotal_cents then raise exception 'coupon_minimum_not_met' using errcode = 'P0001'; end if;
    new_discount := case when active_coupon.discount_type = 'percent'
      then floor(new_subtotal::numeric * active_coupon.discount_value / 100)::integer
      else least(active_coupon.discount_value, new_subtotal) end;
    if new_discount <= 0 then raise exception 'coupon_invalid' using errcode = 'P0001'; end if;
  end if;
  update public.orders set subtotal_cents = new_subtotal, discount_cents = new_discount,
    total_cents = new_subtotal - new_discount + shipping_cents where id = new_order_id;
  if normalized_code is not null then
    insert into public.coupon_redemptions(order_id, coupon_id, status) values (new_order_id, active_coupon.id, 'reserved');
  end if;
  insert into public.shipments(order_id, provider, provider_service_id, provider_company_id, service_code, service_name, shipping_cents, estimated_delivery_days, package_snapshot)
  values (new_order_id, 'melhor_envio', quote_option.service_id, quote_option.company_id, quote_option.service_id,
    quote_option.service_name, quote_option.price_cents, quote_option.delivery_days, quote_option.packages);
  update public.shipping_quote_options set consumed_at = now() where id = quote_option.id;
  perform public.reserve_order_stock(new_order_id, 20);
  select o.order_number, o.total_cents, o.expires_at into new_order_number, new_total, new_expiry from public.orders o where o.id = new_order_id;
  return query select new_order_id, new_order_number, new_total, new_expiry, false;
end;
$$;

revoke all on function public.create_order_and_reserve(text, text, text, uuid, text, text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_order_and_reserve(text, text, text, uuid, text, text, text, jsonb, jsonb, text) to service_role;

create or replace function public.commit_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare current_order public.orders%rowtype; reservation record; redemption public.coupon_redemptions%rowtype;
begin
  select * into current_order from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;
  if current_order.status in ('paid', 'processing', 'shipped', 'delivered') then return; end if;
  if current_order.status <> 'awaiting_payment' then raise exception 'order_not_payable' using errcode = 'P0001'; end if;
  for reservation in select r.id, r.variant_id, r.quantity from public.stock_reservations r where r.order_id = p_order_id and r.status = 'reserved' order by r.variant_id for update loop
    update public.product_variants v set stock_on_hand = v.stock_on_hand - reservation.quantity, stock_reserved = v.stock_reserved - reservation.quantity where v.id = reservation.variant_id and v.stock_on_hand >= reservation.quantity and v.stock_reserved >= reservation.quantity;
    if not found then raise exception 'stock_commit_invariant_failed' using errcode = 'P0001'; end if;
    insert into public.stock_movements(variant_id, movement_type, quantity_delta, reason, order_id, idempotency_key) values (reservation.variant_id, 'sale', -reservation.quantity, 'Asaas payment confirmed', p_order_id, 'sale:' || p_order_id::text || ':' || reservation.variant_id::text) on conflict (idempotency_key) do nothing;
    update public.stock_reservations set status = 'committed', committed_at = now() where id = reservation.id and status = 'reserved';
  end loop;
  if not exists (select 1 from public.stock_reservations r where r.order_id = p_order_id and r.status = 'committed') then raise exception 'order_has_no_reserved_stock' using errcode = 'P0001'; end if;
  update public.orders set status = 'processing', payment_status = 'approved', paid_at = now() where id = p_order_id;
  update public.payments set status = 'approved' where order_id = p_order_id and provider = 'asaas';
  select * into redemption from public.coupon_redemptions where order_id = p_order_id for update;
  if found and redemption.status = 'reserved' then
    update public.coupon_redemptions set status = 'committed', committed_at = now() where order_id = p_order_id;
    update public.coupons set usage_count = usage_count + 1 where id = redemption.coupon_id;
  end if;
end;
$$;
revoke all on function public.commit_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.commit_order_stock(uuid) to service_role;

create or replace function public.release_order_stock(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare reservation record; current_order public.orders%rowtype;
begin
  if p_reason is null or p_reason not in ('cancelled', 'expired', 'payment_failed') then raise exception 'invalid_release_reason' using errcode = '22023'; end if;
  select * into current_order from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;
  if current_order.status <> 'awaiting_payment' then raise exception 'order_not_awaiting_payment' using errcode = 'P0001'; end if;
  if p_reason = 'expired' and current_order.expires_at > now() then raise exception 'reservation_not_expired' using errcode = 'P0001'; end if;
  for reservation in select r.id, r.variant_id, r.quantity from public.stock_reservations r where r.order_id = p_order_id and r.status = 'reserved' order by r.variant_id for update loop
    update public.product_variants v set stock_reserved = v.stock_reserved - reservation.quantity where v.id = reservation.variant_id and v.stock_reserved >= reservation.quantity;
    if not found then raise exception 'reserved_stock_invariant_failed' using errcode = 'P0001'; end if;
    update public.stock_reservations set status = case when p_reason = 'expired' then 'expired'::public.reservation_status else 'released'::public.reservation_status end, released_at = now() where id = reservation.id;
  end loop;
  update public.coupon_redemptions set status = 'released', released_at = now() where order_id = p_order_id and status = 'reserved';
  update public.orders set status = case p_reason when 'cancelled' then 'cancelled'::public.order_status when 'expired' then 'expired'::public.order_status else 'payment_failed'::public.order_status end, cancelled_at = case when p_reason = 'cancelled' then now() else cancelled_at end where id = p_order_id and status = 'awaiting_payment';
end;
$$;
revoke all on function public.release_order_stock(uuid, text) from public, anon, authenticated;
grant execute on function public.release_order_stock(uuid, text) to service_role;
