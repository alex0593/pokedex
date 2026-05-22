# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# NEXT_PUBLIC_* variables se embeben en el bundle en tiempo de build, no de ejecución.
# Recibe el valor desde docker-compose.prod.yml (build arg NEXT_PUBLIC_API_URL).
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js application
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1000 appgroup && adduser -D -u 1000 -G appgroup appuser

# Copy built application from builder
COPY --from=builder --chown=appuser:appgroup /app/.next /app/.next
COPY --from=builder --chown=appuser:appgroup /app/public /app/public
COPY --from=builder --chown=appuser:appgroup /app/node_modules /app/node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json /app/package.json
COPY --from=builder --chown=appuser:appgroup /app/next.config.ts /app/next.config.ts

USER appuser

EXPOSE 3000

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
