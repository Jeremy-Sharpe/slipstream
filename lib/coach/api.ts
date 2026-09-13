// Browser calls go through the same-origin proxy in app/api/coach so the API ingest token
// stays on the server.
export async function coachRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/coach/${path}`, {
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

export function launchLink(sessionId: string, handoffToken: string): string {
  return `slipstream://coach?${new URLSearchParams({ session: sessionId, token: handoffToken })}`;
}
