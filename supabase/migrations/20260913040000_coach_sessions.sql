-- Private capability-authenticated demo sessions; never expose token hashes through public reads.
create table public.coach_sessions (
  id uuid primary key,
  version bigint not null check (version > 0),
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  status text not null check (status in ('ready', 'live', 'paused', 'ended')),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create index coach_sessions_deal_idx on public.coach_sessions(deal_id);
create index coach_sessions_contact_idx on public.coach_sessions(contact_id);
create index coach_sessions_conversation_idx on public.coach_sessions(conversation_id);
create index coach_sessions_updated_idx on public.coach_sessions(updated_at);
create table public.coach_events (
  session_id uuid not null references public.coach_sessions(id) on delete cascade,
  version bigint not null,
  kind text not null,
  state_revision bigint not null,
  created_at timestamptz not null default now(),
  primary key (session_id, version)
);
alter table public.coach_sessions enable row level security;
alter table public.coach_events enable row level security;
revoke all on public.coach_sessions, public.coach_events from anon, authenticated;
grant all on public.coach_sessions, public.coach_events to service_role;

create or replace function public.save_coach_session(
  session_id uuid, expected_version bigint, session_payload jsonb, event_kind text
) returns void language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  if (session_payload->>'id')::uuid <> session_id
     or (session_payload->>'version')::bigint <> expected_version + 1 then
    raise exception 'Invalid coach version';
  end if;
  if expected_version = 0 then
    insert into public.coach_sessions(id, version, contact_id, deal_id, conversation_id, status, payload)
    values(session_id, 1, (session_payload->>'contact_id')::uuid,
      (session_payload->>'deal_id')::uuid, (session_payload->>'conversation_id')::uuid,
      session_payload->>'status', session_payload);
  else
    update public.coach_sessions set version = expected_version + 1,
      conversation_id = (session_payload->>'conversation_id')::uuid,
      status = session_payload->>'status', payload = session_payload, updated_at = now()
    where id = session_id and version = expected_version;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Coach session revision conflict'; end if;
  end if;
  insert into public.coach_events(session_id, version, kind, state_revision)
    values(session_id, expected_version + 1, event_kind,
      (session_payload->'state'->>'revision')::bigint);
end;
$$;
revoke all on function public.save_coach_session(uuid,bigint,jsonb,text) from public, anon, authenticated;
grant execute on function public.save_coach_session(uuid,bigint,jsonb,text) to service_role;

-- Private recordings are attached to the canonical conversation; no new call is created on retry.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('coach-recordings','coach-recordings',false,52428800,array['audio/webm','audio/wav'])
on conflict (id) do nothing;
