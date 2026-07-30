# Free Deploy — Render (manual, no card)

The **Blueprint** flow forces a card on file even for free services. Creating each
service **manually** on the free tier does not. So we skip `render.yml` and create
services by hand.

Stack (all free):

| Piece      | Host   | Notes                                  |
|------------|--------|----------------------------------------|
| Postgres   | Neon   | free project, gives pooled + direct URL |
| backend    | Render | Docker web service, free               |
| worker     | Render | Docker web service, free               |
| frontend   | Vercel | Next.js, free (Hobby)                   |

> The worker runs Expo dev servers + tunnels and is memory-hungry. Render's free
> instance is 512 MB and sleeps after ~15 min idle — fine for demo/testing, tight
> for real use. Move just the worker to Railway later if it gets killed.

Prereqs already fixed in the repo: backend/worker now bind to `$PORT`; Dockerfiles
fixed (bun.lock typo, `packages/` copied into runner, `prisma generate` at build).
**Commit and push these before deploying.**

---

## 1. Database — Neon

1. Create a project at https://neon.tech (free).
2. Copy two connection strings from the dashboard:
   - **Pooled** connection string → use as `DATABASE_URL`
   - **Direct** connection string → use as `DIRECT_URL`
3. Create the tables once (from your machine, repo root):
   ```bash
   cd packages/db
   DATABASE_URL="<direct-url>" bunx prisma db push
   ```
   (Use the **direct** URL for schema pushes/migrations.)

---

## 2. Backend — Render (Docker, free)

Render dashboard → **New → Web Service** → connect this GitHub repo.

| Field              | Value                                   |
|--------------------|-----------------------------------------|
| Language / Runtime | **Docker**                              |
| Dockerfile Path    | `Docker/backend.Dockerfile`             |
| Docker Build Context Directory | `.` (repo root)             |
| Instance Type      | **Free**                                |
| Health Check Path  | `/` (or a known route)                  |

Environment variables:

```
DATABASE_URL      = <Neon pooled url>
CLERK_SECRET_KEY  = <from Clerk dashboard>
JWT_PUBLIC_KEY    = <from Clerk: JWKS / PEM public key>
NODE_ENV          = production
```

Deploy. Note the public URL, e.g. `https://bolty-backend.onrender.com`.

---

## 3. Worker — Render (Docker, free)

**New → Web Service** → same repo.

| Field              | Value                                   |
|--------------------|-----------------------------------------|
| Language / Runtime | **Docker**                              |
| Dockerfile Path    | `Docker/woker.Dockerfile`               |
| Docker Build Context Directory | `.` (repo root)             |
| Instance Type      | **Free**                                |

Environment variables:

```
DATABASE_URL   = <Neon pooled url>
GEMINI_API_KEY = <Google AI Studio key>
BASE_WORK_DIR  = /tmp/bolty-worker
NODE_ENV       = production
```

Deploy. Note the URL, e.g. `https://bolty-worker.onrender.com`.

> Code reads `GEMINI_API_KEY` (the old `render.yml` had `GEMINI_AI_KEY` — wrong name).

---

## 4. Frontend — Vercel (free)

The frontend currently hardcodes localhost in `apps/frontend/config.ts`:

```ts
export const BACKEND_URL = "http://localhost:9090";
export const WORKER_URL = "http://localhost:8080";
export const WORKER_API_URL = "http://localhost:9091";
```

Change these to your deployed URLs (or, better, read from `NEXT_PUBLIC_*` env vars).
Minimal version — edit the file to point at the Render URLs:

```ts
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:9090";
export const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8080";
export const WORKER_API_URL = process.env.NEXT_PUBLIC_WORKER_API_URL ?? "http://localhost:9091";
```

Then on Vercel → **New Project** → import repo:

| Field            | Value                 |
|------------------|-----------------------|
| Root Directory   | `apps/frontend`       |
| Framework        | Next.js (auto)        |

Environment variables:

```
NEXT_PUBLIC_BACKEND_URL     = https://bolty-backend.onrender.com
NEXT_PUBLIC_WORKER_API_URL  = https://bolty-worker.onrender.com
NEXT_PUBLIC_WORKER_URL      = https://bolty-worker.onrender.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = <from Clerk>
CLERK_SECRET_KEY            = <from Clerk>
```

Deploy.

---

## 5. Wire up CORS / Clerk

- In the **backend** and **worker** CORS config, allow your Vercel frontend origin.
- In **Clerk**, add the Vercel domain to allowed origins / redirect URLs.

---

## Gotchas

- **Cold starts:** free Render services sleep after ~15 min; first request wakes them (~30 s).
- **Worker memory:** if the worker gets OOM-killed spinning up Expo, move it to Railway
  (Docker deploy, same Dockerfile) — ~$5/mo but more RAM.
- **`bun.lock`:** make sure it's committed; the Docker build copies it.
- **orchestrator:** intentionally skipped — not deployed, nothing references it.
