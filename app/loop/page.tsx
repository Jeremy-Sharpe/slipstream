import { LoopView } from "@/components/loop/LoopView";
import { fixtureConversationId, getCall, getCallExtraction, getDemoEvidence, type ApiFixtureCall } from "@/lib/api/intelligence";
import { getLatestPlaybook, getLeads, getReadiness, ingestFixtureCall } from "@/lib/api/slipstream";
import { DEMO_CALL, buildLoop } from "@/lib/loop";

export const dynamic = "force-dynamic";

const reason = (error: unknown) => (error instanceof Error ? error.message : "Request failed");
const settled = <T,>(result: PromiseSettledResult<T>) => (result.status === "fulfilled" ? result.value : null);

/** The demo call by its derived id, or ingested again (idempotent) when the API minted a different one. */
async function demoCallRecord(): Promise<ApiFixtureCall | null> {
  const derived = await getCall(await fixtureConversationId(DEMO_CALL)).catch(() => null);
  if (derived) return derived;
  const call = await ingestFixtureCall(DEMO_CALL).catch(() => null);
  return call ? { ...call, subject: call.subject ?? "", fixture: true } : null;
}

export default async function LoopPage() {
  const demoCall = await demoCallRecord();
  const demoId = demoCall?.id ?? null;
  const [readiness, evidence, playbook, leads, demoExtraction] = await Promise.allSettled([
    getReadiness(),
    getDemoEvidence(),
    getLatestPlaybook(),
    getLeads(),
    demoId ? getCallExtraction(demoId) : Promise.resolve(null),
  ]);

  const demoEvidence = settled(evidence);
  const allLeads = settled(leads);
  const icpId = demoEvidence?.icp?.id;

  const loop = buildLoop({
    readiness: settled(readiness),
    evidence: demoEvidence,
    leads: allLeads ? (icpId ? allLeads.filter((lead) => lead.icp_profile_id === icpId) : allLeads) : null,
    playbook: settled(playbook),
    demoCall,
    demoExtraction: settled(demoExtraction),
    demoHref: demoId ? `/calls/${demoId}` : "/conversations",
    errors: {
      readiness: readiness.status === "rejected" ? reason(readiness.reason) : null,
      evidence: evidence.status === "rejected" ? reason(evidence.reason) : null,
      leads: leads.status === "rejected" ? reason(leads.reason) : null,
    },
  });

  return <LoopView loop={loop} />;
}
