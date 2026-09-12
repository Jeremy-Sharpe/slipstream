"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleUserRound,
  ExternalLink,
  FileText,
  Inbox,
  Mail,
  MoreHorizontal,
  Pause,
  Phone,
  Play,
  Search,
  Send,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

type Touchpoint = {
  id: number;
  kind: "call" | "email";
  name: string;
  initials: string;
  company: string;
  title: string;
  preview: string;
  time: string;
  duration?: string;
  unread?: boolean;
  status: "Action ready" | "Needs review" | "Synced";
  stage: string;
  value: string;
  owner: string;
  source: string;
  email: string;
};

const touchpoints: Touchpoint[] = [
  { id: 1, kind: "call", name: "Maya Chen", initials: "MC", company: "Northstar Labs", title: "Pricing & security review", preview: "Maya confirmed legal is ready once the security questionnaire is complete.", time: "11:42", duration: "18:24", unread: true, status: "Action ready", stage: "Evaluation", value: "$48,000", owner: "Jeremy", source: "Referral", email: "maya@northstarlabs.com" },
  { id: 2, kind: "email", name: "Felix Morgan", initials: "FM", company: "Arcwell Health", title: "Re: pilot team confirmed", preview: "We have the twelve pilot users locked in. Could you send through the timeline?", time: "10:16", unread: true, status: "Action ready", stage: "Pilot", value: "$32,000", owner: "Anna", source: "Outbound", email: "felix@arcwell.health" },
  { id: 3, kind: "call", name: "Priya Shah", initials: "PS", company: "Afterglow Studio", title: "Discovery call", preview: "Strong pain around handoffs, but budget ownership still needs to be confirmed.", time: "Yesterday", duration: "32:08", status: "Needs review", stage: "Discovery", value: "$18,000", owner: "Jeremy", source: "Inbound", email: "priya@afterglow.studio" },
  { id: 4, kind: "email", name: "Daniel Ortiz", initials: "DO", company: "Kite & Co", title: "Procurement requirements", preview: "Attaching the vendor onboarding pack and our standard data processing addendum.", time: "Yesterday", status: "Synced", stage: "Procurement", value: "$72,000", owner: "Michael", source: "Partner", email: "daniel@kiteandco.com" },
  { id: 5, kind: "call", name: "Lucy Beck", initials: "LB", company: "Craftwork", title: "Quarterly check-in", preview: "Expansion opportunity across two new markets and the customer success team.", time: "Mon", duration: "21:51", status: "Synced", stage: "Customer", value: "$26,000", owner: "Anna", source: "Expansion", email: "lucy@craftwork.io" },
  { id: 6, kind: "email", name: "Tom Reid", initials: "TR", company: "Meridian AI", title: "Following up on our demo", preview: "The team liked the workflow. We need a clearer answer on the Salesforce integration.", time: "Fri", status: "Needs review", stage: "Demo", value: "$41,000", owner: "Jeremy", source: "Event", email: "tom@meridian.ai" },
];

const callTranscript = [
  { speaker: "Jeremy", time: "00:04", text: "Good to see you again, Maya. How did the internal review go?" },
  { speaker: "Maya", time: "00:11", text: "Really well. Sales ops and RevOps are both aligned. Legal can move once we finish the security questionnaire." },
  { speaker: "Jeremy", time: "00:27", text: "Perfect. I can get that back to you by Thursday. Is the forty-eight thousand annual figure still inside the approved range?" },
  { speaker: "Maya", time: "00:39", text: "Yes, that is approved. Our main concern is getting the CRM workflow live before the October planning cycle." },
  { speaker: "Jeremy", time: "00:54", text: "Let’s put a technical session in next Tuesday with Sam from our side, then we can map the rollout backwards from October." },
  { speaker: "Maya", time: "01:08", text: "That works. Send me the questionnaire and two times for Tuesday and I’ll bring our Salesforce admin." },
];

const draftCopy: Record<number, string> = {
  1: `Hi Maya,\n\nGreat speaking today — it sounds like Sales Ops, RevOps and budget are all aligned.\n\nI’ll return the completed security questionnaire by Thursday and send two options for a technical working session next Tuesday. I’ll bring Sam from our side; if you can include your Salesforce admin, we can map the rollout back from your October planning cycle.\n\nBest,\nJeremy`,
  2: `Hi Felix,\n\nThat’s great news. I’ll send over a proposed pilot timeline today, including onboarding for the twelve users, success measures and our two-week review point.\n\nWould a Monday kickoff work for the team?\n\nBest,\nAnna`,
  3: `Hi Priya,\n\nThanks again for the candid conversation. I’ve captured the workflow handoff issues we discussed and will send a short example of how a team like yours could remove those gaps.\n\nIt would also be useful to include whoever owns the operations budget in our next conversation.\n\nBest,\nJeremy`,
  4: `Hi Daniel,\n\nThanks for sending this through. We’ll review the vendor onboarding pack and DPA and come back with any questions by Wednesday.\n\nBest,\nMichael`,
  5: `Hi Lucy,\n\nThanks for the update today. I’ve outlined the two-market expansion and the customer success use case for our planning session. I’ll send a recommendation for seats and rollout sequencing tomorrow.\n\nBest,\nAnna`,
  6: `Hi Tom,\n\nThanks for the thoughtful feedback. I’ll send a concise overview of the Salesforce integration, including field mapping, write-back controls and implementation timing.\n\nWould Thursday afternoon work for a technical follow-up?\n\nBest,\nJeremy`,
};

