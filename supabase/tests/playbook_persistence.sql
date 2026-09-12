begin;
select plan(1);

do $$
declare
  revision text := repeat('a', 64);
  stored jsonb;
begin
  if has_table_privilege('anon', 'public.playbooks', 'select')
    or has_table_privilege('anon', 'public.playbooks', 'insert')
    or has_table_privilege('authenticated', 'public.playbooks', 'select')
    or has_table_privilege('authenticated', 'public.playbooks', 'insert')
    or not has_table_privilege('service_role', 'public.playbooks', 'select')
    or not has_table_privilege('service_role', 'public.playbooks', 'insert')
    or not has_table_privilege('service_role', 'public.playbooks', 'update')
    or has_function_privilege('anon', 'public.store_playbook_if_current(jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.store_playbook_if_current(jsonb)', 'execute')
    or not has_function_privilege('service_role', 'public.store_playbook_if_current(jsonb)', 'execute')
  then
    raise exception 'playbook table privileges are unsafe';
  end if;

  insert into public.playbooks (
    cohort_revision, rubric_version, playbook, generated_at
  ) values (
    revision,
    'v1',
    jsonb_build_object('cohort_revision', revision, 'model', 'newer'),
    '2026-09-12T03:00:00Z'
  );
  insert into public.playbooks as target (
    cohort_revision, rubric_version, playbook, generated_at
  ) values (
    revision,
    'v1',
    jsonb_build_object('cohort_revision', revision, 'model', 'older'),
    '2026-09-12T02:00:00Z'
  ) on conflict (cohort_revision) do update
  set playbook = excluded.playbook,
      generated_at = excluded.generated_at
  where target.generated_at <= excluded.generated_at;

  select playbook into strict stored
  from public.playbooks
  where cohort_revision = revision;
  if stored->>'model' <> 'newer'
    or (select count(*) from public.playbooks where cohort_revision = revision) <> 1
  then
    raise exception 'cohort upsert did not retain one latest playbook';
  end if;
end;
$$;

select pass('playbook persistence is private and idempotent per cohort revision');
select * from finish();
rollback;
