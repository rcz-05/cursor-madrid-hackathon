# Deployment

MemeBongo is two pieces that run in different places:

| Piece | Where it runs | URL |
| --- | --- | --- |
| **Frontend** (Next.js) | Vercel (serverless) | https://hackathon-cursor-musica.vercel.app |
| **Vision backend** (FastAPI + LibreYOLO + torch) | Your Mac (MPS GPU), exposed via a Cloudflare tunnel | `wss://bongo.soraredash.uk/ws/vision` |

The frontend is fully static/public and always up. The **camera only works while the
backend + tunnel are running on the Mac** — the browser streams frames over a WebSocket
to the Mac, which runs pose detection on the GPU and streams drum hits back.

```
Browser ──https──▶ Vercel (static frontend)
   │
   └──wss://bongo.soraredash.uk/ws/vision──▶ cloudflared (named tunnel) ──▶ 127.0.0.1:8000 (uvicorn, MPS GPU)
```

## Run the backend (publicly reachable)

One command starts both the FastAPI server and the named Cloudflare tunnel:

```bash
./vision/serve-public.sh
```

Keep this running (and the Mac awake) for the live camera to work. Stop with `Ctrl-C`.

`/health` check: `curl https://bongo.soraredash.uk/health` → `{"status":"ok","device":"mps"}`.

## The Cloudflare named tunnel

`bongo.soraredash.uk` is a **permanent** named tunnel — the URL never changes across
restarts, so the Vercel build does **not** need to be redeployed when you restart the
backend. Config lives outside the repo (it holds secret credentials):

- `~/.cloudflared/bongo-config.yml` — ingress: `bongo.soraredash.uk → http://127.0.0.1:8000`
- `~/.cloudflared/<tunnel-id>.json` — tunnel credentials (secret, never commit)

It is independent of the existing `sorare-dashboard` tunnel.

## The Vercel project

- Project: `hackathon-cursor-musica` (scope `rcz-05`), framework auto-detected as Next.js.
- Deployed from the local `hackathon-cursor-musica/` directory via the Vercel CLI:
  ```bash
  cd hackathon-cursor-musica
  vercel deploy --prod --yes
  ```
- **Env var** (Production): `NEXT_PUBLIC_VISION_WS = wss://bongo.soraredash.uk/ws/vision`.
  This is read at build time (`src/lib/vision.ts`) and baked into the client bundle, so a
  changed backend URL requires a redeploy. With the permanent named tunnel above, that
  effectively never happens.

## If the backend URL ever changes

```bash
cd hackathon-cursor-musica
vercel env rm NEXT_PUBLIC_VISION_WS production --yes
printf "wss://NEW-HOST/ws/vision" | vercel env add NEXT_PUBLIC_VISION_WS production
vercel deploy --prod --yes
```