function Brand() {
  return <div className="brand"><img src="/slipstream-mark.svg" alt="" /><span>slipstream</span><em>Beta</em></div>;
}

function AppNav({ page, setPage }: { page: "inbox" | "analysis"; setPage: (page: "inbox" | "analysis") => void }) {
  return <aside className="app-nav">
    <Brand />
    <div className="workspace-switch"><span className="mini-logo">H</span><div><strong>Hourglass</strong><small>Revenue workspace</small></div><ChevronDown size={15} /></div>
    <nav>
      <button className={page === "inbox" ? "active" : ""} onClick={() => setPage("inbox")}><Inbox size={18} /><span>Conversations</span><b>4</b></button>
      <button className={page === "analysis" ? "active" : ""} onClick={() => setPage("analysis")}><BarChart3 size={18} /><span>Intelligence</span></button>
      <button><UsersRound size={18} /><span>People</span></button>
    </nav>
    <div className="nav-bottom"><div className="sync-state"><i /><span><strong>HubSpot connected</strong><small>Synced 2 min ago</small></span></div><button><Settings size={18} /> Settings</button><button><CircleUserRound size={24} /><span><strong>Jeremy Sharpe</strong><small>Admin</small></span><MoreHorizontal size={16} /></button></div>
  </aside>;
}

