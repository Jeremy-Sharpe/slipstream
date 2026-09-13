import type { CoachLaunch } from "@/lib/coach/types";

// Browser calls go through the same-origin proxy in app/gateway/coach so the API ingest token
// stays on the server.
export async function coachRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/gateway/coach/${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Could not reach Slipstream. Check your connection and retry.");
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : null;
    throw new Error(detail ?? "The coach request failed. Please retry.");
  }
  return data as T;
}

// The link names the servers that created the session, so a packaged desktop coach connects to
// the right deployment (local, staging or production) without manual settings.
export function launchLink(launch: CoachLaunch, webOrigin: string): string {
  const query = new URLSearchParams({
    session: launch.session.id,
    token: launch.handoff_token,
    api: launch.api_url,
    web: webOrigin,
  });
  return `slipstream://coach?${query}`;
}
