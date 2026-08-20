# syntax=docker.io/docker/dockerfile:1

# Base image: Using Node.js 22 with Alpine Linux for a minimal footprint
FROM node:22-alpine AS base

# Install dependencies on the same Linux/musl platform used in production.
FROM oven/bun:1.3.10-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .
# The production environment is injected only when the container starts.
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

# Stage 3: Production runtime
# Final stage that runs the application
FROM base AS runner
LABEL org.opencontainers.image.name="shitou-academic"
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN apk add --no-cache libc6-compat \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

# Copy only the necessary files for running the application
# Static files for serving
COPY --from=builder /app/public ./public

# Copy the standalone build output and static files
# Using Next.js output tracing to minimize the final image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user for security
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Configure the server
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the Next.js application
CMD ["node", "server.js"]
