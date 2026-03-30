# Dockerfile for ResFlow Application with Cron Support

FROM node:20-alpine AS base
ARG PNPM_VERSION=9.15.4
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS runtime
ARG PNPM_VERSION=9.15.4
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
RUN apk add --no-cache curl dcron && \
    corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/scripts ./scripts

RUN chmod +x /app/scripts/docker-entrypoint.sh /app/scripts/cron-runner.sh && \
    mkdir -p /var/log && \
    touch /var/log/cron-daily.log /var/log/cron-weekly.log && \
    chmod 644 /var/log/cron-daily.log /var/log/cron-weekly.log

EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["pnpm", "start"]
