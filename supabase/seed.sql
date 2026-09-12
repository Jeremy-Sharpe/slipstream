insert into public.companies (id, name, domain, industry, size_band, employee_count, location) values
  ('10000000-0000-0000-0000-000000000001', 'Northstar Labs', 'northstarlabs.com', 'B2B SaaS', '50–250', 140, 'Melbourne, AU'),
  ('10000000-0000-0000-0000-000000000002', 'Arcwell Health', 'arcwell.health', 'Healthtech', '50–250', 82, 'Sydney, AU'),
  ('10000000-0000-0000-0000-000000000003', 'Afterglow Studio', 'afterglow.studio', 'Agency', '10–49', 34, 'Brisbane, AU')
on conflict (id) do update set name = excluded.name, industry = excluded.industry, employee_count = excluded.employee_count;

insert into public.contacts (id, company_id, first_name, last_name, email, phone, title) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Maya', 'Chen', 'maya@northstarlabs.com', '+61 400 111 111', 'Head of Revenue Operations'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Felix', 'Morgan', 'felix@arcwell.health', '+61 400 222 222', 'Chief Operating Officer'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Priya', 'Shah', 'priya@afterglow.studio', '+61 400 333 333', 'Operations Director')
on conflict (id) do update set company_id = excluded.company_id, title = excluded.title;

insert into public.deals (id, company_id, primary_contact_id, name, stage, outcome, amount, owner_name, lead_source, summary, close_date) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Northstar revenue workflow', 'evaluation', 'won', 48000, 'Jeremy', 'Referral', 'Sales Ops and RevOps need shared customer context before the October planning cycle.', '2026-09-30'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Arcwell pilot', 'pilot', 'won', 32000, 'Anna', 'Outbound', 'Twelve-user pilot to automate sales handoffs into HubSpot.', '2026-10-15'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Afterglow handoff project', 'discovery', 'stalled', 18000, 'Jeremy', 'Inbound', 'Strong workflow pain, but budget ownership has not been confirmed.', null)
on conflict (id) do update set stage = excluded.stage, outcome = excluded.outcome, summary = excluded.summary;

insert into public.conversations (id, deal_id, contact_id, channel, subject, direction, occurred_at, duration_seconds, source_external_id, raw_content, summary, sentiment, processing_status, extracted_fields, scorecard) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'call', 'Pricing & security review', 'inbound', '2026-09-12T01:42:00Z', 1104, 'fixture-call-northstar', 'Jeremy: How did the internal review go?\nMaya: Sales Ops and RevOps are aligned. Legal can move once we finish the security questionnaire. The $48,000 annual figure is approved. We need the CRM workflow live before October.', 'Budget and internal alignment confirmed. Security review is the remaining gate before an October rollout.', 'positive', 'ready', '{"stage":{"value":"evaluation","confidence":0.96,"evidence":"Legal can move once we finish the security questionnaire"},"amount":{"value":48000,"confidence":0.99,"evidence":"The $48,000 annual figure is approved"}}', '{"overall":91,"discovery":88,"next_step":96,"objection_handling":90,"talk_ratio":52}'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'email', 'Re: pilot team confirmed', 'inbound', '2026-09-12T00:16:00Z', null, 'fixture-email-arcwell', 'We have the twelve pilot users locked in. Could you send through the timeline?', 'Pilot team confirmed; send rollout timeline and propose a kickoff date.', 'positive', 'ready', '{"stage":{"value":"pilot","confidence":0.98,"evidence":"twelve pilot users locked in"}}', '{}'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'call', 'Discovery call', 'inbound', '2026-09-11T03:10:00Z', 1928, 'fixture-call-afterglow', 'Priya: Handoffs between the sales and delivery teams are breaking down.\nJeremy: Who owns the budget for fixing that?\nPriya: I still need to work that out internally.', 'Strong pain around handoffs, but budget ownership remains unknown.', 'neutral', 'ready', '{"stage":{"value":"discovery","confidence":0.93,"evidence":"still need to work that out internally"}}', '{"overall":67,"discovery":79,"next_step":51,"objection_handling":65,"talk_ratio":44}')
on conflict (id) do update set summary = excluded.summary, extracted_fields = excluded.extracted_fields, scorecard = excluded.scorecard;

