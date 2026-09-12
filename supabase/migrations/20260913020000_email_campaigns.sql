create table public.email_campaigns (
  id uuid primary key,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'running', 'paused', 'completed', 'attention')),
  scheduled_for timestamptz not null,
  created_by text not null check (char_length(btrim(created_by)) between 1 and 120),
  run_owner uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((run_owner is null) = (lease_until is null))
);

create table public.email_campaign_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  position integer not null check (position >= 0),
  draft_id uuid not null references public.drafts(id) on delete restrict,
  state text not null default 'queued'
    check (state in ('queued', 'running', 'sent', 'retryable', 'failed', 'reconcile')),
  run_owner uuid,
  outcome text,
  http_status integer check (http_status between 100 and 599),
  detail text check (detail is null or char_length(detail) <= 500),
  retryable boolean not null default false,
  reconciliation_required boolean not null default false,
  receipt jsonb check (
    receipt is null
    or (jsonb_typeof(receipt) = 'object' and pg_column_size(receipt) <= 8192)
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, position),
  unique (campaign_id, draft_id),
  check ((state = 'running') = (run_owner is not null))
);

create index email_campaigns_due_idx
  on public.email_campaigns (scheduled_for, created_at)
  where status in ('scheduled', 'running');
create index email_campaign_items_due_idx
  on public.email_campaign_items (campaign_id, next_attempt_at, position)
  where state in ('queued', 'retryable', 'running');

alter table public.email_campaigns enable row level security;
alter table public.email_campaign_items enable row level security;
revoke all on public.email_campaigns, public.email_campaign_items from anon, authenticated;
grant all on public.email_campaigns, public.email_campaign_items to service_role;

