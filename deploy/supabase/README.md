# VPS Supabase runtime

This is the credential-independent production fallback for the hackathon VPS. It runs the pinned Supabase CLI stack with Docker, applies the repository's reviewed migrations, and supplies the generated service-role credential to FastAPI through a root-only systemd environment file.

The REST API and Postgres ports must bind to loopback. FastAPI is the only public data boundary; the service-role credential is never copied into the repository, command arguments, logs, Caddy, Vercel, or browser code. `install.sh` fails closed if either database port is exposed beyond loopback.

From an already-deployed release:

```bash
sudo /opt/slipstream/current/deploy/supabase/install.sh
```

Runtime state lives under `/opt/slipstream/supabase-runtime` and Docker volumes, independently of atomic API releases. The systemd unit is enabled for boot. The start wrapper copies forward new additive migrations and runs `supabase migration up --local`; it never resets the database.

Verify without reading secrets:

```bash
systemctl is-active slipstream-supabase slipstream-api
curl --fail --silent https://slipstream-api.3-104-149-193.sslip.io/ready | jq '{storage, supabase: .integrations.supabase}'
sudo stat -c '%a %U:%G %n' /etc/slipstream/supabase.env
```

This stack is self-hosted Supabase, not the team's managed Supabase project. If managed credentials become available, remove the API systemd drop-in, install those values through the approved secret channel, and restart the API; do not copy keys into git.
