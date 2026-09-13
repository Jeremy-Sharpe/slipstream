import type { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/api/slipstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The browser never holds the API ingest token. This proxy adds it on the server and forwards
// only the routes the website needs; the desktop coach uses its own scoped session token.
// It lives under /gateway because the production Caddy host sends every /api/* path to the API.
const SESSION = /^sessions\/[0-9a-f-]{36}$/i;
type Context = { params: Promise<{ path: string[] }> };

// A session's random UUID is what lets the page read it, so there is deliberately no list route.
function allowed(method: string, path: string): boolean {
  if (method === "GET") return SESSION.test(path);
  return method === "POST" && path === "sessions";
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  // Behind the VPS reverse proxy the forwarded host is the one the browser used.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function forward(request: NextRequest, context: Context) {
  const path = (await context.params).path.join("/");
  if (!allowed(request.method, path)) {
    return Response.json({ detail: "Coach route not found" }, { status: 404 });
  }
  let body: string | undefined;
  if (request.method === "POST") {
    if (!sameOrigin(request)) {
      return Response.json({ detail: "Start the coach from the Slipstream website" }, { status: 403 });
    }
    body = await request.text();
    if (body.length > 10_000) {
      return Response.json({ detail: "Customer details are too long" }, { status: 413 });
    }
    try {
      JSON.parse(body);
    } catch {
      return Response.json({ detail: "The coach request was not valid JSON" }, { status: 400 });
    }
  }
  // API_BASE_URL may be an internal address (for example loopback on the VPS). The desktop coach
  // runs on the rep's computer, so it gets COACH_PUBLIC_API_URL when that is set.
  const base = (process.env.API_BASE_URL || API_BASE_URL).replace(/\/$/, "");
  const token = process.env.SLIPSTREAM_INGEST_TOKEN || process.env.INGEST_TOKEN;
  try {
    const response = await fetch(`${base}/api/v1/coach/${path}`, {
      method: request.method,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Slipstream-Ingest-Token": token } : {}),
      },
    });
    const data: unknown = await response.json();
    const headers = { "Cache-Control": "no-store" };
    if (request.method === "POST" && response.ok && data && typeof data === "object") {
      const apiUrl = new URL(process.env.COACH_PUBLIC_API_URL || base).origin;
      return Response.json({ ...data, api_url: apiUrl }, { status: response.status, headers });
    }
    return Response.json(data, { status: response.status, headers });
  } catch (error) {
    const cause = error instanceof Error ? ((error.cause as { code?: string } | undefined)?.code ?? error.message) : String(error);
    console.error(`Coach proxy could not reach ${base}: ${cause}`);
    // The API address is not secret; showing it locally makes a wrong API_BASE_URL obvious.
    const hint = process.env.NODE_ENV === "production" ? "" : ` (${base}: ${cause})`;
    return Response.json(
      { detail: `The coach API is unavailable. Check the API connection and retry.${hint}` },
      { status: 503 },
    );
  }
}

export const GET = forward;
export const POST = forward;
