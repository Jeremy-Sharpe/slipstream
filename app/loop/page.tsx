import { LoopView } from "@/components/loop/LoopView";
import { fixtureConversationId, getCall, getCallExtraction, getDemoEvidence } from "@/lib/api/intelligence";
import { getLatestPlaybook, getLeads, getReadiness } from "@/lib/api/slipstream";
import { DEMO_CALL, buildLoop } from "@/lib/loop";

export const dynamic = "force-dynamic";

const reason = (error: unknown) => (error instanceof Error ? error.message : "Request failed");
const settled = <T,>(result: PromiseSettledResult<T>) => (result.status === "fulfilled" ? result.value : null);

export default async function LoopPage() {
  const demoId = await fixtureConversationId(DEMO_CALL);
  const [readiness, evidence, playbook, leads, demoCall, demoExtraction] = await Promise.allSettled([
    getReadiness(),
    getDemoEvidence(),
    getLatestPlaybook(),
    getLeads(),
    getCall(demoId),
    getCallExtraction(demoId),
  ]);

  const demoEvidence = settled(evidence);
  const allLeads = settled(leads);
  const icpId = demoEvidence?.icp?.id;

  const loop = buildLoop({
    readiness: settled(readiness),
    evidence: demoEvidence,
    leads: allLeads ? (icpId ? allLeads.filter((lead) => lead.icp_profile_id === icpId) : allLeads) : null,
    playbook: settled(playbook),
    demoCall: settled(demoCall),
    demoExtraction: settled(demoExtraction),
    demoHref: settled(demoCall) ? `/calls/${demoId}` : "/conversations",
    errors: {
      readiness: readiness.status === "rejected" ? reason(readiness.reason) : null,
      evidence: evidence.status === "rejected" ? reason(evidence.reason) : null,
      leads: leads.status === "rejected" ? reason(leads.reason) : null,
    },
  });

  return <LoopView loop={loop} />;
}
