begin;
select plan(1);

do $$
declare
  company_id uuid := gen_random_uuid();
  contact_id uuid := gen_random_uuid();
  deal_id uuid := gen_random_uuid();
  conversation_id uuid := gen_random_uuid();
  draft_id uuid := gen_random_uuid();
  test_campaign_id uuid := gen_random_uuid();
  campaign_status text;
begin
  if has_function_privilege(
      'anon', 'public.set_email_campaign_paused(uuid,boolean)', 'execute'
    )
    or has_function_privilege(
      'authenticated', 'public.set_email_campaign_paused(uuid,boolean)', 'execute'
    )
    or not has_function_privilege(
      'service_role', 'public.set_email_campaign_paused(uuid,boolean)', 'execute'
    )
  then
    raise exception 'campaign control RPC privileges are unsafe';
  end if;

  insert into public.companies (id, name) values (company_id, 'Control Test');
  insert into public.contacts (id, company_id, first_name, email)
    values (contact_id, company_id, 'Casey', 'control@example.com');
  insert into public.deals (id, company_id, primary_contact_id, name)
    values (deal_id, company_id, contact_id, 'Control Test Deal');
  insert into public.conversations (
    id, deal_id, contact_id, channel, subject, direction, occurred_at,
    source_external_id, raw_content
  ) values (
    conversation_id, deal_id, contact_id, 'call', 'Control test', 'inbound', now(),
    'email-campaign-control-test', 'Synthetic campaign control test'
  );
  insert into public.drafts (
    id, deal_id, conversation_id, kind, recipient_email, subject, body,
    status, approved_by, approved_at
  ) values (
    draft_id, deal_id, conversation_id, 'follow_up', 'control@example.com',
    'Control', 'Body', 'approved', 'tester', now()
  );
  perform public.create_email_campaign(
    test_campaign_id, 'Control test', now() - interval '1 minute', 'tester', array[draft_id]
  );

  perform public.set_email_campaign_paused(test_campaign_id, true);
  if public.claim_due_email_campaign(gen_random_uuid(), 1, test_campaign_id) is not null then
    raise exception 'paused campaign was claimable';
  end if;
  perform public.set_email_campaign_paused(test_campaign_id, true);
  perform public.set_email_campaign_paused(test_campaign_id, false);
  perform public.set_email_campaign_paused(test_campaign_id, false);
  select status into strict campaign_status
  from public.email_campaigns where id = test_campaign_id;
  if campaign_status <> 'scheduled'
    or public.claim_due_email_campaign(gen_random_uuid(), 1, test_campaign_id) is null
  then
    raise exception 'resumed campaign was not claimable';
  end if;

  begin
    perform public.set_email_campaign_paused(gen_random_uuid(), true);
    raise exception 'missing campaign was paused';
  exception when sqlstate 'PT404' then null;
  end;
  begin
    perform public.set_email_campaign_paused(test_campaign_id, true);
    raise exception 'running campaign was paused';
  exception when sqlstate 'PT409' then null;
  end;
end;
$$;

select pass('campaign controls are private, idempotent and preserve unfinished work');
select * from finish();
rollback;
