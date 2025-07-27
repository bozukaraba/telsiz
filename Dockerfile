# Multi-stage build
FROM node:18-alpine AS base

# Server build stage
FROM base AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
RUN npm run build

# Client build stage  
FROM base AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Server dosyalarını kopyala
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/package*.json ./server/
COPY --from=server-builder /app/server/node_modules ./server/node_modules

# Client build dosyalarını kopyala
COPY --from=client-builder /app/client/build ./client/build

# Gerekli dizinleri oluştur
RUN mkdir -p /app/client/build

# Non-root kullanıcı
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server/dist/index.js"] 