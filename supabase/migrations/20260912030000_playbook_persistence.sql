create table public.playbooks (
  id uuid primary key default gen_random_uuid(),
  cohort_revision text not null unique check (length(cohort_revision) = 64),
  rubric_version text not null check (length(btrim(rubric_version)) between 1 and 255),
  playbook jsonb not null check (
    jsonb_typeof(playbook) = 'object'
    and playbook->>'cohort_revision' = cohort_revision
  ),
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index playbooks_generated_at_idx on public.playbooks (generated_at desc);

alter table public.playbooks enable row level security;

revoke all on table public.playbooks from anon, authenticated;
grant select, insert, update on table public.playbooks to service_role;

create or replace function public.store_playbook_if_current(p_playbook jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  matching_sources integer;
  source_count integer;
  stored jsonb;
begin
  if jsonb_typeof(p_playbook) <> 'object'
    or jsonb_typeof(p_playbook->'sources') <> 'array'
    or nullif(p_playbook->>'cohort_revision', '') is null
    or nullif(p_playbook->>'generated_at', '') is null
  then
    raise exception 'invalid playbook payload';
  end if;

  source_count := jsonb_array_length(p_playbook->'sources');
  perform conversation.id
  from jsonb_array_elements(p_playbook->'sources') as source
  join public.conversations as conversation
    on conversation.id::text = source->>'call_id'
  where conversation.channel = 'call'
  for share of conversation;

  select count(distinct conversation.id)
  into matching_sources
  from jsonb_array_elements(p_playbook->'sources') as source
  join public.conversations as conversation
    on conversation.id::text = source->>'call_id'
  where conversation.channel = 'call'
    and conversation.scorecard->>'source_revision' = source->>'source_revision'
    and conversation.scorecard->>'scorecard_revision' = source->>'scorecard_revision'
    and conversation.scorecard->>'rubric_version' = source->>'rubric_version'
    and conversation.scorecard->>'outcome' = source->>'outcome';

  if source_count < 2 or matching_sources <> source_count then
    return null;
  end if;

  insert into public.playbooks as target (
    cohort_revision, rubric_version, playbook, generated_at
  ) values (
    p_playbook->>'cohort_revision',
    p_playbook->'sources'->0->>'rubric_version',
    p_playbook,
    (p_playbook->>'generated_at')::timestamptz
  ) on conflict (cohort_revision) do update
  set rubric_version = excluded.rubric_version,
      playbook = excluded.playbook,
      generated_at = excluded.generated_at
  where target.generated_at <= excluded.generated_at;

  select playbook into strict stored
  from public.playbooks
  where cohort_revision = p_playbook->>'cohort_revision';
  return stored;
end;
$$;

revoke all on function public.store_playbook_if_current(jsonb) from public;
revoke all on function public.store_playbook_if_current(jsonb) from anon, authenticated;
grant execute on function public.store_playbook_if_current(jsonb) to service_role;
