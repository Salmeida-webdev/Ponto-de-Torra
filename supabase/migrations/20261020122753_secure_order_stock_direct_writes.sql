-- Keep checkout, payment, fulfillment, and inventory mutations in trusted
-- database functions or Edge Functions. Staff retains read access through RLS.
revoke insert, update, delete on public.orders,
  public.shipments,
  public.payments,
  public.stock_reservations,
  public.stock_movements,
  public.payment_webhook_events
from public, anon, authenticated;

-- TRUNCATE bypasses RLS, so remove it explicitly from API roles on every
-- current public table. It is not required by the storefront or admin panel.
revoke truncate on all tables in schema public from public, anon, authenticated;

grant select on public.orders, public.shipments, public.payments,
  public.stock_reservations, public.stock_movements,
  public.payment_webhook_events to authenticated;

-- Catalog editors may manage variant details, but stock is changed only via
-- the audited stock-entry and order-payment database functions.
revoke insert, update, delete on public.product_variants from public, anon, authenticated;
grant insert (
  product_id, sku, label, attributes, price_cents, compare_at_price_cents,
  weight_grams, dimensions_mm, is_active
) on public.product_variants to authenticated;
grant update (
  product_id, sku, label, attributes, price_cents, compare_at_price_cents,
  weight_grams, dimensions_mm, is_active
) on public.product_variants to authenticated;
