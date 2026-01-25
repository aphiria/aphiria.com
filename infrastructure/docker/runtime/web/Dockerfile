# Global ARGs (available to all FROM statements)
ARG BUILD_IMAGE=aphiria.com-build:latest

# Stage 1: Use the build image to copy necessary files
FROM ${BUILD_IMAGE} AS build

# Stage 2: Node.js runtime for SSR
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output from build image
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start Next.js server
CMD ["node", "apps/web/server.js"]
