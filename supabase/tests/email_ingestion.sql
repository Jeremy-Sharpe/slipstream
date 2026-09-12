begin;
select plan(1);

do $$
begin
  if has_function_privilege('anon', 'public.ingest_email_conversation(jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.ingest_email_conversation(jsonb)', 'execute')
    or has_function_privilege('anon', 'public.read_email_thread(text)', 'execute')
    or has_function_privilege('authenticated', 'public.read_email_thread(text)', 'execute')
    or not has_function_privilege('service_role', 'public.ingest_email_conversation(jsonb)', 'execute')
    or not has_function_privilege('service_role', 'public.read_email_thread(text)', 'execute')
  then
    raise exception 'email RPC privileges are unsafe';
  end if;
end;
$$;

insert into public.contacts (first_name, last_name, email)
values ('Curated', 'Name', 'email-migration-test@example.com');

do $$
declare
  payload jsonb := jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000101',
    'source_external_id', 'email:test:source:one',
    'deal_external_id', 'email:test:deal:one',
    'direction', 'inbound',
    'subject', 'Migration test',
    'occurred_at', '2026-09-12T10:00:00Z',
    'raw_content', 'Test body',
    'primary_contact_email', 'email-migration-test@example.com',
    'contacts', jsonb_build_array(jsonb_build_object(
      'email', 'email-migration-test@example.com',
      'name', 'Overwrite Attempt'
    )),
    'metadata', jsonb_build_object('namespaced_thread_id', 'email:test:thread:one')
  );
  first_id uuid;
  repeated_id uuid;
  preserved_name text;
begin
  select id into strict first_id from public.ingest_email_conversation(payload);
  select id into strict repeated_id from public.ingest_email_conversation(payload);
  if first_id <> repeated_id then
    raise exception 'email ingestion is not idempotent';
  end if;

  select first_name into strict preserved_name
  from public.contacts
  where email = 'email-migration-test@example.com';
  if preserved_name <> 'Curated' then
    raise exception 'email ingestion overwrote a curated CRM contact';
  end if;
end;
$$;

do $$
declare
  contacts_before bigint;
  deals_before bigint;
  contacts_after bigint;
  deals_after bigint;
begin
  select count(*) into contacts_before from public.contacts;
  select count(*) into deals_before from public.deals;

  begin
    perform public.ingest_email_conversation(jsonb_build_object(
      'id', '00000000-0000-4000-8000-000000000102',
      'source_external_id', 'email:test:source:rollback',
      'deal_external_id', 'email:test:deal:rollback',
      'direction', 'inbound',
      'subject', null,
      'occurred_at', '2026-09-12T10:00:00Z',
      'raw_content', 'Test body',
      'primary_contact_email', 'email-rollback-test@example.com',
      'contacts', jsonb_build_array(jsonb_build_object(
        'email', 'email-rollback-test@example.com',
        'name', 'Rollback Test'
      )),
      'metadata', jsonb_build_object('namespaced_thread_id', 'email:test:thread:rollback')
    ));
    raise exception 'invalid ingestion unexpectedly succeeded';
  exception
    when not_null_violation then null;
  end;

  select count(*) into contacts_after from public.contacts;
  select count(*) into deals_after from public.deals;
  if contacts_before <> contacts_after or deals_before <> deals_after then
    raise exception 'failed ingestion did not roll back atomically';
  end if;
end;
$$;

insert into public.conversations (
  id, channel, subject, direction, occurred_at, source_external_id,
  raw_content, processing_status, metadata
)
select
  gen_random_uuid(),
  'email',
  'Boundary test',
  'inbound',
  '2026-09-12T11:00:00Z'::timestamptz + (sequence || ' milliseconds')::interval,
  'email:test:bulk:' || sequence,
  'Test body',
  'ready',
  jsonb_build_object('namespaced_thread_id', 'email:test:thread:bulk')
from generate_series(1, 5001) as sequence;

do $$
declare
  snapshot jsonb;
begin
  select public.read_email_thread('email:test:thread:bulk') into strict snapshot;
  if jsonb_array_length(snapshot->'messages') <> 0
    or (snapshot->>'overflow')::boolean is not true
  then
    raise exception '5,001-message overflow snapshot is incorrect';
  end if;

  delete from public.conversations
  where source_external_id = 'email:test:bulk:5001';
  select public.read_email_thread('email:test:thread:bulk') into strict snapshot;
  if jsonb_array_length(snapshot->'messages') <> 5000
    or (snapshot->>'overflow')::boolean is not false
  then
    raise exception '5,000-message boundary snapshot is incorrect';
  end if;

  insert into public.conversations (
    id, channel, subject, direction, occurred_at, source_external_id,
    raw_content, processing_status, metadata
  )
  select
    gen_random_uuid(),
    'email',
    'Byte boundary test',
    'inbound',
    '2026-09-12T12:00:00Z'::timestamptz + (sequence || ' milliseconds')::interval,
    'email:test:large:' || sequence,
    repeat('x', 100000),
    'ready',
    jsonb_build_object('namespaced_thread_id', 'email:test:thread:large')
  from generate_series(1, 84) as sequence;

  select public.read_email_thread('email:test:thread:large') into strict snapshot;
  if jsonb_array_length(snapshot->'messages') <> 0
    or (snapshot->>'overflow')::boolean is not true
  then
    raise exception 'thread byte budget did not fail closed';
  end if;
end;
$$;

select pass('email ingestion migration preserves its database invariants');
select * from finish();
rollback;
