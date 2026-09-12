create or replace function public.ingest_email_conversation(payload jsonb)
returns setof public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.conversations%rowtype;
  contact_id_value uuid;
  deal_id_value uuid;
  contact_name text;
  contact_first text;
  contact_last text;
  contact_item jsonb;
begin
  if payload->>'source_external_id' is null
    or payload->>'deal_external_id' is null
    or payload->>'direction' not in ('inbound', 'outbound')
    or jsonb_typeof(payload->'metadata') <> 'object'
  then
    raise exception 'invalid email ingestion payload' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(payload->>'source_external_id', 0));

  select * into existing
  from public.conversations
  where channel = 'email'
    and source_external_id = payload->>'source_external_id'
  limit 1;
  if found then
    return next existing;
    return;
  end if;

  for contact_item in
    select value
    from jsonb_array_elements(coalesce(payload->'contacts', '[]'::jsonb))
    order by lower(value->>'email')
  loop
    contact_name := nullif(btrim(contact_item->>'name'), '');
    contact_first := coalesce(nullif(split_part(contact_name, ' ', 1), ''), split_part(contact_item->>'email', '@', 1));
    contact_last := case
      when position(' ' in coalesce(contact_name, '')) > 0
      then btrim(substr(contact_name, position(' ' in contact_name) + 1))
      else ''
    end;
    insert into public.contacts (first_name, last_name, email)
    values (contact_first, contact_last, lower(contact_item->>'email'))
    on conflict (email) do nothing
    returning id into contact_id_value;
  end loop;

  contact_id_value := null;
  if payload->>'primary_contact_email' is not null then
    select id into contact_id_value
    from public.contacts
    where email = lower(payload->>'primary_contact_email');
  end if;

  insert into public.deals (name, primary_contact_id, crm_external_id)
  values (
    payload->>'subject' || ' — email follow-up',
    contact_id_value,
    payload->>'deal_external_id'
  )
  on conflict (crm_external_id) do nothing
  returning id into deal_id_value;
  if deal_id_value is null then
    select id into deal_id_value
    from public.deals
    where crm_external_id = payload->>'deal_external_id';
  end if;

  insert into public.conversations (
    id, deal_id, contact_id, channel, subject, direction, occurred_at,
    source_external_id, raw_content, processing_status, metadata
  ) values (
    (payload->>'id')::uuid,
    deal_id_value,
    contact_id_value,
    'email',
    payload->>'subject',
    payload->>'direction',
    (payload->>'occurred_at')::timestamptz,
    payload->>'source_external_id',
    payload->>'raw_content',
    'ready',
    payload->'metadata'
  )
  returning * into existing;

  return next existing;
end;
$$;

revoke all on function public.ingest_email_conversation(jsonb) from public;
revoke all on function public.ingest_email_conversation(jsonb) from anon;
revoke all on function public.ingest_email_conversation(jsonb) from authenticated;
grant execute on function public.ingest_email_conversation(jsonb) to service_role;

create or replace function public.read_email_thread(thread_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with candidate_ids as materialized (
    select
      conversation.id,
      conversation.occurred_at,
      octet_length(to_jsonb(conversation)::text) as row_bytes
    from public.conversations as conversation
    where conversation.channel = 'email'
      and conversation.metadata @> jsonb_build_object('namespaced_thread_id', thread_id)
    order by conversation.occurred_at, conversation.id
    limit 5001
  ),
  stats as (
    select
      count(*) as message_count,
      coalesce(sum(candidate_ids.row_bytes), 0) as total_bytes
    from candidate_ids
  ),
  messages as (
    select coalesce(
      jsonb_agg(to_jsonb(conversation) order by conversation.occurred_at, conversation.id),
      '[]'::jsonb
    ) as value
    from candidate_ids
    join public.conversations as conversation using (id)
    cross join stats
    where stats.message_count <= 5000
      and stats.total_bytes <= 8388608
  )
  select jsonb_build_object(
    'messages', messages.value,
    'overflow', stats.message_count > 5000 or stats.total_bytes > 8388608
  )
  from stats
  cross join messages;
$$;

revoke all on function public.read_email_thread(text) from public;
revoke all on function public.read_email_thread(text) from anon;
revoke all on function public.read_email_thread(text) from authenticated;
grant execute on function public.read_email_thread(text) to service_role;
