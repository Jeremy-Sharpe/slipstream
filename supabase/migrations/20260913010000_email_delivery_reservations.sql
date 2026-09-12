-- Count provider-invocation transitions without introducing a new state value,
-- so this migration can land before the new API while old instances keep
-- accepting the existing pending/unknown/sent contract. Existing rows are
-- conservatively treated as having reached the provider at least once.
alter table public.email_delivery_attempts
  add column submission_count integer not null default 1
  check (submission_count >= 0);

create or replace function public.claim_email_delivery_v2(
  requested_draft_id uuid,
  requested_idempotency_key text,
  requested_payload_sha256 text,
  requested_sender text,
  requested_recipient_email text,
  requested_subject text,
  requested_body text,
  requested_owner uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_draft public.drafts%rowtype;
  attempt public.email_delivery_attempts%rowtype;
  may_send boolean := false;
  fresh boolean := false;
  had_prior_submission boolean := false;
  claimed_at timestamptz := clock_timestamp();
begin
  select * into selected_draft
  from public.drafts
  where id = requested_draft_id
  for update;
  if not found then
    raise sqlstate 'PT412' using message = 'draft not found';
  end if;
  if selected_draft.status = 'sent' and not exists (
    select 1 from public.email_delivery_attempts where draft_id = requested_draft_id
  ) then
    raise sqlstate 'PT409' using message = 'sent draft has no delivery receipt';
  end if;
  if selected_draft.status not in ('approved', 'sent') then
    raise sqlstate 'PT412' using message = 'draft is not approved';
  end if;
  if selected_draft.recipient_email is distinct from requested_recipient_email
    or selected_draft.subject is distinct from requested_subject
    or selected_draft.body is distinct from requested_body
  then
    raise sqlstate 'PT412' using message = 'approved draft content changed';
  end if;

  insert into public.email_delivery_attempts (
    draft_id, idempotency_key, payload_sha256, sender, recipient_email,
    subject, body, attempt_owner, first_attempt_at, last_attempt_at, submission_count
  ) values (
    requested_draft_id, requested_idempotency_key, requested_payload_sha256,
    requested_sender, requested_recipient_email, requested_subject, requested_body,
    requested_owner, claimed_at, claimed_at, 0
  ) on conflict (draft_id) do nothing
  returning true into fresh;
  fresh := coalesce(fresh, false);

  select * into strict attempt
  from public.email_delivery_attempts
  where draft_id = requested_draft_id
  for update;
  had_prior_submission := attempt.submission_count > 0;

  if attempt.submission_count = 0 and (
    attempt.idempotency_key <> requested_idempotency_key
    or attempt.payload_sha256 <> requested_payload_sha256
    or attempt.sender <> requested_sender
    or attempt.recipient_email <> requested_recipient_email
    or attempt.subject <> requested_subject
    or attempt.body <> requested_body
  ) then
    if attempt.attempt_owner <> requested_owner
      and attempt.last_attempt_at > clock_timestamp() - interval '30 seconds'
    then
      raise sqlstate 'PT423' using message = 'delivery reservation is active';
    end if;
    update public.email_delivery_attempts
    set idempotency_key = requested_idempotency_key,
        payload_sha256 = requested_payload_sha256,
        sender = requested_sender,
        recipient_email = requested_recipient_email,
        subject = requested_subject,
        body = requested_body,
        attempt_owner = requested_owner,
        first_attempt_at = claimed_at,
        last_attempt_at = claimed_at
    where draft_id = requested_draft_id
    returning * into strict attempt;
    fresh := true;
  end if;

  if attempt.idempotency_key <> requested_idempotency_key
    or attempt.payload_sha256 <> requested_payload_sha256
    or attempt.sender <> requested_sender
    or attempt.recipient_email <> requested_recipient_email
    or attempt.subject <> requested_subject
    or attempt.body <> requested_body
  then
    raise sqlstate 'PT409' using message = 'delivery identity does not match persisted attempt';
  end if;

  if attempt.state = 'sent' then
    may_send := false;
  elsif attempt.submission_count > 0
    and attempt.state in ('pending', 'unknown')
    and attempt.first_attempt_at <= clock_timestamp() - interval '23 hours 55 minutes'
  then
    may_send := false;
  elsif attempt.attempt_owner = requested_owner
    or attempt.last_attempt_at <= clock_timestamp() - interval '30 seconds'
    or attempt.state = 'unknown'
  then
    update public.email_delivery_attempts
    set state = 'pending', attempt_owner = requested_owner,
        last_attempt_at = case when fresh then claimed_at else clock_timestamp() end
    where draft_id = requested_draft_id
    returning * into strict attempt;
    may_send := true;
  end if;

  return to_jsonb(attempt) || jsonb_build_object(
    'may_send', may_send,
    'expired', attempt.submission_count > 0
      and attempt.state in ('pending', 'unknown')
      and attempt.first_attempt_at <= clock_timestamp() - interval '23 hours 55 minutes',
    'fresh', fresh,
    'had_prior_submission', had_prior_submission,
    'submission_count', attempt.submission_count
  );
end;
$$;

-- Keep the original RPC safe during a migration-first rolling deploy. Legacy
-- API instances claim and start in one transaction, so they can never submit a
-- zero-count reservation created by a newer instance.
create or replace function public.claim_email_delivery(
  requested_draft_id uuid,
  requested_idempotency_key text,
  requested_payload_sha256 text,
  requested_sender text,
  requested_recipient_email text,
  requested_subject text,
  requested_body text,
  requested_owner uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  attempt public.email_delivery_attempts%rowtype;
begin
  result := public.claim_email_delivery_v2(
    requested_draft_id,
    requested_idempotency_key,
    requested_payload_sha256,
    requested_sender,
    requested_recipient_email,
    requested_subject,
    requested_body,
    requested_owner
  );
  if (result->>'may_send')::boolean then
    perform public.start_email_delivery_attempt(requested_draft_id, requested_owner);
    select * into strict attempt
    from public.email_delivery_attempts
    where draft_id = requested_draft_id;
    result := to_jsonb(attempt) || jsonb_build_object(
      'may_send', true,
      'expired', false
    );
  end if;
  return result;
end;
$$;

create or replace function public.release_email_delivery_reservation(
  requested_draft_id uuid,
  requested_owner uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.email_delivery_attempts
  where draft_id = requested_draft_id
    and attempt_owner = requested_owner
    and state = 'pending'
    and submission_count = 0;
$$;

create or replace function public.start_email_delivery_attempt(
  requested_draft_id uuid,
  requested_owner uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_draft public.drafts%rowtype;
  attempt public.email_delivery_attempts%rowtype;
begin
  select * into strict selected_draft
  from public.drafts
  where id = requested_draft_id
  for update;
  select * into strict attempt
  from public.email_delivery_attempts
  where draft_id = requested_draft_id
  for update;
  if selected_draft.status <> 'approved'
    or selected_draft.recipient_email is distinct from attempt.recipient_email
    or selected_draft.subject is distinct from attempt.subject
    or selected_draft.body is distinct from attempt.body
  then
    raise sqlstate 'PT412' using message = 'approved draft changed before provider submission';
  end if;
  update public.email_delivery_attempts
  set first_attempt_at = case
        when submission_count = 0 then clock_timestamp()
        else first_attempt_at
      end,
      state = 'pending',
      last_attempt_at = clock_timestamp(),
      submission_count = submission_count + 1
  where draft_id = requested_draft_id
    and attempt_owner = requested_owner
    and state = 'pending';
  if not found then
    raise sqlstate 'PT423' using message = 'delivery reservation is not owned by this request';
  end if;
end;
$$;

create or replace function public.release_email_delivery_unsubmitted_attempt(
  requested_draft_id uuid,
  requested_owner uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.email_delivery_attempts
  where draft_id = requested_draft_id
    and attempt_owner = requested_owner
    and state = 'pending'
    and submission_count in (0, 1);
$$;

create or replace function public.protect_armed_email_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.email_delivery_attempts a
    where a.draft_id = old.id
      and a.submission_count > 0
      and a.state in ('pending', 'unknown')
  ) and (
    new.recipient_email is distinct from old.recipient_email
    or new.subject is distinct from old.subject
    or new.body is distinct from old.body
    or (
      new.status is distinct from old.status
      and not (old.status = 'approved' and new.status = 'sent')
    )
  ) then
    raise sqlstate 'PT423' using message = 'draft has an armed email delivery';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_armed_email_delivery on public.drafts;
create trigger protect_armed_email_delivery
before update on public.drafts
for each row execute function public.protect_armed_email_delivery();

revoke all on function public.claim_email_delivery_v2(uuid, text, text, text, text, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.claim_email_delivery(uuid, text, text, text, text, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.release_email_delivery_reservation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.start_email_delivery_attempt(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.release_email_delivery_unsubmitted_attempt(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.protect_armed_email_delivery()
  from public, anon, authenticated;
grant execute on function public.claim_email_delivery_v2(uuid, text, text, text, text, text, text, uuid)
  to service_role;
grant execute on function public.claim_email_delivery(uuid, text, text, text, text, text, text, uuid)
  to service_role;
grant execute on function public.release_email_delivery_reservation(uuid, uuid)
  to service_role;
grant execute on function public.start_email_delivery_attempt(uuid, uuid)
  to service_role;
grant execute on function public.release_email_delivery_unsubmitted_attempt(uuid, uuid)
  to service_role;
