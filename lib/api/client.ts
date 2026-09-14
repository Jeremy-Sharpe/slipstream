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
