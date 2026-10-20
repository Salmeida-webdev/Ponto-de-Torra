-- Move authorization helpers out of the exposed Data API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter function public.is_staff() set schema private;
alter function public.is_admin() set schema private;
revoke all on function private.is_staff() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_staff() to anon, authenticated;
grant execute on function private.is_admin() to authenticated;

-- Event-trigger functions are invoked by PostgreSQL, not by API clients.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Keep a single SELECT policy per table where public reads and staff reads overlap.
drop policy "admins manage memberships" on public.staff_memberships;
create policy "admins insert memberships" on public.staff_memberships
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins update memberships" on public.staff_memberships
  for update to authenticated using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "admins delete memberships" on public.staff_memberships
  for delete to authenticated using ((select private.is_admin()));

drop policy "staff manages categories" on public.categories;
create policy "staff inserts categories" on public.categories
  for insert to authenticated with check ((select private.is_staff()));
create policy "staff updates categories" on public.categories
  for update to authenticated using ((select private.is_staff()))
  with check ((select private.is_staff()));
create policy "staff deletes categories" on public.categories
  for delete to authenticated using ((select private.is_staff()));

drop policy "staff manages products" on public.products;
create policy "staff inserts products" on public.products
  for insert to authenticated with check ((select private.is_staff()));
create policy "staff updates products" on public.products
  for update to authenticated using ((select private.is_staff()))
  with check ((select private.is_staff()));
create policy "staff deletes products" on public.products
  for delete to authenticated using ((select private.is_staff()));

drop policy "staff manages variants" on public.product_variants;
create policy "staff inserts variants" on public.product_variants
  for insert to authenticated with check ((select private.is_staff()));
create policy "staff updates variants" on public.product_variants
  for update to authenticated using ((select private.is_staff()))
  with check ((select private.is_staff()));
create policy "staff deletes variants" on public.product_variants
  for delete to authenticated using ((select private.is_staff()));

drop policy "staff manages product images" on public.product_images;
create policy "staff inserts product images" on public.product_images
  for insert to authenticated with check ((select private.is_staff()));
create policy "staff updates product images" on public.product_images
  for update to authenticated using ((select private.is_staff()))
  with check ((select private.is_staff()));
create policy "staff deletes product images" on public.product_images
  for delete to authenticated using ((select private.is_staff()));

drop policy "public reads valid coupons" on public.coupons;

drop policy "staff manages kit components" on public.kit_components;
create policy "staff inserts kit components" on public.kit_components
  for insert to authenticated with check ((select private.is_staff()));
create policy "staff updates kit components" on public.kit_components
  for update to authenticated using ((select private.is_staff()))
  with check ((select private.is_staff()));
create policy "staff deletes kit components" on public.kit_components
  for delete to authenticated using ((select private.is_staff()));

drop policy "staff manages content" on public.content_entries;
create policy "staff inserts content" on public.content_entries
  for insert to authenticated with check ((select private.is_staff()));
create policy "staff updates content" on public.content_entries
  for update to authenticated using ((select private.is_staff()))
  with check ((select private.is_staff()));
create policy "staff deletes content" on public.content_entries
  for delete to authenticated using ((select private.is_staff()));

-- Cover foreign keys used in joins, deletes, and the staff order/stock views.
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists product_variants_product_id_idx on public.product_variants(product_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists order_items_variant_id_idx on public.order_items(variant_id);
create index if not exists stock_reservations_variant_id_idx on public.stock_reservations(variant_id);
create index if not exists stock_movements_order_id_idx on public.stock_movements(order_id);
create index if not exists stock_movements_actor_user_id_idx on public.stock_movements(actor_user_id);
create index if not exists kit_components_component_variant_id_idx on public.kit_components(component_variant_id);
create index if not exists admin_audit_log_actor_user_id_idx on public.admin_audit_log(actor_user_id);

-- Explicitly grant server-side Edge Functions access when default exposure is disabled.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
