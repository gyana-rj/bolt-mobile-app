FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g bun

COPY ./package.json ./package.json

COPY ./turbo.json ./turbo.json

COPY ./bun.lock ./bun.lock

COPY ./packages ./packages

COPY apps/backend ./apps/backend

RUN bun install

RUN bun run --filter=backend build

FROM node:20-alpine AS runner 

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g bun

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend

EXPOSE 9090

CMD [ "bun", "run", "apps/backend/index.ts" ]