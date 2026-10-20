-- Ponto de Torra: schema inicial do backend.
-- Aplicar em um projeto Supabase novo. Nenhum dado de demonstração é cadastrado aqui.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.staff_role as enum ('admin', 'operator');
create type public.order_status as enum (
  'awaiting_payment', 'paid', 'processing', 'shipped', 'delivered',
  'cancelled', 'payment_failed', 'expired', 'refund_pending', 'refunded'
);
create type public.payment_status as enum (
  'pending', 'approved', 'rejected', 'cancelled', 'refunded', 'chargeback'
);
create type public.shipping_status as enum (
  'pending', 'awaiting_label', 'label_created', 'posted', 'in_transit',
  'delivered', 'exception', 'returned'
);
create type public.reservation_status as enum ('reserved', 'committed', 'released', 'expired');
create type public.stock_movement_type as enum ('incoming', 'sale', 'return', 'adjustment');

create table public.staff_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.staff_role not null default 'operator',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_path text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  seo_title text,
  seo_description text,
  is_active boolean not null default false,
  is_portfolio_demo boolean not null default true,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (archived_at is null or is_active = false)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null unique,
  label text not null,
  attributes jsonb not null default '{}'::jsonb,
  price_cents integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents >= price_cents),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0 and stock_reserved <= stock_on_hand),
  weight_grams integer check (weight_grams is null or weight_grams > 0),
  dimensions_mm jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  storage_path text not null,
  alt_text text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index product_images_one_primary_per_product
  on public.product_images(product_id) where is_primary and variant_id is null;
create unique index product_images_one_primary_per_variant
  on public.product_images(variant_id) where is_primary and variant_id is not null;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  status public.order_status not null default 'awaiting_payment',
  payment_status public.payment_status not null default 'pending',
  shipping_status public.shipping_status not null default 'pending',
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  shipping_address jsonb not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency char(3) not null default 'BRL' check (currency = 'BRL'),
  idempotency_key text not null unique,
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = subtotal_cents - discount_cents + shipping_cents)
);
create index orders_status_created_at_idx on public.orders(status, created_at desc);
create index orders_customer_email_created_at_idx on public.orders(customer_email, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  variant_label_snapshot text not null,
  sku_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer generated always as (quantity * unit_price_cents) stored,
  created_at timestamptz not null default now()
);
create index order_items_order_id_idx on public.order_items(order_id);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status public.reservation_status not null default 'reserved',
  expires_at timestamptz not null,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, variant_id)
);
create index stock_reservations_expiry_idx on public.stock_reservations(expires_at)
  where status = 'reserved';

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type public.stock_movement_type not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null,
  order_id uuid references public.orders(id) on delete restrict,
  idempotency_key text unique,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (movement_type = 'incoming' and quantity_delta > 0)
    or (movement_type = 'sale' and quantity_delta < 0)
    or (movement_type = 'return' and quantity_delta > 0)
    or movement_type = 'adjustment'
  )
);
create index stock_movements_variant_created_at_idx
  on public.stock_movements(variant_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider in ('asaas')),
  provider_checkout_id text,
  provider_payment_id text,
  provider_external_reference text,
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'BRL' check (currency = 'BRL'),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_checkout_id),
  unique (provider, provider_payment_id)
);
create index payments_order_id_idx on public.payments(order_id);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('asaas')),
  provider_event_id text not null,
  event_type text not null,
  payload_summary jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider in ('frenet')),
  provider_shipment_id text,
  service_code text,
  service_name text,
  tracking_code text,
  tracking_url text,
  label_path text,
  status public.shipping_status not null default 'pending',
  shipping_cents integer not null check (shipping_cents >= 0),
  estimated_delivery_days integer check (estimated_delivery_days is null or estimated_delivery_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_shipment_id)
);
create index shipments_order_id_idx on public.shipments(order_id);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  discount_value integer not null check (discount_value > 0),
  minimum_subtotal_cents integer not null default 0 check (minimum_subtotal_cents >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.kit_components (
  kit_variant_id uuid not null references public.product_variants(id) on delete cascade,
  component_variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (kit_variant_id, component_variant_id),
  check (kit_variant_id <> component_variant_id)
);

create table public.content_entries (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('page', 'recipe', 'faq', 'guide')),
  title text not null,
  slug text not null unique,
  body text not null default '',
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_at_idx on public.admin_audit_log(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger shipments_set_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();
create trigger coupons_set_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();
create trigger content_entries_set_updated_at before update on public.content_entries
  for each row execute function public.set_updated_at();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_memberships sm
    where sm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_memberships sm
    where sm.user_id = (select auth.uid()) and sm.role = 'admin'
  );
$$;

revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_staff() to anon;
grant execute on function public.is_admin() to authenticated;

alter table public.staff_memberships enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.stock_movements enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.shipments enable row level security;
alter table public.coupons enable row level security;
alter table public.kit_components enable row level security;
alter table public.content_entries enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "staff can read own membership" on public.staff_memberships
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins manage memberships" on public.staff_memberships
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public reads published categories" on public.categories
  for select to anon, authenticated using (is_published or (select public.is_staff()));
create policy "staff manages categories" on public.categories
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "public reads active products" on public.products
  for select to anon, authenticated using ((is_active and archived_at is null) or (select public.is_staff()));
create policy "staff manages products" on public.products
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "public reads active variants" on public.product_variants
  for select to anon, authenticated using (
    is_active and exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active and p.archived_at is null
    ) or (select public.is_staff())
  );
