FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g bun

COPY ./package.json ./package.json

COPY ./bun.lock ./bun.lock

COPY ./turbo.json ./turbo.json

COPY ./packages ./packages

COPY apps/worker-orchestrator ./apps/worker-orchestrator

RUN bun install

# The orchestrator has no build script; it runs its TS entrypoint directly.

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g bun

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker-orchestrator ./apps/worker-orchestrator


EXPOSE 9092

CMD [ "bun", "run", "apps/worker-orchestrator/index.ts" ]