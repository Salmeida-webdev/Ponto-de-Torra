create or replace function public.admin_update_order_shipping(
  p_order_id uuid,
  p_target_status text,
  p_carrier text default null,
  p_tracking_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_shipment_id uuid;
  v_shipment_status public.shipping_status;
begin
  if p_order_id is null or p_target_status not in ('processing', 'shipped', 'delivered') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_order_id::text, 1));
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;
  if v_order.payment_status <> 'approved' then raise exception 'payment_not_approved' using errcode = '23514'; end if;

  if p_target_status = 'processing' then
    if v_order.status not in ('paid', 'processing') then raise exception 'invalid_transition' using errcode = '23514'; end if;
    update public.orders set status = 'processing', updated_at = pg_catalog.now() where id = p_order_id;
    return pg_catalog.jsonb_build_object('order_id', p_order_id, 'status', 'processing');
  end if;

  if p_target_status = 'shipped' then
    if v_order.status not in ('paid', 'processing', 'shipped') then raise exception 'invalid_transition' using errcode = '23514'; end if;
    if p_carrier is null or length(pg_catalog.btrim(p_carrier)) < 2 or length(p_carrier) > 80
      or p_tracking_code is null or p_tracking_code !~ '^[A-Za-z0-9-]{3,40}$' then
      raise exception 'invalid_tracking' using errcode = '22023';
    end if;
    v_shipment_status := 'posted'::public.shipping_status;
  else
    if v_order.status not in ('shipped', 'delivered') then raise exception 'invalid_transition' using errcode = '23514'; end if;
    v_shipment_status := 'delivered'::public.shipping_status;
  end if;

  select id into v_shipment_id from public.shipments where order_id = p_order_id
  order by created_at desc limit 1 for update;
  if v_shipment_id is null then
    if p_target_status <> 'shipped' then raise exception 'shipment_not_found' using errcode = 'P0002'; end if;
    insert into public.shipments (order_id, provider, service_name, tracking_code, status, shipping_cents, package_snapshot)
    values (p_order_id, 'melhor_envio', pg_catalog.btrim(p_carrier), p_tracking_code, v_shipment_status, v_order.shipping_cents, '[]'::jsonb)
    returning id into v_shipment_id;
  else
    update public.shipments
    set status = v_shipment_status,
        service_name = case when p_target_status = 'shipped' then pg_catalog.btrim(p_carrier) else service_name end,
        tracking_code = case when p_target_status = 'shipped' then p_tracking_code else tracking_code end,
        updated_at = pg_catalog.now()
    where id = v_shipment_id;
  end if;

  if p_target_status = 'shipped' then
    update public.orders set status = 'shipped', shipping_status = 'posted',
      shipped_at = coalesce(shipped_at, pg_catalog.now()), updated_at = pg_catalog.now() where id = p_order_id;
  else
    update public.orders set status = 'delivered', shipping_status = 'delivered',
      delivered_at = coalesce(delivered_at, pg_catalog.now()), updated_at = pg_catalog.now() where id = p_order_id;
  end if;
  return pg_catalog.jsonb_build_object('order_id', p_order_id, 'status', p_target_status, 'shipment_id', v_shipment_id);
end;
$function$;

revoke all on function public.admin_update_order_shipping(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_order_shipping(uuid, text, text, text) to service_role;