create or replace function public.create_email_campaign(
  requested_campaign_id uuid,
  requested_name text,
  requested_scheduled_for timestamptz,
  requested_created_by text,
  requested_draft_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_count integer := cardinality(requested_draft_ids);
  valid_count integer;
begin
  if requested_count is null or requested_count < 1 or requested_count > 25
    or (select count(distinct value) from unnest(requested_draft_ids) value) <> requested_count
  then
    raise sqlstate 'PT422' using message = 'campaign draft IDs are invalid';
  end if;
  if char_length(btrim(requested_name)) not between 1 and 120
    or char_length(btrim(requested_created_by)) not between 1 and 120
  then
    raise sqlstate 'PT422' using message = 'campaign metadata is invalid';
  end if;

  select count(*) into valid_count
  from public.drafts d
  where d.id = any(requested_draft_ids)
    and d.status = 'approved'
    and nullif(btrim(d.recipient_email), '') is not null
    and nullif(btrim(d.subject), '') is not null
    and nullif(btrim(d.body), '') is not null;
  if valid_count <> requested_count then
    raise sqlstate 'PT409' using message = 'campaign contains an undeliverable draft';
  end if;

  insert into public.email_campaigns (
    id, name, scheduled_for, created_by
  ) values (
    requested_campaign_id, btrim(requested_name), requested_scheduled_for,
    btrim(requested_created_by)
  );
  insert into public.email_campaign_items (
    campaign_id, position, draft_id, next_attempt_at
  )
  select requested_campaign_id, ordinality - 1, draft_id, requested_scheduled_for
  from unnest(requested_draft_ids) with ordinality as item(draft_id, ordinality);
end;
$$;

create or replace function public.claim_due_email_campaign(
  requested_owner uuid,
  requested_limit integer,
  requested_campaign_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_campaign public.email_campaigns%rowtype;
  selected_item_ids uuid[];
  selected_draft_ids uuid[];
  claimed_at timestamptz := clock_timestamp();
begin
  if requested_limit < 1 or requested_limit > 8 then
    raise sqlstate 'PT422' using message = 'campaign run limit is invalid';
  end if;

  select * into selected_campaign
  from public.email_campaigns c
  where (requested_campaign_id is null or c.id = requested_campaign_id)
    and c.status in ('scheduled', 'running')
    and c.scheduled_for <= claimed_at
    and (c.lease_until is null or c.lease_until <= claimed_at)
  order by c.scheduled_for, c.created_at
  for update skip locked
  limit 1;
  if not found then
    return null;
  end if;

  update public.email_campaign_items
  set state = 'retryable', run_owner = null, retryable = true,
      next_attempt_at = claimed_at, updated_at = claimed_at
  where campaign_id = selected_campaign.id and state = 'running';

  select array_agg(id order by position), array_agg(draft_id order by position)
  into selected_item_ids, selected_draft_ids
  from (
    select id, draft_id, position
    from public.email_campaign_items
    where campaign_id = selected_campaign.id
      and state in ('queued', 'retryable')
      and (next_attempt_at is null or next_attempt_at <= claimed_at)
    order by position
    for update skip locked
    limit requested_limit
  ) due;

  if coalesce(cardinality(selected_item_ids), 0) = 0 then
    update public.email_campaigns
    set status = case
          when exists (
            select 1 from public.email_campaign_items
            where campaign_id = selected_campaign.id
              and state in ('queued', 'retryable', 'running')
          ) then 'scheduled'
          when exists (
            select 1 from public.email_campaign_items
            where campaign_id = selected_campaign.id
              and state in ('failed', 'reconcile')
          ) then 'attention'
          else 'completed'
        end,
        scheduled_for = coalesce((
          select min(next_attempt_at) from public.email_campaign_items
          where campaign_id = selected_campaign.id
            and state in ('queued', 'retryable')
        ), scheduled_for),
        run_owner = null, lease_until = null, updated_at = claimed_at
    where id = selected_campaign.id;
    return null;
  end if;

  update public.email_campaign_items
  set state = 'running', run_owner = requested_owner,
      attempt_count = attempt_count + 1, last_attempt_at = claimed_at,
      updated_at = claimed_at
  where id = any(selected_item_ids);
  update public.email_campaigns
  set status = 'running', run_owner = requested_owner,
      lease_until = claimed_at + interval '75 seconds', updated_at = claimed_at
  where id = selected_campaign.id;

  return jsonb_build_object(
    'campaign_id', selected_campaign.id,
    'owner', requested_owner,
    'draft_ids', to_jsonb(selected_draft_ids)
  );
end;
$$;

create or replace function public.record_email_campaign_results(
  requested_campaign_id uuid,
  requested_owner uuid,
  requested_results jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  result_count integer;
  recorded_at timestamptz := clock_timestamp();
begin
  if jsonb_typeof(requested_results) <> 'array'
    or jsonb_array_length(requested_results) < 1
    or jsonb_array_length(requested_results) > 8
    or pg_column_size(requested_results) > 65536
  then
    raise sqlstate 'PT422' using message = 'campaign results are invalid';
  end if;
  perform 1 from public.email_campaigns
  where id = requested_campaign_id and run_owner = requested_owner
  for update;
  if not found then
    raise sqlstate 'PT409' using message = 'campaign run is no longer owned';
  end if;

  for result in select value from jsonb_array_elements(requested_results)
  loop
    if result->>'state' not in ('sent', 'retryable', 'failed', 'reconcile')
      or nullif(result->>'draft_id', '') is null
      or nullif(result->>'outcome', '') is null
      or length(coalesce(result->>'detail', '')) > 500
      or (result->>'http_status')::integer not between 100 and 599
    then
      raise sqlstate 'PT422' using message = 'campaign result item is invalid';
    end if;
    update public.email_campaign_items
    set state = result->>'state', run_owner = null,
        outcome = result->>'outcome', http_status = (result->>'http_status')::integer,
        detail = nullif(result->>'detail', ''),
        retryable = coalesce((result->>'retryable')::boolean, false),
        reconciliation_required = coalesce(
          (result->>'reconciliation_required')::boolean, false
        ),
        receipt = result->'receipt',
        next_attempt_at = (result->>'next_attempt_at')::timestamptz,
        last_attempt_at = recorded_at, updated_at = recorded_at
    where campaign_id = requested_campaign_id
      and draft_id = (result->>'draft_id')::uuid
      and state = 'running' and run_owner = requested_owner;
    if not found then
      raise sqlstate 'PT409' using message = 'campaign item is no longer owned';
    end if;
  end loop;

  select count(*) into result_count
  from public.email_campaign_items
  where campaign_id = requested_campaign_id
    and state = 'running' and run_owner = requested_owner;
  if result_count <> 0 then
    raise sqlstate 'PT409' using message = 'campaign results are incomplete';
  end if;

  update public.email_campaigns
  set status = case
        when exists (
          select 1 from public.email_campaign_items
          where campaign_id = requested_campaign_id
            and state in ('queued', 'retryable', 'running')
        ) then 'scheduled'
        when exists (
          select 1 from public.email_campaign_items
          where campaign_id = requested_campaign_id
            and state in ('failed', 'reconcile')
        ) then 'attention'
        else 'completed'
      end,
      scheduled_for = coalesce((
        select min(next_attempt_at) from public.email_campaign_items
        where campaign_id = requested_campaign_id
          and state in ('queued', 'retryable')
      ), scheduled_for),
      run_owner = null, lease_until = null, updated_at = recorded_at
  where id = requested_campaign_id;
end;
$$;

revoke all on function public.create_email_campaign(uuid, text, timestamptz, text, uuid[])
  from public, anon, authenticated;
revoke all on function public.claim_due_email_campaign(uuid, integer, uuid)
  from public, anon, authenticated;
revoke all on function public.record_email_campaign_results(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_email_campaign(uuid, text, timestamptz, text, uuid[])
  to service_role;
grant execute on function public.claim_due_email_campaign(uuid, integer, uuid)
  to service_role;
grant execute on function public.record_email_campaign_results(uuid, uuid, jsonb)
  to service_role;