function ConversationPage() {
  const [selectedId, setSelectedId] = useState(1);
  const [filter, setFilter] = useState<"all" | "call" | "email">("all");
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(false);
  const [drafts, setDrafts] = useState(draftCopy);
  const [crmSynced, setCrmSynced] = useState<number[]>([4, 5]);
  const [sent, setSent] = useState<number[]>([]);
  const active = touchpoints.find((item) => item.id === selectedId) ?? touchpoints[0];
  const visible = useMemo(() => touchpoints.filter((item) => (filter === "all" || item.kind === filter) && `${item.name} ${item.company} ${item.title}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const syncCurrent = () => setCrmSynced((items) => [...new Set([...items, active.id])]);
  const sendCurrent = () => setSent((items) => [...new Set([...items, active.id])]);

  return <div className="conversation-page">
    <section className="conversation-list">
      <header><div><p className="eyebrow">Activity feed</p><h1>Conversations <span>6</span></h1></div><button className="round-icon"><Sparkles size={17} /></button></header>
      <div className="search"><Search size={16} /><input placeholder="Search conversations" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></div>
      <div className="filter-row"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "call" ? "active" : ""} onClick={() => setFilter("call")}><Phone size={13} /> Calls</button><button className={filter === "email" ? "active" : ""} onClick={() => setFilter("email")}><Mail size={13} /> Email</button></div>
      <div className="touchpoint-list">{visible.map((item) => <button key={item.id} className={`touchpoint ${item.id === active.id ? "active" : ""}`} onClick={() => { setSelectedId(item.id); setPlaying(false); }}>
        <span className={`person-avatar color-${item.id}`}>{item.initials}</span>
        <span className="touchpoint-copy"><span className="touchpoint-top"><strong>{item.name}</strong><time>{item.time}</time></span><span className="company-line">{item.company}<i>·</i>{item.kind === "call" ? <><Phone size={11} /> {item.duration}</> : <><Mail size={11} /> Email</>}</span><b>{item.title}</b><span className="preview">{item.preview}</span><em className={`item-status status-${item.status.toLowerCase().replace(" ", "-")}`}>{item.status === "Action ready" && <Zap size={10} />}{item.status}</em></span>
        {item.unread && <i className="unread" />}
      </button>)}</div>
    </section>

    <section className="conversation-detail">
      <div className="detail-toolbar"><span>{active.kind === "call" ? <Phone size={15} /> : <Mail size={15} />} {active.kind === "call" ? "Call" : "Email"} <i>/</i> {active.company}</span><div><button className="ghost-button">Mark done <Check size={14} /></button><button className="round-icon"><MoreHorizontal size={18} /></button></div></div>
      <div className="detail-scroll">
        <header className="detail-heading"><div><span className="live-pill"><i /> AI processed</span><h2>{active.title}</h2><p>{active.name} · {active.company} · {active.time}</p></div><span className="value-pill">{active.value} potential</span></header>

        {active.kind === "call" ? <>
          <div className="audio-player"><button onClick={() => setPlaying(!playing)}>{playing ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button><div><div className="waveform">{Array.from({ length: 64 }, (_, index) => <i key={index} className={playing && index < 20 ? "played" : ""} style={{ height: `${8 + ((index * 19) % 26)}px` }} />)}</div><span>{playing ? "05:12" : "00:00"}</span></div><time>{active.duration}</time></div>
          <section className="ai-card"><header><span><WandSparkles size={16} /> Conversation intelligence</span><em>94% confidence</em></header><p><strong>Strong buying signal.</strong> {active.preview} Budget is confirmed and the October deadline creates urgency.</p><div className="signal-grid"><div><small>Sentiment</small><strong><TrendingUp size={14} /> Positive</strong></div><div><small>Next step</small><strong>Technical review · Tue</strong></div><div><small>Primary risk</small><strong>Security approval</strong></div></div></section>
          <section className="transcript-card"><header><h3>Transcript</h3><button>View full transcript <ArrowRight size={13} /></button></header>{callTranscript.slice(0, 4).map((line) => <div className="transcript-line" key={line.time}><span className={line.speaker === "Jeremy" ? "agent" : "prospect"}>{line.speaker[0]}</span><div><strong>{line.speaker}</strong><p>{line.text}</p></div><time>{line.time}</time></div>)}</section>
        </> : <section className="email-card"><header><span className={`person-avatar color-${active.id}`}>{active.initials}</span><div><strong>{active.name}</strong><small>{active.email}</small></div><time>{active.time}</time></header><p>Hi team,</p><p>{active.preview}</p><p>Can you send through the next steps and anything we should prepare before we get started?</p><p>Thanks,<br />{active.name.split(" ")[0]}</p></section>}

        <section className="draft-card"><header><span><Sparkles size={16} /> Follow-up drafted from this {active.kind}</span><em>Ready to review</em></header><div className="draft-meta"><span>To</span><b>{active.name} &lt;{active.email}&gt;</b></div><textarea value={drafts[active.id]} onChange={(event) => setDrafts({ ...drafts, [active.id]: event.target.value })} aria-label="Drafted reply" /><footer><button className="ghost-button"><FileText size={14} /> Save draft</button><button className="primary-button" onClick={sendCurrent}>{sent.includes(active.id) ? <><Check size={15} /> Sent</> : <><Send size={15} /> Approve & send</>}</button></footer></section>
      </div>
    </section>

    <aside className="crm-panel">
      <header><div><p className="eyebrow">CRM write-back</p><h2>HubSpot</h2></div><span className={crmSynced.includes(active.id) ? "synced" : "pending"}>{crmSynced.includes(active.id) ? "Synced" : "Review"}</span></header>
      <div className="auto-captured"><Sparkles size={15} /><span><strong>Auto-filled from conversation</strong><small>Review the changes before syncing</small></span></div>
      <section className="contact-card"><span className={`person-avatar color-${active.id}`}>{active.initials}</span><div><strong>{active.name}</strong><small>{active.company}</small></div><button><ExternalLink size={15} /></button></section>
      <div className="crm-fields"><label>Deal stage<select defaultValue={active.stage}><option>Discovery</option><option>Demo</option><option>Evaluation</option><option>Pilot</option><option>Procurement</option><option>Customer</option></select></label><div className="field-pair"><label>Value<input defaultValue={active.value} /></label><label>Owner<select defaultValue={active.owner}><option>Jeremy</option><option>Anna</option><option>Michael</option></select></label></div><label>Next action<textarea defaultValue={active.kind === "call" ? "Send security questionnaire and two options for Tuesday's technical review." : "Send proposed timeline and confirm kickoff date."} /></label><label>Close date<input defaultValue="30 Sep 2026" /></label><label>Lead source<input defaultValue={active.source} /></label></div>
      <button className="crm-sync" onClick={syncCurrent}>{crmSynced.includes(active.id) ? <><Check size={16} /> Synced to HubSpot</> : <><Zap size={16} /> Approve & sync changes</>}</button>
      <p className="fine-print">No fields are changed without your approval</p>
      <div className="activity-log"><h3>Timeline</h3><div><span><Mail size={13} /></span><p><strong>Follow-up prepared</strong><small>Just now · Slipstream AI</small></p></div><div><span><Phone size={13} /></span><p><strong>{active.kind === "call" ? "Call transcribed" : "Email received"}</strong><small>{active.time} · Automatic</small></p></div></div>
    </aside>
  </div>;
}

function AnalysisPage() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const generate = () => { setGenerating(true); window.setTimeout(() => { setGenerating(false); setGenerated(true); }, 900); };
  return <main className="analysis-page">
    <header className="analysis-header"><div><p className="eyebrow">Revenue intelligence</p><h1>What your best customers have in common.</h1><p>Slipstream analyzed 248 calls and 1,106 emails from the last 90 days.</p></div><div className="range-button"><span>Last 90 days</span><ChevronDown size={15} /></div></header>
    <section className="metric-row"><article><div><small>Conversations analyzed</small><strong>1,354</strong></div><span className="metric-icon purple"><Sparkles size={18} /></span><p><b>+18%</b> vs previous period</p></article><article><div><small>Qualified opportunities</small><strong>67</strong></div><span className="metric-icon coral"><Target size={18} /></span><p><b>24.6%</b> conversation to opportunity</p></article><article><div><small>Pipeline influenced</small><strong>$1.84m</strong></div><span className="metric-icon green"><TrendingUp size={18} /></span><p><b>+$340k</b> this month</p></article></section>
    <section className="insight-grid">
      <article className="icp-card"><header><div><span className="section-kicker">Derived ideal customer profile</span><h2>Your fastest-moving buyers</h2><p>Based on the 22 opportunities that reached proposal or closed won.</p></div><span className="confidence-ring">91<small>%</small></span></header><div className="profile-sentence">Operations-led SaaS companies with <em>50–250 employees</em>, selling through a <em>considered B2B motion</em> and feeling the pain of <em>fragmented customer context.</em></div><div className="profile-grid"><div><small>Best-fit industries</small><strong>B2B SaaS · Healthtech · AI</strong><span>3.2× higher win rate</span></div><div><small>Company size</small><strong>50–250 employees</strong><span>Fastest sales cycle</span></div><div><small>Champion titles</small><strong>Head of RevOps · COO</strong><span>61% of closed-won deals</span></div><div><small>Buying trigger</small><strong>CRM migration or scale-up</strong><span>Mentioned in 18 wins</span></div></div></article>
      <article className="signals-card"><header><div><span className="section-kicker">Win signals</span><h2>What moves deals forward</h2></div><MoreHorizontal size={18} /></header><div className="signal-row"><span className="rank">01</span><div><strong>Multi-team workflow pain</strong><small>Mentioned in 86% of wins</small></div><em>+42%</em></div><div className="signal-row"><span className="rank">02</span><div><strong>Existing CRM commitment</strong><small>HubSpot or Salesforce in place</small></div><em>+31%</em></div><div className="signal-row"><span className="rank">03</span><div><strong>Near-term planning event</strong><small>Board, budget, or planning cycle</small></div><em>+27%</em></div><div className="signal-row risk"><span className="rank">!</span><div><strong>No operational owner</strong><small>Most common stall signal</small></div><em>−38%</em></div></article>
      <article className="funnel-card"><header><div><span className="section-kicker">Conversion by segment</span><h2>Where the momentum is</h2></div><span className="legend"><i /> Win rate</span></header><div className="bars"><div><span>B2B SaaS</span><i><b style={{ width: "78%" }} /></i><strong>38%</strong></div><div><span>Healthtech</span><i><b style={{ width: "64%" }} /></i><strong>31%</strong></div><div><span>AI / Data</span><i><b style={{ width: "58%" }} /></i><strong>28%</strong></div><div><span>Agencies</span><i><b style={{ width: "35%" }} /></i><strong>17%</strong></div><div><span>Other</span><i><b style={{ width: "22%" }} /></i><strong>11%</strong></div></div></article>
      <article className="origami-card"><div className="origami-mark"><span /><span /><span /></div><span className="section-kicker">Turn insight into pipeline</span><h2>{generated ? "20 lookalike leads are ready." : "Find the next 20 companies like these."}</h2><p>{generated ? "Origami found and enriched companies matching your derived ICP. They’re staged for review—nothing has been contacted yet." : "Send this live ICP to Origami to source and enrich lookalike companies, then draft a tailored first touch."}</p>{generated ? <div className="lead-preview"><span>VL</span><div><strong>Vela Systems +19</strong><small>94% ICP match · Enriched</small></div><button>Review leads <ArrowRight size={14} /></button></div> : <button className="origami-button" onClick={generate} disabled={generating}>{generating ? <><Sparkles className="spin" size={16} /> Finding matches…</> : <>Generate leads with Origami <ArrowRight size={16} /></>}</button>}<small className="safe-note">Review required before any outreach is sent</small></article>
    </section>
  </main>;
}

export default function Home() {
  const [page, setPage] = useState<"inbox" | "analysis">("inbox");
  return <div className="shell"><AppNav page={page} setPage={setPage} /><div className="main-stage">{page === "inbox" ? <ConversationPage /> : <AnalysisPage />}</div></div>;
}
