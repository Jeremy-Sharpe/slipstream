-- This seed targets a clean synthetic demo database. Stable IDs make repeated
-- runs safe; incompatible natural-key collisions fail the transaction clearly.
-- The three companies mirror fixtures/calls/call-01, call-02 and call-03.
begin;

insert into public.companies (id, name, domain, industry, size_band, employee_count, location) values
  ('10000000-0000-0000-0000-000000000001', 'Northstar Labs', 'northstarlabs.example', 'Quantitative investment research boutique', '25–80', 42, 'Southbank, VIC'),
  ('10000000-0000-0000-0000-000000000002', 'Kestrel Lending', 'kestrellending.example', 'Non-bank commercial lender', '25–80', 64, 'Docklands, VIC'),
  ('10000000-0000-0000-0000-000000000003', 'Afterglow Studio', 'afterglowstudio.example', 'Creative branding studio', 'under-15', 12, 'Collingwood, VIC')
on conflict (id) do nothing;

insert into public.contacts (id, company_id, first_name, last_name, email, phone, title) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Maya', 'Chen', 'maya@northstarlabs.example', '+61 3 7010 1101', 'Managing Partner'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Felix', 'Morgan', 'felix@kestrellending.example', '+61 3 7010 1102', 'Head of Credit Operations'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Priya', 'Shah', 'priya@afterglowstudio.example', '+61 3 7010 1103', 'Founder')
on conflict (id) do nothing;

insert into public.deals (id, company_id, primary_contact_id, name, stage, outcome, amount, owner_name, lead_source, summary, close_date) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Northstar Labs research note drafting build', 'customer', 'won', 58400, 'Sam Whitfield', 'Referral', 'Research note production doubles with a November fund launch; a drafting agent assembles the model run, chart pack and standing sections.', '2026-09-03'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Kestrel Lending loan document build', 'customer', 'won', 96000, 'Sam Whitfield', 'Outbound', 'Loan document turnaround has slipped from two days to five before broker season; an agent drafts the facility letter and security schedules from the approval.', '2026-09-10'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Afterglow Studio automation project', 'discovery', 'lost', 15400, 'Jordan Lee', 'Inbound', 'Twelve-person studio without the document volume to justify a fixed-scope build; price quoted before any discovery.', null)
on conflict (id) do nothing;

insert into public.conversations (id, deal_id, contact_id, channel, subject, direction, occurred_at, duration_seconds, source_external_id, raw_content, summary, sentiment, processing_status, extracted_fields, scorecard) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'call', 'Northstar Labs — Maya Chen', 'outbound', '2026-08-30T23:15:00Z', 420, 'fixture-call-northstar', E'Sam: What has to be true six weeks after the fund launches for you to call this a win?\nMaya: Analysts spend their time on the analysis instead of the assembly. We publish about sixty notes a month across four strategies, and after the launch it is closer to a hundred and twenty.\nSam: The build lands around $58,400 after a two-week discovery phase.\nMaya: We don''t want another subscription sitting on the books.\nSam: There is no subscription. We deploy it in your systems and transfer the IP to you.', 'Note production doubles with the November fund launch. The subscription objection was answered with the IP transfer, and a dated pilot scope walkthrough was booked.', 'positive', 'ready', '{"stage":{"value":"closed_won","confidence":0.96,"evidence":"If the scope holds up I''ll sign off the discovery phase that afternoon"},"amount":{"value":58400,"confidence":0.99,"evidence":"the build lands around $58,400"}}', '{"overall":91,"discovery":92,"next_step":96,"objection_handling":90,"talk_ratio":44}'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'email', 'Sequencing before broker season', 'inbound', '2026-09-11T05:22:00Z', null, 'fixture-email-kestrel', 'The CEO signed off after our session with risk. Can we build the standard facility letter first and take the security schedule variants after broker season?', 'Build approved; sequence the standard facility letter ahead of the schedule variants and confirm the discovery phase inputs.', 'positive', 'ready', '{"stage":{"value":"closed_won","confidence":0.98,"evidence":"The CEO signed off after our session with risk"}}', '{}'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'call', 'Afterglow Studio — Priya Shah', 'outbound', '2026-09-01T04:00:00Z', 390, 'fixture-call-afterglow', E'Jordan: A build like this starts at $15,400 and we can be underway next week.\nPriya: We do not have the volume to justify a build like that.\nJordan: Most studios say that until they see the time back.\nPriya: That is more than we spent on our entire software stack last year.', 'Price quoted in the first sentence, no discovery, and both objections talked past. No next step agreed.', 'negative', 'ready', '{"stage":{"value":"closed_lost","confidence":0.93,"evidence":"We do not have the volume to justify a build like that"}}', '{"overall":31,"discovery":0,"next_step":0,"objection_handling":20,"talk_ratio":66}')
on conflict (id) do nothing;

