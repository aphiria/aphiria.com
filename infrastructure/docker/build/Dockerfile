ARG BASE_IMAGE=aphiria.com-base:latest
FROM ${BASE_IMAGE}

WORKDIR /app

# Copy dependency manifests first (for better layer caching)
COPY apps/api/composer.json apps/api/composer.lock* ./apps/api/
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY tools/build-docs/package.json ./tools/build-docs/

# Install dependencies (cached unless manifests change)
RUN cd apps/api && composer install --no-interaction --ignore-platform-reqs --prefer-dist --no-progress
RUN npm ci --workspace=tools/build-docs --workspace=apps/web

# Copy the rest of the source (invalidates cache on any code change)
COPY . .
COPY apps/api/.env.dist apps/api/.env

# Build tools/build-docs TypeScript
RUN npm run build --workspace=tools/build-docs

# Build documentation artifacts (from root so paths resolve correctly)
RUN node tools/build-docs/dist/index.js

# Build Next.js web app (with telemetry disabled)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/web
