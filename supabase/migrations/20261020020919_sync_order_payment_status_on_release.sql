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
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;
  if current_order.status <> 'awaiting_payment' then raise exception 'order_not_awaiting_payment' using errcode = 'P0001'; end if;
  if p_reason = 'expired' and current_order.expires_at > now() then raise exception 'reservation_not_expired' using errcode = 'P0001'; end if;

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
    if not found then raise exception 'reserved_stock_invariant_failed' using errcode = 'P0001'; end if;

    update public.stock_reservations
      set status = case when p_reason = 'expired' then 'expired'::public.reservation_status else 'released'::public.reservation_status end,
          released_at = now()
      where id = reservation.id;
  end loop;

  update public.coupon_redemptions
    set status = 'released', released_at = now()
    where order_id = p_order_id and status = 'reserved';

  update public.orders
    set status = case p_reason
          when 'cancelled' then 'cancelled'::public.order_status
          when 'expired' then 'expired'::public.order_status
          else 'payment_failed'::public.order_status
        end,
        payment_status = case
          when p_reason = 'payment_failed' then 'rejected'::public.payment_status
          else 'cancelled'::public.payment_status
        end,
        cancelled_at = case when p_reason = 'cancelled' then now() else cancelled_at end
    where id = p_order_id and status = 'awaiting_payment';
end;
$$;

-- Align abandoned portfolio test orders with their terminal order status.
update public.orders
set payment_status = case
  when status = 'payment_failed' then 'rejected'::public.payment_status
  else 'cancelled'::public.payment_status
end
where status in ('payment_failed', 'expired', 'cancelled')
  and payment_status = 'pending';