insert into public.transcript_segments (conversation_id, sequence, speaker, body, start_ms, end_ms, confidence) values
  ('40000000-0000-0000-0000-000000000001', 0, 'Sam', 'What has to be true six weeks after the fund launches for you to call this a win?', 4000, 8500, 0.98),
  ('40000000-0000-0000-0000-000000000001', 1, 'Maya', 'Analysts spend their time on the analysis instead of the assembly.', 11000, 26500, 0.97),
  ('40000000-0000-0000-0000-000000000001', 2, 'Sam', 'The build lands around $58,400 after a two-week discovery phase.', 39000, 54000, 0.98),
  ('40000000-0000-0000-0000-000000000001', 3, 'Maya', 'We don''t want another subscription sitting on the books.', 54000, 63000, 0.98),
  ('40000000-0000-0000-0000-000000000001', 4, 'Sam', 'There is no subscription. We deploy it in your systems and transfer the IP to you.', 63000, 70000, 0.97)
on conflict (conversation_id, sequence) do nothing;

insert into public.notes (id, deal_id, conversation_id, kind, body, confidence, evidence) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'objection', 'Does not want another subscription on the books; answered with IP transfer at handover.', 0.96, '{"start_ms":54000,"end_ms":70000}'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'next_step', 'Send the discovery phase scope, measurement plan and two redrafted research notes before Thursday.', 0.95, '{"start_ms":39000,"end_ms":63000}')
on conflict (id) do nothing;

insert into public.tasks (id, deal_id, conversation_id, title, due_at, owner_name) values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Send the discovery phase scope and measurement plan', '2026-09-03T00:00:00Z', 'Sam Whitfield'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'Confirm the standard facility letter build sequence', '2026-09-14T06:00:00Z', 'Sam Whitfield')
on conflict (id) do nothing;

insert into public.drafts (id, deal_id, conversation_id, kind, recipient_name, recipient_email, subject, body, status, model, prompt_version) values
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'follow_up', 'Maya Chen', 'maya@northstarlabs.example', 'Discovery phase scope and measurement plan', E'Hi Maya,\n\nGreat speaking today. I will send the discovery phase scope and the measurement plan by Thursday morning, along with two research notes redrafted from your published ones.\n\nBest,\nSam', 'draft', 'fixture', 'follow-up-v1'),
  ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'follow_up', 'Felix Morgan', 'felix@kestrellending.example', 'Build sequence before broker season', E'Hi Felix,\n\nGood news. I will confirm the standard facility letter first, with the security schedule variants staged after broker season, and set out what the discovery phase needs from your documentation officers.\n\nBest,\nSam', 'draft', 'fixture', 'follow-up-v1')
on conflict (id) do nothing;

insert into public.icp_profiles (id, version, profile, evidence, origami_brief, model) values
  ('80000000-0000-0000-0000-000000000001', 1, '{"summary":"Investment research, lending, advice, commercial property and auction businesses with 25–80 staff and a document or reporting workflow buckling under volume","industries":["Quantitative investment research boutique","Non-bank commercial lender","Financial planning and wealth advice firm"],"size_band":"25–80","titles":["Managing Partner","Head of Credit Operations","Practice Manager"],"triggers":["fund launch","acquisition","document turnaround blowing out"]}', '[{"attribute":"size_band","deal_ids":["30000000-0000-0000-0000-000000000001","30000000-0000-0000-0000-000000000002"]}]', 'Find Australian investment research boutiques, non-bank lenders, financial planning practices, commercial real estate agencies and auction houses with 25 to 80 staff. Prioritise a managing partner, head of credit operations, practice manager, director or general manager facing a drafting or reporting backlog.', 'fixture')
on conflict (id) do nothing;

insert into public.icp_profile_source_deals (icp_profile_id, deal_id, evidence) values
  ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '{"attributes":["industry","size_band","title","trigger"]}'),
  ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '{"attributes":["industry","size_band","title"]}')
on conflict (icp_profile_id, deal_id) do nothing;

insert into public.activities (deal_id, contact_id, conversation_id, actor, action, fixture_key, details) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'slipstream', 'conversation.processed', 'fixture-activity-northstar-processed', '{"pipeline":"fixture"}'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'slipstream', 'conversation.processed', 'fixture-activity-kestrel-processed', '{"pipeline":"fixture"}')
on conflict (fixture_key) do nothing;

commit;
