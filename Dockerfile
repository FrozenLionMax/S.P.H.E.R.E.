# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build Next.js (standalone output)
COPY . .
RUN npm run build

# ---- Stage 2: Production Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy the standalone Next.js build (includes node_modules it needs)
COPY --from=builder /app/.next/standalone ./
# Copy static assets and public files (not included in standalone)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Copy our custom server (replaces the default standalone server.js)
COPY --from=builder /app/server.js ./server.js
# Copy full node_modules for express/ws dependencies used by server.js
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

CMD ["node", "server.js"]
