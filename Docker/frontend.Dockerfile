FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g bun

COPY ./package.json ./package.json

COPY ./bun.lock ./bun.lock

COPY ./packages ./packages

COPY ./turbo.json ./turbo.json

COPY /apps/frontend ./apps/frontend

RUN bun install

RUN bun run --filter=my-app build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

ENV PORT=3000

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000

CMD [ "node", "apps/frontend/server.js" ]