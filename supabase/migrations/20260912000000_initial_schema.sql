create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

create type public.deal_stage as enum ('discovery', 'demo', 'evaluation', 'pilot', 'procurement', 'customer');
create type public.deal_outcome as enum ('open', 'won', 'lost', 'stalled');
create type public.conversation_channel as enum ('call', 'email');
create type public.processing_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.draft_status as enum ('draft', 'approved', 'sent');
create type public.lead_status as enum ('new', 'reviewed', 'approved', 'contacted', 'rejected');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  industry text,
  size_band text,
  employee_count integer check (employee_count is null or employee_count >= 0),
  location text,
  crm_external_id text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null,
  last_name text not null default '',
  email text,
  phone text,
  title text,
  crm_external_id text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  primary_contact_id uuid references public.contacts(id) on delete set null,
  name text not null,
  stage public.deal_stage not null default 'discovery',
  outcome public.deal_outcome not null default 'open',
  amount numeric(14,2) check (amount is null or amount >= 0),
  currency text not null default 'AUD' check (char_length(currency) = 3),
  owner_name text,
  lead_source text,
  summary text,
  close_date date,
  crm_external_id text unique,
  embedding extensions.vector(1536),
  embedding_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  channel public.conversation_channel not null,
  subject text not null,
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  occurred_at timestamptz not null default now(),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  source_external_id text,
  raw_content text,
  summary text,
  sentiment text,
  processing_status public.processing_status not null default 'pending',
  processing_error text,
  extracted_fields jsonb not null default '{}'::jsonb,
  scorecard jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, source_external_id)
);

create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  speaker text not null,
  body text not null,
  start_ms integer not null check (start_ms >= 0),
  end_ms integer check (end_ms is null or end_ms >= start_ms),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique (conversation_id, sequence)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  kind text not null check (kind in ('summary', 'promise', 'objection', 'next_step', 'general')),
  body text not null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  title text not null,
  due_at timestamptz,
  owner_name text,
  completed_at timestamptz,
  crm_external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  lead_id uuid,
  kind text not null default 'follow_up' check (kind in ('follow_up', 'outreach')),
  recipient_name text,
  recipient_email text,
  subject text not null,
  body text not null,
  status public.draft_status not null default 'draft',
  model text,
  prompt_version text,
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.icp_profiles (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  profile jsonb not null,
  evidence jsonb not null default '[]'::jsonb,
  origami_brief text,
  source_deal_ids uuid[] not null default '{}',
  model text,
  embedding_model text,
  created_at timestamptz not null default now(),
  unique (version)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  icp_profile_id uuid references public.icp_profiles(id) on delete set null,
  company_name text not null,
  company_domain text,
  person_name text,
  title text,
  email text,
  linkedin_url text,
  industry text,
  employee_count integer check (employee_count is null or employee_count >= 0),
  location text,
  origami_row_id text unique,
  origami_relevance_score numeric(6,5) check (origami_relevance_score is null or origami_relevance_score between 0 and 1),
  similarity_score numeric(6,5) check (similarity_score is null or similarity_score between 0 and 1),
  status public.lead_status not null default 'new',
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drafts
  add constraint drafts_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete cascade;

create table public.activities (
  id bigint generated always as identity primary key,
  deal_id uuid references public.deals(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  actor text not null default 'slipstream',
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index contacts_company_idx on public.contacts(company_id);
create index deals_company_idx on public.deals(company_id);
create index deals_outcome_idx on public.deals(outcome, updated_at desc);
create index conversations_deal_idx on public.conversations(deal_id, occurred_at desc);
create index conversations_status_idx on public.conversations(processing_status, occurred_at desc);
create index transcript_segments_conversation_idx on public.transcript_segments(conversation_id, sequence);
create index notes_deal_idx on public.notes(deal_id, created_at desc);
create index tasks_open_idx on public.tasks(deal_id, due_at) where completed_at is null;
create index drafts_conversation_idx on public.drafts(conversation_id, created_at desc);
create index leads_profile_idx on public.leads(icp_profile_id, similarity_score desc);
create index activities_deal_idx on public.activities(deal_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts for each row execute function public.set_updated_at();
create trigger deals_set_updated_at before update on public.deals for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger drafts_set_updated_at before update on public.drafts for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();

create or replace function public.match_deals(
  query_embedding extensions.vector(1536),
  match_count integer default 10,
  outcome_filter public.deal_outcome default 'won'
)
returns table (deal_id uuid, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.id, 1 - (d.embedding <=> query_embedding) as similarity
  from public.deals d
  where d.embedding is not null and (outcome_filter is null or d.outcome = outcome_filter)
  order by d.embedding <=> query_embedding
  limit greatest(1, least(match_count, 100));
$$;

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.conversations enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;
alter table public.drafts enable row level security;
alter table public.icp_profiles enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;

-- The hackathon workspace contains only synthetic data. Public clients may read
-- it for the unauthenticated demo, while all writes stay behind the API's
-- service-role key. Replace these policies with tenant-scoped policies before
-- accepting real customer data.
create policy "demo read companies" on public.companies for select to anon, authenticated using (true);
create policy "demo read contacts" on public.contacts for select to anon, authenticated using (true);
create policy "demo read deals" on public.deals for select to anon, authenticated using (true);
create policy "demo read conversations" on public.conversations for select to anon, authenticated using (true);
create policy "demo read transcript segments" on public.transcript_segments for select to anon, authenticated using (true);
create policy "demo read notes" on public.notes for select to anon, authenticated using (true);
create policy "demo read tasks" on public.tasks for select to anon, authenticated using (true);
create policy "demo read drafts" on public.drafts for select to anon, authenticated using (true);
create policy "demo read icp profiles" on public.icp_profiles for select to anon, authenticated using (true);
create policy "demo read leads" on public.leads for select to anon, authenticated using (true);
create policy "demo read activities" on public.activities for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.match_deals(extensions.vector, integer, public.deal_outcome) to anon, authenticated, service_role;
