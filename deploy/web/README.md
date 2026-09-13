# Standalone presentation host

This is the deployment fallback when Vercel's free deployment quota is exhausted. It serves the same Next.js application from the Slipstream VPS without changing or restarting the API.

Build with the public same-origin API base baked into the client bundle:

```bash
NEXT_PUBLIC_API_BASE_URL=https://slipstream.3-104-149-193.sslip.io npm run build
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public
```

Publish `.next/standalone` as an immutable release under `/opt/slipstream-web/releases/<git-sha>`, switch `/opt/slipstream-web/current` atomically, install `slipstream-web.service`, then install `slipstream-web.caddy` in `/etc/caddy/conf.d/` and reload Caddy after `caddy validate` passes.

The Caddy route sends only `/ready` and `/api/*` to the existing loopback API on port 8000. Every other path goes to the standalone Next server on loopback port 3010. Browser requests are therefore same-origin and require no API restart or CORS change.