create policy "staff manages variants" on public.product_variants
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "public reads images for active products" on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active and p.archived_at is null)
    or (select public.is_staff())
  );
create policy "staff manages product images" on public.product_images
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "staff manages orders" on public.orders
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff reads order items" on public.order_items
  for select to authenticated using ((select public.is_staff()));
create policy "staff reads reservations" on public.stock_reservations
  for select to authenticated using ((select public.is_staff()));
create policy "staff reads stock movements" on public.stock_movements
  for select to authenticated using ((select public.is_staff()));
create policy "staff reads payments" on public.payments
  for select to authenticated using ((select public.is_staff()));
create policy "staff reads payment events" on public.payment_webhook_events
  for select to authenticated using ((select public.is_staff()));
create policy "staff manages shipments" on public.shipments
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "public reads valid coupons" on public.coupons
  for select to authenticated using ((select public.is_staff()));
create policy "staff manages coupons" on public.coupons
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "public reads components for active kits" on public.kit_components
  for select to anon, authenticated using (
    exists (
      select 1 from public.product_variants v join public.products p on p.id = v.product_id
      where v.id = kit_variant_id and v.is_active and p.is_active and p.archived_at is null
    ) or (select public.is_staff())
  );
create policy "staff manages kit components" on public.kit_components
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "public reads published content" on public.content_entries
  for select to anon, authenticated using (is_published or (select public.is_staff()));
create policy "staff manages content" on public.content_entries
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "admins read audit log" on public.admin_audit_log
  for select to authenticated using ((select public.is_admin()));

grant select on public.categories, public.products, public.product_variants,
  public.product_images, public.kit_components, public.content_entries
  to anon, authenticated;
grant select, insert, update, delete on public.staff_memberships, public.categories,
  public.products, public.product_variants, public.product_images, public.orders,
  public.shipments, public.coupons, public.kit_components, public.content_entries
  to authenticated;
grant select on public.order_items, public.stock_reservations, public.stock_movements,
  public.payments, public.payment_webhook_events, public.admin_audit_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- A reserva só pode ser chamada pelo servidor com a chave secreta do Supabase.
-- A atualização condicional e ordenada bloqueia overselling entre checkouts concorrentes.
create or replace function public.reserve_order_stock(p_order_id uuid, p_hold_minutes integer default 20)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  updated_variant uuid;
  existing_count integer;
