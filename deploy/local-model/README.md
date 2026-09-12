# Local reasoning runtime

This optional production fallback runs schema-constrained extraction and drafting without a
hosted-provider credential. It is deliberately identified as `local_model`; hosted Anthropic,
OpenAI or OpenRouter credentials still take priority.

The runtime uses the official Apache-2.0 Qwen2.5 1.5B Instruct Q4_K_M GGUF and llama.cpp server.
Both the container digest and the 1,117,320,736-byte model checksum are pinned. The service:

- publishes only `127.0.0.1:8081`, never a public model port;
- runs read-only with every Linux capability dropped, no-new-privileges, and resource limits;
- exposes schema-constrained OpenAI-compatible chat completions at `/v1`;
- keeps Slipstream `/ready` red if the configured model alias is not actually loaded.

Install on the API host from a trusted checkout:

```bash
sudo ./deploy/local-model/install.sh
```

Then add these non-secret settings to `/etc/slipstream/api.env` and restart the API:

```dotenv
LOCAL_MODEL_BASE_URL=http://127.0.0.1:8081/v1
LOCAL_MODEL_NAME=slipstream-qwen2.5-1.5b-instruct-q4-k-m
```

Verify the boundary and API view:

```bash
curl --fail http://127.0.0.1:8081/v1/models
curl --fail https://slipstream-api.3-104-149-193.sslip.io/ready
ss -ltn '( sport = :8081 )'
```

The final command must show loopback only. Do not proxy port 8081 through Caddy or another public
listener. The local model does not provide embeddings, transcription, lead generation, CRM
delivery or email delivery; those integration flags remain independently truthful.
