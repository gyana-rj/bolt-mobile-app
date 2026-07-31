# Contributing

This is a **Bun + Turborepo** monorepo (not npm/pnpm/yarn). Services and ports:

| Path                       | Service                | Port |
| -------------------------- | ---------------------- | ---- |
| `apps/frontend`            | Next.js UI             | 3000 |
| `apps/backend`             | Express API            | 9090 |
| `apps/worker`              | Build / Expo worker    | 9091 |
| `apps/worker-orchestrator` | AWS scaling (optional) | 9092 |
| `packages/db`              | Prisma schema + client | —    |

## Manual Installation

- Install [Bun](https://bun.sh) locally on your machine
- Clone the repo
  - `git clone https://github.com/gyana-rj/bolt-mobile-app.git`
  - `cd bolt-mobile-app`
- `bun install`
- Start the db locally
  - `docker run -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=bolty_db -d -p 5432:5432 postgres`
  - Or go to neon.tech or supabase and get yourself a new DB
- Create and update your `.env` files with the db credentials
  - `packages/db/.env` → `DATABASE_URL` and `DIRECT_URL`
  - `apps/backend/.env` → `DATABASE_URL`, `CLERK_SECRET_KEY`
  - `apps/worker/.env` → `DATABASE_URL`, `GEMINI_API_KEY`, `BASE_WORK_DIR`
  - `apps/frontend/.env.local` → `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_WORKER_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `bun run --filter @bolt/db db:migrate`
- `bun run --filter @bolt/db db:generate`
- `bun run build`
- `bun run dev` (development) — or start each app: `bun --filter backend start`, `bun --filter worker start`, `bun --filter my-app start`

## Docker Installation

Each service has its own Dockerfile under `Docker/`. Build from the **repo root** (the build context must be `.`, not the `Docker/` folder). Example uses the backend.

- Install docker locally on your machine
- Create a network `docker network create user_project`
- Start postgres `docker run --network user_project --name postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=bolty_db -d -p 5432:5432 postgres`
- Run migration locally (to create tables in the new database)
  - `bun run --filter @bolt/db db:migrate`
- Build the image `docker build -f Docker/backend.Dockerfile -t user-project:v1.1 .`
- Start the application container `docker run -e DATABASE_URL=postgresql://postgres:mysecretpassword@postgres:5432/bolty_db -e CLERK_SECRET_KEY=sk_... --network user_project -p 9090:9090 user-project:v1.1`

Other services build the same way — swap the Dockerfile, tag, and port:
`Docker/worker.Dockerfile` (9091), `Docker/worker-orchestrator.Dockerfile` (9092), `Docker/frontend.Dockerfile` (3000).

## Docker compose Installation

- Install docker and docker compose
- Bring up the stack (list services explicitly — see note)
  - `docker compose up --build postgres backend worker worker-orchestrator frontend`
- Run the initial migration once Postgres is up (containers don't migrate on start)
  - `bun run --filter @bolt/db db:migrate`

> **Note:** `docker-compose.yml` references `Docker/code-server.Dockerfile`, which isn't in the repo yet, so a bare `docker compose up --build` fails on that service. List the services explicitly as above, or remove the `code-server` block from `docker-compose.yml`.
