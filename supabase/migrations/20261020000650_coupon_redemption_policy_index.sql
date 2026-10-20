create policy "service role manages coupon reservations" on public.coupon_redemptions
for all to service_role using (true) with check (true);

create index if not exists orders_coupon_id_idx
  on public.orders(coupon_id) where coupon_id is not null;
