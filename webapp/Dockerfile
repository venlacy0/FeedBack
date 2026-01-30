## syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# better-sqlite3 需要本地编译工具链
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
ENV NODE_ENV=development
ARG NPM_CONFIG_REGISTRY
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  if [ -n "${NPM_CONFIG_REGISTRY:-}" ]; then npm config set registry "$NPM_CONFIG_REGISTRY"; fi \
  && npm ci --no-audit --no-fund

FROM base AS builder
ENV NODE_ENV=development
# Next build 阶段会 import server 代码；如果没提供 DATABASE_URL，Prisma 单例会在 import 时抛错。
# 这里给一个仅用于构建阶段的 SQLite 路径，避免 CI/CD 构建失败。
ENV DATABASE_URL="file:./dev.db"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN --mount=type=cache,target=/app/.next/cache npm run build
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/generated ./generated

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
