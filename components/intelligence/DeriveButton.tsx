"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { deriveIcp, getFixtures, ingestFixture, loadIcpHistory } from "@/lib/api/intelligence";
import { ApiError, derivePlaybook, getScorecard, scoreCall, type ApiScorecard } from "@/lib/api/slipstream";

/* Derives the intelligence the page reads: loads the call history, derives the
   ICP, scores every call that has no scorecard, then derives the playbook from
   the scored cohort. Every call costs tokens, so it only runs on a click. */

const CONCURRENCY = 2;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The durable store rejects a scorecard (409) if the call row moved while the judge ran,
    which happens when the ingest is still settling in the background; wait and try again. */
async function scoreSettled(call: Awaited<ReturnType<typeof ingestFixture>>, outcome: Parameters<typeof scoreCall>[1]): Promise<ApiScorecard> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await scoreCall(call, outcome);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 409 || attempt >= 4) throw error;
      await pause(3000 * attempt);
    }
  }
}
const PLAYBOOK_OUTCOMES = new Set(["won", "lost", "stalled"]);

// Scoring and playbook derivation are guarded by INGEST_TOKEN when the API sets one,
// and the browser has no business holding it. Say so rather than showing "Unauthorized".
function explain(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Scoring is a server-to-server call on this API: it needs the ingest token, which the browser does not hold.";
  }
  return error instanceof Error ? error.message : "Deriving failed";
}

async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(run));
  }
}

export function DeriveButton({ hasIcp, unscored }: { hasIcp: boolean; unscored: string[] }) {
  const router = useRouter();
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function derive() {
    setError(null);
    try {
      if (!hasIcp) {
        setStep("Loading the call history");
        await loadIcpHistory();
        setStep("Deriving the ideal customer profile");
        await deriveIcp(false);
      }

      setStep("Reading the fixture history");
      const history = (await getFixtures()).filter((fixture) => !fixture.demo);

      const scorecards: ApiScorecard[] = [];
      let done = 0;
      await inBatches(history, CONCURRENCY, async (fixture) => {
        const existing = await getScorecard(fixture.call_id);
        if (existing) scorecards.push(existing);
        else {
          const call = await ingestFixture(fixture.call_id);
          await pause(1500);
          scorecards.push(await scoreSettled(call, fixture.outcome));
        }
        done += 1;
        setStep(`Scoring calls, ${done} of ${history.length}`);
      });

      const cohort = scorecards.filter((card) => card.outcome && PLAYBOOK_OUTCOMES.has(card.outcome));
      if (cohort.length >= 2) {
        setStep("Deriving the playbook");
        await derivePlaybook(cohort);
      }

      setStep("Refreshing");
      router.refresh();
      setStep(null);
    } catch (cause) {
      setError(explain(cause));
      setStep(null);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {step && <span className="text-[13px] text-soft">{step}…</span>}
      {error && <span className="text-[13px] text-danger">{error}</span>}
      <Button variant="primary" disabled={step !== null} onClick={derive}>
        {step ? "Working" : hasIcp ? `Score ${unscored.length} calls` : "Derive from history"}
      </Button>
    </div>
  );
}
