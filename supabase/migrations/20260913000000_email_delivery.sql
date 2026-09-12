-- Earlier builds used `sent` to mean a simulated approval. No delivery adapter
-- existed, so rows without a delivery audit are safely restored to `approved`.
update public.drafts d
set status = 'approved', sent_at = null
where d.status = 'sent'
  and not exists (
    select 1 from public.activities a
    where a.fixture_key = 'draft-delivered:' || d.id
  );

create table public.email_delivery_attempts (
  draft_id uuid primary key references public.drafts(id) on delete cascade,
  idempotency_key text not null unique check (char_length(idempotency_key) between 1 and 256),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  sender text not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  state text not null default 'pending' check (state in ('pending', 'unknown', 'sent')),
  attempt_owner uuid not null,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  provider_message_id text,
  sent_at timestamptz,
  check (
    (state = 'sent' and nullif(btrim(provider_message_id), '') is not null and sent_at is not null)
    or (state in ('pending', 'unknown') and provider_message_id is null and sent_at is null)
  )
);

alter table public.email_delivery_attempts enable row level security;
revoke all on public.email_delivery_attempts from anon, authenticated;
grant all on public.email_delivery_attempts to service_role;

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
  selected_draft public.drafts%rowtype;
  attempt public.email_delivery_attempts%rowtype;
  may_send boolean := false;
begin
  select * into selected_draft
  from public.drafts
  where id = requested_draft_id
  for update;
  if not found then
    raise exception 'draft not found';
  end if;
  if selected_draft.status = 'sent' and not exists (
    select 1 from public.email_delivery_attempts where draft_id = requested_draft_id
  ) then
    raise sqlstate 'PT409' using message = 'sent draft has no delivery receipt';
  end if;
  if selected_draft.status not in ('approved', 'sent') then
    raise sqlstate 'PT409' using message = 'draft is not approved';
  end if;
  if selected_draft.recipient_email is distinct from requested_recipient_email
    or selected_draft.subject is distinct from requested_subject
    or selected_draft.body is distinct from requested_body
  then
    raise sqlstate 'PT409' using message = 'approved draft content changed';
  end if;

  insert into public.email_delivery_attempts (
    draft_id, idempotency_key, payload_sha256, sender, recipient_email,
    subject, body, attempt_owner, first_attempt_at, last_attempt_at
  ) values (
    requested_draft_id, requested_idempotency_key, requested_payload_sha256,
    requested_sender, requested_recipient_email, requested_subject, requested_body,
    requested_owner, clock_timestamp(), clock_timestamp()
  ) on conflict (draft_id) do nothing;

  select * into strict attempt
  from public.email_delivery_attempts
  where draft_id = requested_draft_id
  for update;

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
  elsif attempt.first_attempt_at <= clock_timestamp() - interval '23 hours 55 minutes' then
    may_send := false;
  elsif attempt.attempt_owner = requested_owner
    or attempt.last_attempt_at <= clock_timestamp() - interval '30 seconds'
    or attempt.state = 'unknown'
  then
    update public.email_delivery_attempts
    set state = 'pending', attempt_owner = requested_owner,
        last_attempt_at = clock_timestamp()
    where draft_id = requested_draft_id
    returning * into strict attempt;
    may_send := true;
  end if;

  return to_jsonb(attempt) || jsonb_build_object(
    'may_send', may_send,
    'expired', attempt.state <> 'sent'
      and attempt.first_attempt_at <= clock_timestamp() - interval '23 hours 55 minutes'
  );
end;
$$;

