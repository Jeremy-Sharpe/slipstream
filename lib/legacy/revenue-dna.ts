export type SimulatedOutcome = "won" | "lost";

export type RevenueDnaShock = {
  outcome: SimulatedOutcome;
  direction: string;
  staleProfile: string;
  affectedLeads: number;
  sourcingState: string;
  nextProfile: string;
};

export function simulateRevenueDnaShock(outcome: SimulatedOutcome, profileVersion: number, leadsOnProfile: number): RevenueDnaShock {
  const safeVersion = Number.isInteger(profileVersion) && profileVersion > 0 ? profileVersion : 1;
  const safeLeadCount = Number.isInteger(leadsOnProfile) && leadsOnProfile > 0 ? leadsOnProfile : 0;
  return {
    outcome,
    direction: outcome === "won" ? "Strengthens the new account pattern" : "Challenges the current target pattern",
    staleProfile: `ICP v${safeVersion} becomes stale`,
    affectedLeads: safeLeadCount,
    sourcingState: "New sourcing pauses before provider spend",
    nextProfile: `Relearn produces ICP v${safeVersion + 1}`,
  };
}
