create or replace function public.record_stock_incoming(
  p_variant_id uuid,
  p_quantity integer,
  p_reason text,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing public.stock_movements%rowtype;
  v_on_hand integer;
  v_reserved integer;
begin
  if p_variant_id is null or p_actor_user_id is null then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10000 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  if p_reason not in ('Compra recebida', 'Devolução conferida', 'Ajuste de inventário') then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 or length(p_idempotency_key) > 120 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key, 0));
  select * into v_existing from public.stock_movements where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.variant_id <> p_variant_id
      or v_existing.quantity_delta <> p_quantity
      or v_existing.reason <> p_reason
      or v_existing.actor_user_id <> p_actor_user_id
      or v_existing.movement_type <> 'incoming'::public.stock_movement_type then
      raise exception 'idempotency_key_conflict' using errcode = '23505';
    end if;
    select stock_on_hand, stock_reserved into v_on_hand, v_reserved
    from public.product_variants where id = p_variant_id;
    return pg_catalog.jsonb_build_object('variant_id', p_variant_id, 'stock_on_hand', v_on_hand, 'stock_reserved', v_reserved, 'duplicate', true);
  end if;

  update public.product_variants
  set stock_on_hand = stock_on_hand + p_quantity, updated_at = pg_catalog.now()
  where id = p_variant_id and is_active = true
  returning stock_on_hand, stock_reserved into v_on_hand, v_reserved;
  if not found then raise exception 'variant_not_found_or_inactive' using errcode = 'P0002'; end if;

  insert into public.stock_movements (variant_id, movement_type, quantity_delta, reason, idempotency_key, actor_user_id)
  values (p_variant_id, 'incoming'::public.stock_movement_type, p_quantity, p_reason, p_idempotency_key, p_actor_user_id);
  return pg_catalog.jsonb_build_object('variant_id', p_variant_id, 'stock_on_hand', v_on_hand, 'stock_reserved', v_reserved, 'duplicate', false);
end;
$function$;

revoke all on function public.record_stock_incoming(uuid, integer, text, uuid, text) from public, anon, authenticated;
grant execute on function public.record_stock_incoming(uuid, integer, text, uuid, text) to service_role;
