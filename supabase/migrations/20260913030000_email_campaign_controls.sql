create or replace function public.set_email_campaign_paused(
  requested_campaign_id uuid,
  requested_paused boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  next_due timestamptz;
begin
  if requested_paused is null then
    raise sqlstate 'PT422' using message = 'paused state is required';
  end if;

  select status into current_status
  from public.email_campaigns
  where id = requested_campaign_id
  for update;
  if not found then
    raise sqlstate 'PT404' using message = 'campaign not found';
  end if;

  if requested_paused then
    if current_status = 'paused' then
      return;
    end if;
    if current_status <> 'scheduled' then
      raise sqlstate 'PT409' using message = 'only a scheduled campaign can be paused';
    end if;
    update public.email_campaigns
    set status = 'paused', run_owner = null, lease_until = null,
        updated_at = clock_timestamp()
    where id = requested_campaign_id;
    return;
  end if;

  if current_status = 'scheduled' then
    return;
  end if;
  if current_status <> 'paused' then
    raise sqlstate 'PT409' using message = 'only a paused campaign can be resumed';
  end if;
  select min(coalesce(next_attempt_at, clock_timestamp())) into next_due
  from public.email_campaign_items
  where campaign_id = requested_campaign_id
    and state in ('queued', 'retryable');
  if next_due is null then
    raise sqlstate 'PT409' using message = 'campaign has no unfinished work';
  end if;
  update public.email_campaigns
  set status = 'scheduled', scheduled_for = next_due,
      run_owner = null, lease_until = null, updated_at = clock_timestamp()
  where id = requested_campaign_id;
end;
$$;

revoke all on function public.set_email_campaign_paused(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_email_campaign_paused(uuid, boolean)
  to service_role;
