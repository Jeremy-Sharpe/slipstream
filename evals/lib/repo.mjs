import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const PRODUCTION_SURFACES = [
  { label: "Conversations", path: "/" },
  { label: "Evidence-backed call detail", path: "/conversations/call-13-marlowe-finch-demo" },
  { label: "Intelligence", path: "/intelligence" },
  { label: "Leads", path: "/leads" },
  { label: "Campaigns", path: "/campaigns" },
];

// Lines the README must carry so the checks (and the judges) can find the
// submission artefacts. Documented in docs/judging-evals.md.
export const README_FIELDS = {
  productionUrl: /^\**\s*Production URL:?\**:?\s*<?(https?:\/\/\S+?)>?\s*$/im,
  demoVideo: /^\**\s*Demo video:?\**:?\s*<?(https?:\/\/\S+?)>?\s*$/im,
  track: /^\**\s*Track:?\**:?\s*(.+?)\s*$/im,
};

export async function readReadme() {
  return readFile(path.join(REPO_ROOT, "README.md"), "utf8").catch(() => "");
}

export function readmeField(readme, field) {
  const match = readme.match(README_FIELDS[field]);
  return match ? match[1].trim() : null;
}

export function productionUrl(readme) {
  return process.env.SLIPSTREAM_PROD_URL || readmeField(readme, "productionUrl");
}

// Tracked plus untracked-but-not-ignored files, so local work in progress is
// judged the same way the committed tree will be.
export async function listRepoFiles() {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 },
  );
  return stdout.split("\0").filter(Boolean).filter((file) => !file.startsWith(".claude/"));
}

export async function copyRepoTo(destDir) {
  const files = await listRepoFiles();
  for (const file of files) {
    const target = path.join(destDir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(REPO_ROOT, file), target);
  }
  return files;
}

// Fetch the live deployment once per run and hand the judge a text snapshot,
// because the headless judge reads files and does not get network or bash.
export async function fetchProduction(url) {
  if (!url) return { ok: false, status: null, note: "no Production URL line in README and SLIPSTREAM_PROD_URL unset" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      finalUrl: response.url,
      text: htmlToText(body).slice(0, 20_000),
      isLocalhost: /localhost|127\.0\.0\.1/.test(url),
    };
  } catch (error) {
    return { ok: false, status: null, note: `fetch failed: ${error.message}` };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchProductionSurfaces(baseUrl, surfaces = PRODUCTION_SURFACES) {
  if (!baseUrl) {
    return surfaces.map((surface) => ({
      ...surface,
      url: null,
      snapshot: {
        ok: false,
        status: null,
        note: "no Production URL line in README and SLIPSTREAM_PROD_URL unset",
      },
    }));
  }
  return Promise.all(
    surfaces.map(async (surface) => {
      let url;
      try {
        url = new URL(surface.path, baseUrl).toString();
      } catch (error) {
        return {
          ...surface,
          url: null,
          snapshot: { ok: false, status: null, note: `invalid production URL: ${error.message}` },
        };
      }
      return { ...surface, url, snapshot: await fetchProduction(url) };
    }),
  );
}

export function renderProductionSnapshot(url, snapshot) {
  const lines = [`# Production URL snapshot`, ``, `URL: ${url || "(none)"}`];
  if (snapshot.note) lines.push(`Result: ${snapshot.note}`);
  else {
    lines.push(`HTTP status: ${snapshot.status}`, `Content-Type: ${snapshot.contentType}`, `Final URL: ${snapshot.finalUrl}`);
    if (snapshot.isLocalhost) lines.push(`WARNING: this is a localhost URL, not a hosted deployment.`);
    lines.push(``, `## Visible text of the landing page`, ``, snapshot.text || "(empty body)");
  }
  return lines.join("\n") + "\n";
}

export function renderProductionSurfaces(baseUrl, surfaces) {
  const lines = [
    `# Production surface snapshots`,
    ``,
    `Base URL: ${baseUrl || "(none)"}`,
    ``,
    `These are bounded server-rendered text snapshots fetched from each public route for this eval run.`,
  ];
  for (const surface of surfaces) {
    const snapshot = surface.snapshot;
    lines.push(``, `## ${surface.label}`, ``, `URL: ${surface.url || "(none)"}`);
    if (snapshot.note) {
      lines.push(`Result: ${snapshot.note}`);
      continue;
    }
    lines.push(
      `HTTP status: ${snapshot.status}`,
      `Content-Type: ${snapshot.contentType}`,
      `Final URL: ${snapshot.finalUrl}`,
    );
    if (snapshot.isLocalhost) {
      lines.push(`WARNING: this is a localhost URL, not a hosted deployment.`);
    }
    lines.push(``, `### Visible server-rendered text`, ``, snapshot.text || "(empty body)");
  }
  return lines.join("\n") + "\n";
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
