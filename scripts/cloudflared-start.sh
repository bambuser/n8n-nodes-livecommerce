#!/bin/sh
# Starts cloudflared quick tunnel and writes the *.trycloudflare.com URL to
# /shared/tunnel-url so the n8n container can pick it up as WEBHOOK_URL.
mkdir -p /shared
cloudflared tunnel --url http://localhost:5678 --no-autoupdate 2>&1 | while IFS= read -r line; do
  printf '%s\n' "$line"
  url=$(printf '%s' "$line" | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)
  [ -n "$url" ] && printf '%s' "$url" > /shared/tunnel-url
done
