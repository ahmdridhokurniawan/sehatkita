# Multi-stage build — minimal production image

FROM node:20-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Builder stage
FROM base AS builder
RUN apk add --no-cache libc6-compat
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Production stage
FROM base AS runner
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
EXPOSE 3000

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next /app/.next
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

USER nextjs

CMD ["npm", "start"]
