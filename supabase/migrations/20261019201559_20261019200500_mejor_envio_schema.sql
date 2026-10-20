-- Replace Frenet shipping records with Better Envio and bind checkout freight
-- to a short-lived server-generated quote option.
alter table public.shipments drop constraint if exists shipments_provider_check;
alter table public.shipments add constraint shipments_provider_check
  check (provider in ('melhor_envio'));
alter table public.shipments
  add column provider_service_id text,
  add column provider_company_id text,
  add column provider_cart_id text,
  add column package_snapshot jsonb not null default '[]'::jsonb,
  add constraint shipments_package_snapshot_is_array check (jsonb_typeof(package_snapshot) = 'array');

create table public.shipping_quote_options (
  id uuid primary key default extensions.gen_random_uuid(),
  quote_group_id uuid not null,
  cart_fingerprint text not null check (cart_fingerprint ~ '^[0-9a-f]{64}$'),
  recipient_postal_code char(8) not null check (recipient_postal_code ~ '^[0-9]{8}$'),
  company_id text not null,
  company_name text not null,
  service_id text not null,
  service_name text not null,
  price_cents integer not null check (price_cents >= 0),
  delivery_days integer check (delivery_days is null or delivery_days >= 0),
  packages jsonb not null check (jsonb_typeof(packages) = 'array'),
  provider_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_metadata) = 'object'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quote_group_id, service_id, company_id)
);
create index shipping_quote_options_expiry_idx on public.shipping_quote_options(expires_at)
  where consumed_at is null;
alter table public.shipping_quote_options enable row level security;
grant select, insert, update, delete on public.shipping_quote_options to service_role;

alter table public.orders
  add column shipping_quote_option_id uuid unique
    references public.shipping_quote_options(id) on delete restrict;

-- The OAuth state is one-time, short-lived, and stored as a hash.
create table private.melhor_envio_oauth_states (
  state_hash text primary key check (state_hash ~ '^[0-9a-f]{64}$'),
  initiated_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index melhor_envio_oauth_states_expiry_idx on private.melhor_envio_oauth_states(expires_at);
revoke all on private.melhor_envio_oauth_states from public, anon, authenticated;

create table private.melhor_envio_oauth_credentials (
  id smallint primary key check (id = 1),
  vault_secret_id uuid not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  refresh_locked_until timestamptz,
  authorized_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
revoke all on private.melhor_envio_oauth_credentials from public, anon, authenticated;
