import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PRODUCTION_API_SURFACES,
  copyRepoTo,
  fetchProductionSurfaces,
  productionApiUrl,
  productionUrl,
  readReadme,
  renderProductionSurfaces,
} from "./repo.mjs";

// Builds one model scenario that scores a single rubric criterion the way a
// hackathon judge would, from the repo snapshot and a fetched copy of the
// production URL. Passes only when score >= criterion.target.
export function judgeScenario(criterion) {
  return {
    name: `judge-${criterion.id}-${slug(criterion.name)}`,
    kind: "model",
    model: "sonnet",
    runs: 1,
    maxTurns: 30,
    timeoutMs: 10 * 60 * 1000,

    async setup(ctx) {
      await copyRepoTo(ctx.workspaceDir);
      const judgeDir = path.join(ctx.workspaceDir, "_judge");
      await mkdir(judgeDir, { recursive: true });
      const readme = await readReadme();
      const url = productionUrl(readme);
      const apiUrl = productionApiUrl(readme);
      const [surfaces, apiSurfaces] = await Promise.all([
        fetchProductionSurfaces(url),
        fetchProductionSurfaces(apiUrl, PRODUCTION_API_SURFACES),
      ]);
      await writeFile(
        path.join(judgeDir, "production-url.md"),
        renderProductionSurfaces(url, surfaces) + "\n" +
          renderProductionSurfaces(apiUrl, apiSurfaces, {
            title: "Production API snapshots",
            description: "These are bounded snapshots of deployed provider readiness, the live mixed-channel ICP-to-fictional-lead proof, canonical call artefacts and real campaign execution state for this eval run.",
          }),
      );
      await writeFile(path.join(judgeDir, "rubric.md"), renderRubric(criterion));
    },

    task() {
      return [
        `You are a judge for the Forward: AI in Business hackathon. Score exactly one criterion: ${criterion.id} ${criterion.name} (${criterion.points} points).`,
        `The current directory is the team's repository snapshot. _judge/rubric.md holds the rubric bands and what to inspect. _judge/production-url.md contains fetched text snapshots of the public product routes; treat them as what a judge would see when opening those URLs.`,
        `Read files only. Do not run commands, install anything, or modify files.`,
        `Be strict and evidence-based: a claim with no evidence in the repo or the live URL does not count, and missing artefacts score in the lowest band. Quote file paths for every piece of evidence.`,
        `Finish with a single JSON object on its own as the last line, no code fence, in this shape:`,
        `{"criterion":"${criterion.id}","score":<integer 0-${criterion.points}>,"band":"<the band label you chose>","evidence":["<file or URL: what you saw>"],"gaps":["<the specific change that would lift the score>"]}`,
      ].join("\n\n");
    },

    async assert(ctx) {
      const verdict = parseVerdict(ctx.finalText, criterion);
      if (!verdict) {
        return [{ name: `${criterion.id} verdict is valid JSON`, pass: false, detail: tail(ctx.finalText) }];
      }
      const score = Number(verdict.score);
      const inRange = Number.isInteger(score) && score >= 0 && score <= criterion.points;
      const summary = [
        `score ${score}/${criterion.points} (target ${criterion.target}), band: ${verdict.band}`,
        `evidence: ${list(verdict.evidence)}`,
        `gaps: ${list(verdict.gaps)}`,
      ].join("\n");
      return [
        { name: `${criterion.id} score is an integer in 0-${criterion.points}`, pass: inRange, detail: inRange ? undefined : String(verdict.score) },
        { name: `${criterion.id} ${criterion.name} scores at least ${criterion.target}/${criterion.points}`, pass: inRange && score >= criterion.target, detail: summary },
      ];
    },
  };
}

function renderRubric(criterion) {
  return [
    `# ${criterion.id}: ${criterion.name} (${criterion.points} points)`,
    ``,
    `Area: ${criterion.area}`,
    `Real judges score this from: ${criterion.judgedFrom}`,
    `Team target: ${criterion.target}/${criterion.points}`,
    ``,
    `## What to inspect`,
    ``,
    criterion.inspect,
    ``,
    `## Score bands (verbatim from the organisers)`,
    ``,
    ...criterion.bands.map((band) => `- ${band}`),
    ``,
  ].join("\n");
}

export function parseVerdict(text, criterion) {
  if (!text) return null;
  const trimmed = text.trim();
  for (const line of trimmed.split("\n").reverse()) {
    try {
      const parsed = JSON.parse(line.trim());
      if (parsed && "score" in parsed) return parsed;
    } catch {
      // keep looking
    }
  }
  for (let start = trimmed.lastIndexOf("{"); start >= 0; start = trimmed.lastIndexOf("{", start - 1)) {
    try {
      const parsed = JSON.parse(trimmed.slice(start));
      if (parsed && "score" in parsed) return parsed;
    } catch {
      // keep looking
    }
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/g) || [];
  for (const block of fenced.reverse()) {
    try {
      const parsed = JSON.parse(block.replace(/```(?:json)?/g, "").trim());
      if (parsed && "score" in parsed) return parsed;
    } catch {
      // keep looking
    }
  }
  if (criterion?.id && Number.isInteger(criterion.points)) {
    const criterionId = escapeRegExp(criterion.id);
    const finalScore = new RegExp(
      `final\\s+score[^\\n]{0,100}\\b${criterionId}\\b[^\\n]{0,40}?(\\d{1,2})\\s*\\/\\s*${criterion.points}\\b`,
      "gi",
    );
    const matches = [...text.matchAll(finalScore)];
    if (matches.length) {
      return {
        criterion: criterion.id,
        score: Number(matches.at(-1)[1]),
        band: "Judge-stated final score (prose fallback)",
        evidence: [],
        gaps: ["Judge omitted the requested JSON footer; consult the full judge transcript for evidence and gaps."],
      };
    }
  }
  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function list(value) {
  return Array.isArray(value) && value.length ? value.map(String).join(" | ") : "(none given)";
}

function tail(text) {
  return (text || "").slice(-600);
}

function slug(name) {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
