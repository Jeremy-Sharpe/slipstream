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

// Rewrites do not carry websocket upgrades, so sockets go straight to the API.
export function wsUrl(path: string): string {
  return `${API_BASE_URL.replace(/^http/, "ws")}/api/v1${path}`;
}
