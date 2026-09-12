import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { REPO_ROOT, fetchProduction, productionUrl, readReadme, readmeField } from "./lib/repo.mjs";

const execFileAsync = promisify(execFile);

// Deterministic checks for the preliminary submission requirements and the
// README conventions the judges rely on. Runs under --dry with no model.
export default {
  name: "submission-requirements",
  kind: "deterministic",

  async check() {
    const readme = await readReadme();
    const results = [];

    const url = productionUrl(readme);
    results.push({ name: "S1 README has a Production URL line", pass: Boolean(url), detail: url || "add a line `Production URL: https://...` to README.md (or set SLIPSTREAM_PROD_URL)" });

    const live = await fetchProduction(url);
    results.push({
      name: "S2 production URL is a hosted deployment that responds 200",
      pass: Boolean(url) && live.ok && !live.isLocalhost,
      detail: url ? (live.note || `HTTP ${live.status}${live.isLocalhost ? ", localhost is scored lower" : ""}`) : "no URL to fetch",
    });

    const video = readmeField(readme, "demoVideo");
    results.push({ name: "S3 README has a Demo video line", pass: Boolean(video), detail: video || "add `Demo video: https://...` to README.md; a human still has to watch it (3 to 5 minutes, end-to-end, no slides)" });

    const track = readmeField(readme, "track");
    const trackOk = Boolean(track) && /track\s*[123]/i.test(track);
    results.push({ name: "S4 README names the track", pass: trackOk, detail: track || "add `Track: Track 1: Improve an Existing Business Capability` to README.md" });

    const headings = readme.split("\n").filter((line) => /^#{1,6}\s/.test(line)).join("\n");
    const required = [
      ["architecture", /architecture|how it works/i],
      ["model choices", /model/i],
      ["known limitations", /limitation/i],
      ["problem and target user", /problem|who it.?s for|target/i],
      ["alternatives and differentiation", /alternative|differentiation|compared|versus|vs\b/i],
      ["feasibility and value", /feasib|value|impact|cost/i],
    ];
    for (const [label, pattern] of required) {
      results.push({ name: `S5 README has a ${label} section`, pass: pattern.test(headings), detail: pattern.test(headings) ? undefined : `no heading matching ${pattern}` });
    }

    const { stdout } = await execFileAsync("git", ["ls-files", "-z"], { cwd: REPO_ROOT });
    const tracked = stdout.split("\0").filter(Boolean);
    const secrets = tracked.filter((file) => /(^|\/)\.env(\.|$)|\.pem$|(^|\/)credentials\.json$/i.test(file) && !/\.example$/i.test(file));
    results.push({ name: "S6 no env or credential files are tracked", pass: secrets.length === 0, detail: secrets.join(", ") || undefined });

    const isPublic = await repoIsPublic();
    results.push({ name: "S7 GitHub repository is public", pass: isPublic === true, detail: isPublic === null ? "could not query GitHub API" : undefined });

    return results;
  },
};

async function repoIsPublic() {
  try {
    const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], { cwd: REPO_ROOT });
    const match = stdout.trim().match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) return null;
    const response = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}`, { headers: { "user-agent": "slipstream-evals" } });
    if (response.status === 404) return false;
    if (!response.ok) return null;
    const data = await response.json();
    return data.private === false;
  } catch {
    return null;
  }
}
