#!/usr/bin/env bash
# Start the vision backend and expose it publicly via the permanent Cloudflare
# named tunnel (bongo.soraredash.uk). Keep this running for the live camera at
# https://hackathon-cursor-musica.vercel.app to work.
#
# Usage: ./vision/serve-public.sh   (Ctrl-C stops both processes)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

TUNNEL_CONFIG="$HOME/.cloudflared/bongo-config.yml"
PORT=8000

if [ ! -f "$TUNNEL_CONFIG" ]; then
  echo "Missing $TUNNEL_CONFIG — set up the 'bongo' named tunnel first (see DEPLOYMENT.md)." >&2
  exit 1
fi

if [ ! -x ".venv/bin/uvicorn" ]; then
  echo "Missing .venv — create it and 'pip install -r requirements.txt' first." >&2
  exit 1
fi

cleanup() { echo; echo "Stopping…"; kill 0 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "▶ Starting vision backend on 127.0.0.1:$PORT (MPS GPU)…"
.venv/bin/uvicorn server:app --host 127.0.0.1 --port "$PORT" --log-level warning &

# Wait for the backend to answer before opening it to the world.
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "▶ Starting Cloudflare named tunnel → https://bongo.soraredash.uk …"
cloudflared tunnel --config "$TUNNEL_CONFIG" run bongo &

echo
echo "✅ Live. Frontend: https://hackathon-cursor-musica.vercel.app"
echo "   Backend:  https://bongo.soraredash.uk/health"
echo "   (Ctrl-C to stop both.)"
wait
