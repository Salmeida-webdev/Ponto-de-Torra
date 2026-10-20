alter table public.payment_webhook_events
  add column if not exists processing_started_at timestamptz;

create or replace function public.claim_asaas_webhook_event(p_event_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean := false;
begin
  if p_event_id is null or length(p_event_id) < 1 or length(p_event_id) > 200 then
    raise exception 'invalid_event_id' using errcode = '22023';
  end if;

  update public.payment_webhook_events
  set processing_started_at = pg_catalog.clock_timestamp()
  where provider = 'asaas'
    and provider_event_id = p_event_id
    and processed_at is null
    and (
      processing_started_at is null
      or processing_started_at < pg_catalog.clock_timestamp() - interval '10 minutes'
    )
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.claim_asaas_webhook_event(text) from public, anon, authenticated;
grant execute on function public.claim_asaas_webhook_event(text) to service_role;
