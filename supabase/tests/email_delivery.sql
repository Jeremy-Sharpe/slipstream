begin;
select plan(1);

do $$
begin
  if has_function_privilege('anon', 'public.claim_email_delivery(uuid,text,text,text,text,text,text,uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.complete_email_delivery(uuid,uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.approve_outreach_draft(uuid,text)', 'execute')
    or not has_function_privilege('service_role', 'public.claim_email_delivery(uuid,text,text,text,text,text,text,uuid)', 'execute')
  then
    raise exception 'email delivery RPC privileges are unsafe';
  end if;
end;
$$;

do $$
declare
  company_id uuid := gen_random_uuid();
  contact_id uuid := gen_random_uuid();
  deal_id uuid := gen_random_uuid();
  conversation_id uuid := gen_random_uuid();
  test_draft_id uuid := gen_random_uuid();
  owner_id uuid := gen_random_uuid();
  lead_id uuid := gen_random_uuid();
  outreach_draft_id uuid := gen_random_uuid();
  outreach_owner_id uuid := gen_random_uuid();
  legacy_sent_draft_id uuid := gen_random_uuid();
  contacted_lead_id uuid := gen_random_uuid();
  contacted_draft_id uuid := gen_random_uuid();
  claim jsonb;
  repeated jsonb;
  completed jsonb;
  lead_state public.lead_status;
  draft_state public.draft_status;
begin
  insert into public.companies (id, name) values (company_id, 'Delivery Test');
  insert into public.contacts (id, company_id, first_name, email)
    values (contact_id, company_id, 'Casey', 'casey@example.com');
  insert into public.deals (id, company_id, primary_contact_id, name)
    values (deal_id, company_id, contact_id, 'Delivery Test Deal');
  insert into public.conversations (
    id, deal_id, contact_id, channel, subject, direction, occurred_at,
    source_external_id, raw_content
  ) values (
    conversation_id, deal_id, contact_id, 'call', 'Delivery test', 'inbound', now(),
    'email-delivery-test', 'Synthetic test'
  );
  insert into public.drafts (
    id, deal_id, conversation_id, kind, recipient_email, subject, body,
    status, approved_by, approved_at
  ) values (
    test_draft_id, deal_id, conversation_id, 'follow_up', 'casey@example.com', 'Hello', 'Body',
    'approved', 'tester', now()
  );

  claim := public.claim_email_delivery(
    test_draft_id, 'delivery-key', repeat('a', 64), 'sales@example.com',
    'casey@example.com', 'Hello', 'Body', owner_id
  );
  repeated := public.claim_email_delivery(
    test_draft_id, 'delivery-key', repeat('a', 64), 'sales@example.com',
    'casey@example.com', 'Hello', 'Body', gen_random_uuid()
  );
  if (claim->>'may_send')::boolean is not true
    or (repeated->>'may_send')::boolean is not false
  then
    raise exception 'delivery claim did not serialize concurrent workers';
  end if;

  completed := public.complete_email_delivery(test_draft_id, owner_id, 'provider-id-1');
  select status into strict draft_state from public.drafts where id = test_draft_id;
  if draft_state <> 'sent' or completed->>'state' <> 'sent'
    or not exists (
      select 1 from public.activities where fixture_key = 'draft-delivered:' || test_draft_id
    )
  then
    raise exception 'delivery completion was not atomic';
  end if;

  repeated := public.claim_email_delivery(
    test_draft_id, 'delivery-key', repeat('a', 64), 'sales@example.com',
    'casey@example.com', 'Hello', 'Body', gen_random_uuid()
  );
  if (repeated->>'may_send')::boolean is not false
    or repeated->>'provider_message_id' <> 'provider-id-1'
  then
    raise exception 'completed delivery receipt was not durable';
  end if;

  update public.email_delivery_attempts
  set state = 'unknown', provider_message_id = null, sent_at = null,
      first_attempt_at = now() - interval '25 hours'
  where draft_id = test_draft_id;
  repeated := public.claim_email_delivery(
    test_draft_id, 'delivery-key', repeat('a', 64), 'sales@example.com',
    'casey@example.com', 'Hello', 'Body', gen_random_uuid()
  );
  if (repeated->>'expired')::boolean is not true
    or (repeated->>'may_send')::boolean is not false
  then
    raise exception 'expired ambiguous delivery was not blocked';
  end if;

  insert into public.leads (id, company_name, email, origami_row_id, status)
    values (lead_id, 'Lead Test', 'lead@example.com', 'delivery-lead-row', 'approved');
  insert into public.drafts (
    id, lead_id, kind, recipient_email, subject, body, status, approved_by, approved_at
  ) values (
    outreach_draft_id, lead_id, 'outreach', 'lead@example.com', 'Hello', 'Body',
    'draft', null, null
  );
  completed := public.approve_outreach_draft(outreach_draft_id, 'tester');
  select status into strict lead_state from public.leads where id = lead_id;
  if completed->>'status' <> 'approved' or lead_state <> 'approved'
    or not exists (
      select 1 from public.activities
      where fixture_key = 'outreach-approved:' || outreach_draft_id
    )
  then
    raise exception 'outreach approval was not atomic';
  end if;
  claim := public.claim_email_delivery(
    outreach_draft_id, 'outreach-delivery-key', repeat('b', 64), 'sales@example.com',
    'lead@example.com', 'Hello', 'Body', outreach_owner_id
  );
  completed := public.complete_email_delivery(
    outreach_draft_id, outreach_owner_id, 'provider-id-2'
  );
  select status into strict lead_state from public.leads where id = lead_id;
  if lead_state <> 'contacted' or completed->>'state' <> 'sent' then
    raise exception 'outreach delivery did not mark its durable lead contacted';
  end if;
  completed := public.approve_outreach_draft(outreach_draft_id, 'delayed-worker');
  select status into strict lead_state from public.leads where id = lead_id;
  if completed->>'status' <> 'sent' or lead_state <> 'contacted' then
    raise exception 'delayed approval overwrote completed delivery';
  end if;

  insert into public.leads (id, company_name, email, origami_row_id, status)
    values (
      contacted_lead_id, 'Already Contacted', 'contacted@example.com',
      'delivery-contacted-row', 'contacted'
    );
  insert into public.drafts (id, lead_id, kind, subject, body, status)
    values (contacted_draft_id, contacted_lead_id, 'outreach', 'Hello', 'Body', 'draft');
  completed := public.approve_outreach_draft(contacted_draft_id, 'tester');
  select status into strict lead_state from public.leads where id = contacted_lead_id;
  if lead_state <> 'contacted' then
    raise exception 'approval downgraded a legitimately contacted lead';
  end if;

  insert into public.drafts (
    id, deal_id, conversation_id, kind, recipient_email, subject, body,
    status, approved_by, approved_at, sent_at
  ) values (
    legacy_sent_draft_id, deal_id, conversation_id, 'follow_up',
    'casey@example.com', 'Legacy', 'Body', 'sent', 'legacy', now(), now()
  );
  begin
    claim := public.claim_email_delivery(
      legacy_sent_draft_id, 'legacy-key', repeat('c', 64), 'sales@example.com',
      'casey@example.com', 'Legacy', 'Body', gen_random_uuid()
    );
    raise exception 'ledgerless sent draft was authorized';
  exception
    when sqlstate 'PT409' then null;
  end;
end;
$$;

select pass('email delivery migration preserves claim and completion invariants');
select * from finish();
rollback;
