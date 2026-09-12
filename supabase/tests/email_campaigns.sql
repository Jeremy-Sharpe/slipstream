begin;
select plan(1);

do $$
begin
  if has_function_privilege(
      'anon', 'public.create_email_campaign(uuid,text,timestamptz,text,uuid[])', 'execute'
    )
    or has_function_privilege(
      'authenticated', 'public.claim_due_email_campaign(uuid,integer,uuid)', 'execute'
    )
    or has_function_privilege(
      'authenticated', 'public.record_email_campaign_results(uuid,uuid,jsonb)', 'execute'
    )
    or not has_function_privilege(
      'service_role', 'public.create_email_campaign(uuid,text,timestamptz,text,uuid[])', 'execute'
    )
  then
    raise exception 'email campaign RPC privileges are unsafe';
  end if;
end;
$$;

do $$
declare
  company_id uuid := gen_random_uuid();
  contact_id uuid := gen_random_uuid();
  deal_id uuid := gen_random_uuid();
  conversation_id uuid := gen_random_uuid();
  draft_one uuid := gen_random_uuid();
  draft_two uuid := gen_random_uuid();
  draft_three uuid := gen_random_uuid();
  test_campaign_id uuid := gen_random_uuid();
  stale_campaign_id uuid := gen_random_uuid();
  owner_one uuid := gen_random_uuid();
  owner_two uuid := gen_random_uuid();
  owner_three uuid := gen_random_uuid();
  claim jsonb;
  competing jsonb;
  stored_status text;
begin
  insert into public.companies (id, name) values (company_id, 'Campaign Test');
  insert into public.contacts (id, company_id, first_name, email)
    values (contact_id, company_id, 'Casey', 'campaign@example.com');
  insert into public.deals (id, company_id, primary_contact_id, name)
    values (deal_id, company_id, contact_id, 'Campaign Test Deal');
  insert into public.conversations (
    id, deal_id, contact_id, channel, subject, direction, occurred_at,
    source_external_id, raw_content
  ) values (
    conversation_id, deal_id, contact_id, 'call', 'Campaign test', 'inbound', now(),
    'email-campaign-test', 'Synthetic campaign test'
  );
  insert into public.drafts (
    id, deal_id, conversation_id, kind, recipient_email, subject, body,
    status, approved_by, approved_at
  ) values
    (draft_one, deal_id, conversation_id, 'follow_up', 'one@example.com', 'One', 'Body',
      'approved', 'tester', now()),
    (draft_two, deal_id, conversation_id, 'follow_up', 'two@example.com', 'Two', 'Body',
      'approved', 'tester', now()),
    (draft_three, deal_id, conversation_id, 'follow_up', 'three@example.com', 'Three', 'Body',
      'approved', 'tester', now());

  perform public.create_email_campaign(
    test_campaign_id, 'Campaign test', now() - interval '1 minute', 'tester',
    array[draft_one, draft_two, draft_three]
  );
  claim := public.claim_due_email_campaign(owner_one, 2, test_campaign_id);
  competing := public.claim_due_email_campaign(owner_two, 2, test_campaign_id);
  if jsonb_array_length(claim->'draft_ids') <> 2
    or claim->'draft_ids'->>0 <> draft_one::text
    or claim->'draft_ids'->>1 <> draft_two::text
    or competing is not null
  then
    raise exception 'campaign claim was not ordered or exclusively leased';
  end if;

  perform public.record_email_campaign_results(
    test_campaign_id,
    owner_one,
    jsonb_build_array(
      jsonb_build_object(
        'draft_id', draft_one, 'state', 'sent', 'outcome', 'sent',
        'http_status', 200, 'retryable', false,
        'reconciliation_required', false,
        'receipt', jsonb_build_object('provider_message_id', 'provider-one')
      ),
      jsonb_build_object(
        'draft_id', draft_two, 'state', 'retryable', 'outcome', 'unknown',
        'http_status', 504, 'retryable', true,
        'reconciliation_required', true,
        'next_attempt_at', now() + interval '5 minutes'
      )
    )
  );
  claim := public.claim_due_email_campaign(owner_two, 8, test_campaign_id);
  if jsonb_array_length(claim->'draft_ids') <> 1
    or claim->'draft_ids'->>0 <> draft_three::text
  then
    raise exception 'campaign did not resume at the next due item';
  end if;
  perform public.record_email_campaign_results(
    test_campaign_id,
    owner_two,
    jsonb_build_array(jsonb_build_object(
      'draft_id', draft_three, 'state', 'failed', 'outcome', 'not_deliverable',
      'http_status', 409, 'retryable', false, 'reconciliation_required', false
    ))
  );
  update public.email_campaign_items
  set next_attempt_at = now() - interval '1 second'
  where email_campaign_items.campaign_id = test_campaign_id and draft_id = draft_two;
  update public.email_campaigns
  set scheduled_for = now() - interval '1 second'
  where id = test_campaign_id;
  claim := public.claim_due_email_campaign(owner_three, 8, test_campaign_id);
  perform public.record_email_campaign_results(
    test_campaign_id,
    owner_three,
    jsonb_build_array(jsonb_build_object(
      'draft_id', draft_two, 'state', 'reconcile', 'outcome', 'not_deliverable',
      'http_status', 409, 'retryable', false, 'reconciliation_required', true
    ))
  );
  select status into strict stored_status
  from public.email_campaigns where id = test_campaign_id;
  if stored_status <> 'attention'
    or (select state from public.email_campaign_items
        where campaign_id = test_campaign_id and draft_id = draft_one) <> 'sent'
    or (select attempt_count from public.email_campaign_items
        where campaign_id = test_campaign_id and draft_id = draft_two) <> 2
  then
    raise exception 'campaign result state was not resumed and aggregated safely';
  end if;

  perform public.create_email_campaign(
    stale_campaign_id, 'Stale lease test', now() - interval '1 minute', 'tester',
    array[draft_three]
  );
  claim := public.claim_due_email_campaign(owner_one, 1, stale_campaign_id);
  update public.email_campaigns
  set lease_until = now() - interval '1 second'
  where id = stale_campaign_id;
  competing := public.claim_due_email_campaign(owner_two, 1, stale_campaign_id);
  begin
    perform public.record_email_campaign_results(
      stale_campaign_id,
      owner_one,
      jsonb_build_array(jsonb_build_object(
        'draft_id', draft_three, 'state', 'sent', 'outcome', 'sent',
        'http_status', 200, 'retryable', false, 'reconciliation_required', false
      ))
    );
    raise exception 'stale campaign owner recorded results';
  exception
    when sqlstate 'PT409' then null;
  end;
  if competing->'draft_ids'->>0 <> draft_three::text then
    raise exception 'expired campaign lease was not reclaimed';
  end if;
end;
$$;

select pass('email campaigns preserve explicit membership, leasing and resumable outcomes');
select * from finish();
rollback;