insert into public.transcript_segments (conversation_id, sequence, speaker, body, start_ms, end_ms, confidence) values
  ('40000000-0000-0000-0000-000000000001', 0, 'Jeremy', 'How did the internal review go?', 4000, 8500, 0.98),
  ('40000000-0000-0000-0000-000000000001', 1, 'Maya', 'Sales Ops and RevOps are aligned. Legal can move once we finish the security questionnaire.', 11000, 26500, 0.97),
  ('40000000-0000-0000-0000-000000000001', 2, 'Maya', 'The $48,000 annual figure is approved. We need the CRM workflow live before October.', 39000, 54000, 0.98)
on conflict (conversation_id, sequence) do update set body = excluded.body, confidence = excluded.confidence;

insert into public.notes (id, deal_id, conversation_id, kind, body, confidence, evidence) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'objection', 'Security questionnaire must be completed before legal approval.', 0.96, '{"start_ms":11000,"end_ms":26500}'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'next_step', 'Send the questionnaire and book a technical review for Tuesday.', 0.95, '{"start_ms":39000,"end_ms":54000}')
on conflict (id) do update set body = excluded.body, evidence = excluded.evidence;

insert into public.tasks (id, deal_id, conversation_id, title, due_at, owner_name) values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Return security questionnaire', '2026-09-17T06:00:00Z', 'Jeremy'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'Send pilot timeline', '2026-09-14T06:00:00Z', 'Anna')
on conflict (id) do update set title = excluded.title, due_at = excluded.due_at;

insert into public.drafts (id, deal_id, conversation_id, kind, recipient_name, recipient_email, subject, body, status, model, prompt_version) values
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'follow_up', 'Maya Chen', 'maya@northstarlabs.com', 'Next steps: security and technical review', E'Hi Maya,\n\nGreat speaking today. I will return the security questionnaire by Thursday and send two options for Tuesday’s technical review.\n\nBest,\nJeremy', 'draft', 'fixture', 'follow-up-v1'),
  ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'follow_up', 'Felix Morgan', 'felix@arcwell.health', 'Arcwell pilot timeline', E'Hi Felix,\n\nGreat news. I will send the proposed pilot timeline today, including onboarding, success measures and our two-week review point.\n\nBest,\nAnna', 'draft', 'fixture', 'follow-up-v1')
on conflict (id) do update set body = excluded.body, status = excluded.status;

insert into public.icp_profiles (id, version, profile, evidence, origami_brief, source_deal_ids, model) values
  ('80000000-0000-0000-0000-000000000001', 1, '{"summary":"Operations-led SaaS and healthtech companies with 50–250 employees","industries":["B2B SaaS","Healthtech","AI"],"size_band":"50–250","titles":["Head of RevOps","COO"],"triggers":["CRM migration","planning cycle","scale-up"]}', '[{"attribute":"size_band","deal_ids":["30000000-0000-0000-0000-000000000001","30000000-0000-0000-0000-000000000002"]}]', 'Find Australian B2B SaaS, healthtech, or AI companies with 50–250 employees. Prioritise a Head of Revenue Operations or COO who is scaling a considered sales motion, migrating CRM, or approaching a planning cycle.', array['30000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000002'::uuid], 'fixture')
on conflict (version) do update set profile = excluded.profile, evidence = excluded.evidence, origami_brief = excluded.origami_brief;

insert into public.activities (deal_id, contact_id, conversation_id, actor, action, details) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'slipstream', 'conversation.processed', '{"pipeline":"fixture"}'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'slipstream', 'conversation.processed', '{"pipeline":"fixture"}');
