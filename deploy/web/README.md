# Standalone presentation host

This is the deployment fallback when Vercel's free deployment quota is exhausted. It serves the same Next.js application from the Slipstream VPS without changing or restarting the API.

Build with the public same-origin API base baked into the client bundle:

```bash
NEXT_PUBLIC_API_BASE_URL=https://slipstream.3-104-149-193.sslip.io npm run build
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public
```

Publish `.next/standalone` as an immutable release under `/opt/slipstream-web/releases/<git-sha>`, switch `/opt/slipstream-web/current` atomically, install `slipstream-web.service`, then install `slipstream-web.caddy` in `/etc/caddy/conf.d/` and reload Caddy after `caddy validate` passes.

The Caddy route sends only `/ready`, `/openapi.json`, and `/api/*` to the existing loopback API on port 8000. The schema path keeps the production contract smoke-testable without exposing the API's interactive documentation. Every other path goes to the standalone Next server on loopback port 3010. Browser requests are therefore same-origin and require no API restart or CORS change.

The web server also needs the API's ingest token so the browser gateway (`app/gateway`) can reach the protected routes (scoring, playbook, email ingest, transcription). On the VPS it lives in root-owned `/etc/slipstream/web.env` as `SLIPSTREAM_INGEST_TOKEN=<same value as INGEST_TOKEN in /etc/slipstream/api.env>` (mode 600), referenced by the drop-in `/etc/systemd/system/slipstream-web.service.d/ingest-token.conf` (`[Service]` `EnvironmentFile=/etc/slipstream/web.env`), so reinstalling the unit file keeps it. Deployed this way on 13 September 2026 for release `8111ea6`.