create or replace function public.mark_email_delivery_unknown(
  requested_draft_id uuid,
  requested_owner uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.email_delivery_attempts
  set state = 'unknown', last_attempt_at = clock_timestamp()
  where draft_id = requested_draft_id
    and attempt_owner = requested_owner
    and state = 'pending';
$$;

create or replace function public.complete_email_delivery(
  requested_draft_id uuid,
  requested_owner uuid,
  requested_provider_message_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_draft public.drafts%rowtype;
  attempt public.email_delivery_attempts%rowtype;
  delivered_at timestamptz;
begin
  select * into strict selected_draft
  from public.drafts
  where id = requested_draft_id
  for update;
  select * into strict attempt
  from public.email_delivery_attempts
  where draft_id = requested_draft_id
  for update;
  delivered_at := clock_timestamp();

  if attempt.state = 'sent' then
    return to_jsonb(attempt);
  end if;
  if attempt.attempt_owner <> requested_owner or attempt.state <> 'pending' then
    raise exception 'delivery attempt is not owned by this request';
  end if;
  if nullif(btrim(requested_provider_message_id), '') is null
    or char_length(requested_provider_message_id) > 200
  then
    raise exception 'provider message id is invalid';
  end if;
  if selected_draft.status <> 'approved'
    or selected_draft.recipient_email is distinct from attempt.recipient_email
    or selected_draft.subject is distinct from attempt.subject
    or selected_draft.body is distinct from attempt.body
  then
    raise exception 'approved draft changed before delivery completion';
  end if;

  update public.drafts
  set status = 'sent', sent_at = delivered_at
  where id = requested_draft_id;

  if selected_draft.kind = 'outreach' then
    update public.leads set status = 'contacted' where id = selected_draft.lead_id;
  end if;

  update public.email_delivery_attempts
  set state = 'sent', provider_message_id = requested_provider_message_id,
      sent_at = delivered_at, last_attempt_at = delivered_at
  where draft_id = requested_draft_id
  returning * into strict attempt;

  insert into public.activities (
    deal_id, conversation_id, lead_id, actor, action, fixture_key, details
  ) values (
    selected_draft.deal_id,
    selected_draft.conversation_id,
    selected_draft.lead_id,
    coalesce(nullif(selected_draft.approved_by, ''), 'approved-rep'),
    'email.delivered',
    'draft-delivered:' || requested_draft_id,
    jsonb_build_object(
      'draft_id', requested_draft_id,
      'provider', 'resend',
      'provider_message_id', requested_provider_message_id,
      'idempotency_key', attempt.idempotency_key
    )
  ) on conflict (fixture_key) do nothing;

  return to_jsonb(attempt);
end;
$$;

create or replace function public.approve_outreach_draft(
  requested_draft_id uuid,
  requested_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_draft public.drafts%rowtype;
  approval_time timestamptz := clock_timestamp();
begin
  if nullif(btrim(requested_actor), '') is null or char_length(requested_actor) > 120 then
    raise exception 'approval actor is invalid';
  end if;
  select * into strict selected_draft
  from public.drafts
  where id = requested_draft_id and kind = 'outreach'
  for update;

  if selected_draft.status = 'draft' then
    update public.drafts
    set status = 'approved', approved_by = requested_actor,
        approved_at = approval_time, sent_at = null
    where id = requested_draft_id
    returning * into strict selected_draft;

    update public.leads
    set status = 'approved'
    where id = selected_draft.lead_id and status <> 'contacted';

    insert into public.activities (lead_id, actor, action, fixture_key, details)
    values (
      selected_draft.lead_id,
      requested_actor,
      'outreach.approved',
      'outreach-approved:' || requested_draft_id,
      jsonb_build_object('draft_id', requested_draft_id, 'delivery', 'not_sent')
    ) on conflict (fixture_key) do nothing;
  end if;

  return to_jsonb(selected_draft);
end;
$$;

revoke all on function public.claim_email_delivery(uuid, text, text, text, text, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.mark_email_delivery_unknown(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.complete_email_delivery(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.approve_outreach_draft(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_email_delivery(uuid, text, text, text, text, text, text, uuid)
  to service_role;
grant execute on function public.mark_email_delivery_unknown(uuid, uuid) to service_role;
grant execute on function public.complete_email_delivery(uuid, uuid, text) to service_role;
grant execute on function public.approve_outreach_draft(uuid, text) to service_role;
