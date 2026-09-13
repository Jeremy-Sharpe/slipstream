import { API_BASE_URL } from "@/lib/api/client";

// Same-origin gateway for browser calls. Caddy owns /api/* in production, so this
// lives under /gateway. It attaches the deployment's ingest token, which the
// browser must never hold, to the routes the API protects with it.
export const dynamic = "force-dynamic";

const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "idempotency-key"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "cache-control"];

async function forward(request: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  const search = new URL(request.url).search;
  const target = `${API_BASE_URL}/api/v1/${path.map(encodeURIComponent).join("/")}${search}`;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const token = process.env.SLIPSTREAM_INGEST_TOKEN;
  if (token) headers.set("X-Slipstream-Ingest-Token", token);

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const upstream = await fetch(target, { method: request.method, headers, body, redirect: "manual", cache: "no-store" });

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
