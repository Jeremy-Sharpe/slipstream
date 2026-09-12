create or replace function public.scorecard_source_revision(p_conversation_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(
    extensions.digest(
      jsonb_build_object(
        'conversation_updated_at', conversation.updated_at,
        'rep', coalesce(conversation.metadata->>'rep', deal.owner_name),
        'deal_updated_at', deal.updated_at,
        'outcome', deal.outcome,
        'segments', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'sequence', segment.sequence,
              'speaker', segment.speaker,
              'body', segment.body
            ) order by segment.sequence
          )
          from public.transcript_segments as segment
          where segment.conversation_id = conversation.id
        ), '[]'::jsonb)
      )::text,
      'sha256'
    ),
    'hex'
  )
  from public.conversations as conversation
  left join public.deals as deal on deal.id = conversation.deal_id
  where conversation.id = p_conversation_id;
$$;

create or replace function public.read_scorecard_source(p_call_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select conversation.*
    from public.conversations as conversation
    where conversation.channel = 'call'
      and (
        conversation.source_external_id = p_call_id
        or conversation.id::text = p_call_id
      )
    order by (conversation.id::text = p_call_id) desc
    limit 1
  )
  select jsonb_build_object(
    'id', target.id,
    'processing_status', target.processing_status,
    'rep', coalesce(target.metadata->>'rep', deal.owner_name),
    'outcome', case
      when deal.outcome in ('won', 'lost', 'stalled') then deal.outcome
      else null
    end,
    'segments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'sequence', segment.sequence,
          'speaker', segment.speaker,
          'body', segment.body
        ) order by segment.sequence
      )
      from public.transcript_segments as segment
      where segment.conversation_id = target.id
    ), '[]'::jsonb),
    'source_revision', public.scorecard_source_revision(target.id)
  )
  from target
  left join public.deals as deal on deal.id = target.deal_id;
$$;

create or replace function public.store_conversation_scorecard(
  p_call_id text,
  p_scorecard jsonb,
  p_source_revision text
)
returns setof public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if nullif(btrim(p_call_id), '') is null
    or jsonb_typeof(p_scorecard) <> 'object'
    or nullif(p_scorecard->>'scored_at', '') is null
    or nullif(btrim(p_source_revision), '') is null
  then
    raise exception 'invalid scorecard payload';
  end if;

  select conversation.id
  into target_id
  from public.conversations as conversation
  where conversation.channel = 'call'
    and (
      conversation.source_external_id = p_call_id
      or conversation.id::text = p_call_id
    )
  order by (conversation.id::text = p_call_id) desc
  limit 1
  for update;

  if target_id is null then
    return;
  end if;

  return query
  update public.conversations as conversation
  set scorecard = p_scorecard
  where conversation.id = target_id
    and public.scorecard_source_revision(target_id) = p_source_revision
  returning conversation.*;
end;
$$;

revoke all on function public.scorecard_source_revision(uuid) from public;
revoke all on function public.scorecard_source_revision(uuid) from anon, authenticated;
revoke all on function public.read_scorecard_source(text) from public;
revoke all on function public.read_scorecard_source(text) from anon, authenticated;
revoke all on function public.store_conversation_scorecard(text, jsonb, text) from public;
revoke all on function public.store_conversation_scorecard(text, jsonb, text) from anon, authenticated;
grant execute on function public.read_scorecard_source(text) to service_role;
grant execute on function public.store_conversation_scorecard(text, jsonb, text) to service_role;
