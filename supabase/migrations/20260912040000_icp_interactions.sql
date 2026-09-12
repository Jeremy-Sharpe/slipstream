create or replace function public.read_icp_deals(include_demo boolean default false)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as materialized (
    select deal.*
    from public.deals as deal
    where (
      deal.metadata->>'source' = 'fixtures'
      or exists (
        select 1
        from public.conversations as conversation
        where conversation.deal_id = deal.id
          and conversation.channel in ('call', 'email')
          and nullif(
            coalesce(
              nullif(btrim(conversation.summary), ''),
              nullif(btrim(conversation.raw_content), '')
            ), ''
          ) is not null
      )
    )
      and (
        include_demo
        or lower(coalesce(deal.metadata->>'demo', 'false')) <> 'true'
      )
    order by
      coalesce(deal.metadata->>'source' = 'fixtures', false) desc,
      case when deal.metadata->>'source' = 'fixtures' then deal.crm_external_id end asc nulls last,
      case when deal.metadata->>'source' <> 'fixtures' or deal.metadata->>'source' is null
        then deal.updated_at end desc nulls last,
      deal.id desc
    limit 100
  )
  select
    to_jsonb(eligible)
    || jsonb_build_object(
      'companies', to_jsonb(company),
      'contacts', to_jsonb(contact),
      'interactions', coalesce(interaction.items, '[]'::jsonb)
    )
  from eligible
  left join public.companies as company on company.id = eligible.company_id
  left join public.contacts as contact on contact.id = eligible.primary_contact_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'source_external_id', case
          when char_length(coalesce(conversation.source_external_id, conversation.id::text)) <= 300
            then coalesce(conversation.source_external_id, conversation.id::text)
          else 'sha256:' || encode(extensions.digest(convert_to(
            coalesce(conversation.source_external_id, conversation.id::text), 'UTF8'
          ), 'sha256'), 'hex')
        end,
        'channel', conversation.channel,
        'direction', case
          when conversation.channel = 'email' then conversation.direction
          else 'unknown'
        end,
        'occurred_at', conversation.occurred_at,
        'subject', left(conversation.subject, 300),
        'content', left(coalesce(
          nullif(btrim(conversation.summary), ''),
          nullif(btrim(conversation.raw_content), '')
        ), 800)
      ) order by conversation.occurred_at desc, conversation.id desc
    ) as items
    from (
      select candidate.*
      from public.conversations as candidate
      where candidate.deal_id = eligible.id
        and candidate.channel in ('call', 'email')
        and coalesce(
          nullif(btrim(candidate.summary), ''),
          nullif(btrim(candidate.raw_content), '')
        ) is not null
      order by candidate.occurred_at desc, candidate.id desc
      limit 10
    ) as conversation
  ) as interaction on true
  order by
    coalesce(eligible.metadata->>'source' = 'fixtures', false) desc,
    case when eligible.metadata->>'source' = 'fixtures'
      then eligible.crm_external_id end asc nulls last,
    case when eligible.metadata->>'source' <> 'fixtures'
      or eligible.metadata->>'source' is null
      then eligible.updated_at end desc nulls last,
    eligible.id desc;
$$;

revoke all on function public.read_icp_deals(boolean) from public;
revoke all on function public.read_icp_deals(boolean) from anon;
revoke all on function public.read_icp_deals(boolean) from authenticated;
grant execute on function public.read_icp_deals(boolean) to service_role;