begin
  if p_hold_minutes < 5 or p_hold_minutes > 60 then
    raise exception 'invalid_reservation_duration' using errcode = '22023';
  end if;

  perform 1 from public.orders o
    where o.id = p_order_id and o.status = 'awaiting_payment'
    for update;
  if not found then
    raise exception 'order_not_awaiting_payment' using errcode = 'P0001';
  end if;

  select count(*) into existing_count
    from public.stock_reservations r where r.order_id = p_order_id;
  if existing_count > 0 then
    if exists (
      select 1
      from (
        select oi.variant_id, sum(oi.quantity)::integer as qty
        from public.order_items oi where oi.order_id = p_order_id group by oi.variant_id
      ) expected
      full join public.stock_reservations actual
        on actual.order_id = p_order_id and actual.variant_id = expected.variant_id
      where expected.variant_id is null or actual.variant_id is null
        or expected.qty <> actual.quantity or actual.status <> 'reserved'
    ) then
      raise exception 'reservation_state_conflict' using errcode = 'P0001';
    end if;
    return;
  end if;

  if not exists (select 1 from public.order_items oi where oi.order_id = p_order_id)
     or exists (select 1 from public.order_items oi where oi.order_id = p_order_id and oi.variant_id is null) then
    raise exception 'order_has_no_items' using errcode = 'P0001';
  end if;

  for item in
    select oi.variant_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.variant_id is not null
    group by oi.variant_id
    order by oi.variant_id
  loop
    update public.product_variants v
      set stock_reserved = v.stock_reserved + item.quantity
      where v.id = item.variant_id
        and v.is_active
        and v.stock_on_hand - v.stock_reserved >= item.quantity
      returning v.id into updated_variant;

    if updated_variant is null then
      raise exception 'insufficient_stock_for_variant:%', item.variant_id using errcode = 'P0001';
    end if;

    insert into public.stock_reservations(order_id, variant_id, quantity, status, expires_at)
      values (p_order_id, item.variant_id, item.quantity, 'reserved', now() + make_interval(mins => p_hold_minutes));
    updated_variant := null;
  end loop;

  update public.orders set expires_at = now() + make_interval(mins => p_hold_minutes)
    where id = p_order_id;
end;
$$;

create or replace function public.release_order_stock(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation record;
  current_order public.orders%rowtype;
begin
  if p_reason is null or p_reason not in ('cancelled', 'expired', 'payment_failed') then
    raise exception 'invalid_release_reason' using errcode = '22023';
  end if;

  select * into current_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if current_order.status <> 'awaiting_payment' then
    raise exception 'order_not_awaiting_payment' using errcode = 'P0001';
  end if;
  if p_reason = 'expired' and current_order.expires_at > now() then
    raise exception 'reservation_not_expired' using errcode = 'P0001';
  end if;

  for reservation in
    select r.id, r.variant_id, r.quantity
    from public.stock_reservations r
    where r.order_id = p_order_id and r.status = 'reserved'
    order by r.variant_id
    for update
  loop
    update public.product_variants v
      set stock_reserved = v.stock_reserved - reservation.quantity
      where v.id = reservation.variant_id and v.stock_reserved >= reservation.quantity;
    if not found then
      raise exception 'reserved_stock_invariant_failed' using errcode = 'P0001';
    end if;
    update public.stock_reservations
      set status = case when p_reason = 'expired' then 'expired'::public.reservation_status else 'released'::public.reservation_status end,
          released_at = now()
      where id = reservation.id;
  end loop;

  update public.orders
    set status = case p_reason
      when 'cancelled' then 'cancelled'::public.order_status
      when 'expired' then 'expired'::public.order_status
      else 'payment_failed'::public.order_status
    end,
    cancelled_at = case when p_reason = 'cancelled' then now() else cancelled_at end
    where id = p_order_id and status = 'awaiting_payment';
end;
$$;

revoke all on function public.reserve_order_stock(uuid, integer) from public, anon, authenticated;
revoke all on function public.release_order_stock(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_order_stock(uuid, integer) to service_role;
grant execute on function public.release_order_stock(uuid, text) to service_role;
