FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g bun

COPY ./package.json ./package.json

COPY ./turbo.json ./turbo.json

COPY ./bun.lock. ./bun.lock

COPY ./packages ./packages

COPY apps/worker ./apps/worker

RUN bun install

RUN bun run --filter=worker build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g bun

# Server-side Expo tunnel prerequisites:
# - pnpm installs the generated project's dependencies (matches the expo-base
#   template's committed pnpm-lock.yaml + flat .npmrc).
# - @expo/ngrok is what `expo start --tunnel` uses to expose a public exp:// URL
#   so a phone on any network can open the app in Expo Go.
# - libstdc++/gcompat provide the glibc shims the ngrok binary needs on Alpine
#   (musl); without them the tunnel binary fails to start.
RUN apk add --no-cache libstdc++ gcompat \
    && npm install -g pnpm@9 @expo/ngrok@^4.1.0

COPY --from=builder app/package.json ./

COPY --from=builder app/node_modules ./node_modules

COPY --from=builder /app/apps/worker ./apps/worker


CMD [ "bun", "run", "apps/worker/index.ts" ]