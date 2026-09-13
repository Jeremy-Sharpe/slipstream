export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://slipstream-api.3-104-149-193.sslip.io"
).replace(/\/$/, "");

// Browser requests stay same-origin (Next rewrites in dev, Caddy in production);
// server components call the API directly.
export function apiUrl(path: string): string {
  const base = typeof window === "undefined" ? API_BASE_URL : "";
  return path === "/ready" ? `${base}/ready` : `${base}/api/v1${path}`;
}

// Rewrites do not carry websocket upgrades, so sockets go straight to the API.
export function wsUrl(path: string): string {
  return `${API_BASE_URL.replace(/^http/, "ws")}/api/v1${path}`;
}
