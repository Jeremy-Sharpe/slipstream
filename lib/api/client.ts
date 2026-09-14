export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://slipstream-api.3-104-149-193.sslip.io"
).replace(/\/$/, "");

// Browser requests go through the same-origin gateway (app/gateway), which adds
// the ingest token the API expects on protected routes; server components call
// the API directly. /ready is proxied by a rewrite in next.config.ts.
export function apiUrl(path: string): string {
  if (typeof window === "undefined") return path === "/ready" ? `${API_BASE_URL}/ready` : `${API_BASE_URL}/api/v1${path}`;
  return path === "/ready" ? "/ready" : `/gateway/v1${path}`;
}

/** Server components talk to the API directly, so they carry the ingest token themselves
    (the browser never sees it; the gateway adds it there). Empty in the browser. */
export function serverAuthHeaders(): Record<string, string> {
  if (typeof window !== "undefined") return {};
  const token = process.env.SLIPSTREAM_INGEST_TOKEN;
  return token ? { "X-Slipstream-Ingest-Token": token } : {};
}

const RETRY_STATUS = new Set([502, 503, 504]);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** fetch that tries again on a gateway or store hiccup (502/503/504), up to three attempts. */
export async function fetchWithRetry(input: string, init?: RequestInit, attempts = 3): Promise<Response> {
  let response: Response | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      response = await fetch(input, init);
    } catch (error) {
      if (attempt === attempts) throw error;
      await wait(400 * attempt);
      continue;
    }
    if (!RETRY_STATUS.has(response.status) || attempt === attempts) return response;
    await wait(400 * attempt);
  }
  return response as Response;
}
