#!/bin/sh
# If a Cloudflare tunnel URL was written to the shared volume, set all URL-related
# env vars so n8n uses the public tunnel address for webhooks and OAuth callbacks.
if [ -f /shared/tunnel-url ]; then
  tunnel_url=$(tr -d '[:space:]' < /shared/tunnel-url)
  if [ -n "$tunnel_url" ]; then
    export WEBHOOK_URL="${tunnel_url}/"
    export N8N_EDITOR_BASE_URL="${tunnel_url}/"
    export N8N_HOST="${tunnel_url#https://}"
    export N8N_PROTOCOL="https"
  fi
fi
exec n8n
