begin;
select plan(1);

do $$
declare
  target_conversation_id uuid := gen_random_uuid();
  source_revision text;
  stored jsonb;
  source_snapshot jsonb;
  stale_rows integer;
begin
  if has_function_privilege(
      'anon', 'public.store_conversation_scorecard(text,jsonb,text)', 'execute'
    )
    or has_function_privilege(
      'authenticated', 'public.store_conversation_scorecard(text,jsonb,text)', 'execute'
    )
    or not has_function_privilege(
      'service_role', 'public.store_conversation_scorecard(text,jsonb,text)', 'execute'
    )
    or has_function_privilege('anon', 'public.read_scorecard_source(text)', 'execute')
    or has_function_privilege('authenticated', 'public.read_scorecard_source(text)', 'execute')
    or not has_function_privilege('service_role', 'public.read_scorecard_source(text)', 'execute')
  then
    raise exception 'scorecard RPC privileges are unsafe';
  end if;

  insert into public.conversations (
    id, channel, subject, direction, source_external_id, processing_status, metadata
  ) values (
    target_conversation_id, 'call', 'Scorecard migration test', 'outbound',
    'scorecard-source-test', 'ready', '{"rep":"Sam Whitfield"}'::jsonb
  );
  insert into public.transcript_segments (
    conversation_id, sequence, speaker, body, start_ms
  ) values (
    target_conversation_id, 0, 'Sam Whitfield', 'What changed?', 0
  );

  select public.scorecard_source_revision(target_conversation_id) into strict source_revision;
  select public.read_scorecard_source('scorecard-source-test') into strict source_snapshot;
  if source_snapshot->>'rep' <> 'Sam Whitfield'
    or jsonb_array_length(source_snapshot->'segments') <> 1
    or source_snapshot->>'source_revision' <> source_revision
  then
    raise exception 'canonical scorecard source snapshot is incorrect';
  end if;

  perform public.store_conversation_scorecard(
    'scorecard-source-test',
    jsonb_build_object('scored_at', '2026-09-12T02:00:00Z', 'model', 'new'),
    source_revision
  );
  update public.transcript_segments
  set body = 'What changed this week?'
  where conversation_id = target_conversation_id and sequence = 0;
  select count(*) into strict stale_rows
  from public.store_conversation_scorecard(
      target_conversation_id::text,
      jsonb_build_object('scored_at', '2026-09-12T03:00:00Z', 'model', 'stale'),
      source_revision
    );
  if stale_rows <> 0 then
    raise exception 'a stale source revision returned an updated row';
  end if;

  select scorecard into strict stored
  from public.conversations
  where id = target_conversation_id;
  if stored->>'model' <> 'new' then
    raise exception 'an older scorecard overwrote the newer result';
  end if;
end;
$$;

select pass('scorecard persistence is private and rejects stale completion order');
select * from finish();
rollback;
