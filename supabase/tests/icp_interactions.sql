begin;
select plan(1);

do $$
declare
  target_deal_id uuid;
  other_deal_id uuid;
  busy_interactions integer;
  other_interactions integer;
begin
  if has_function_privilege('anon', 'public.read_icp_deals(boolean)', 'execute')
    or has_function_privilege('authenticated', 'public.read_icp_deals(boolean)', 'execute')
    or not has_function_privilege('service_role', 'public.read_icp_deals(boolean)', 'execute')
  then
    raise exception 'ICP deal RPC privileges are unsafe';
  end if;

  insert into public.deals (name, crm_external_id)
  values ('Busy', 'icp-test-busy') returning id into target_deal_id;
  insert into public.deals (name, crm_external_id)
  values ('Other', 'icp-test-other') returning id into other_deal_id;

  for index in 1..12 loop
    insert into public.conversations (
      deal_id, channel, subject, source_external_id, raw_content, occurred_at
    ) values (
      target_deal_id, 'email', 'Busy', 'icp-test-busy-' || index, 'Evidence',
      '2026-09-12T10:00:00Z'::timestamptz + (index || ' minutes')::interval
    );
  end loop;
  insert into public.conversations (
    deal_id, channel, subject, source_external_id, raw_content, occurred_at
  ) values (
    other_deal_id, 'call', 'Other', 'icp-test-other-1', 'Evidence',
    '2026-09-12T09:00:00Z'
  );

  select jsonb_array_length(item->'interactions') into strict busy_interactions
  from public.read_icp_deals(false) as rows(item)
  where item->>'id' = target_deal_id::text;
  select jsonb_array_length(item->'interactions') into strict other_interactions
  from public.read_icp_deals(false) as rows(item)
  where item->>'id' = other_deal_id::text;

  if busy_interactions <> 10 or other_interactions <> 1 then
    raise exception 'per-deal evidence bounds starved another CRM deal';
  end if;
end;
$$;

select pass('ICP deal evidence is private, eligible and bounded per deal');
select * from finish();
rollback;
