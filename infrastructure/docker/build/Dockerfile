ARG BASE_IMAGE=ghcr.io/davidbyoung/aphiria.com-base:latest
FROM ${BASE_IMAGE}

WORKDIR /app
COPY apps/api/composer.json apps/api/composer.lock* ./apps/api/
RUN cd apps/api && composer install --no-interaction --ignore-platform-reqs --prefer-dist --no-progress

# Copy the rest of the source
COPY . .
COPY apps/api/.env.dist apps/api/.env

# Install TypeScript workspace dependencies (exclude e2e - not needed for build)
# Uses root package-lock.json for consistent dependency resolution
COPY package.json package-lock.json ./
RUN npm ci --workspace=tools/build-docs --workspace=apps/web

# Build tools/build-docs TypeScript
RUN npm run build --workspace=tools/build-docs

# Build documentation artifacts (from root so paths resolve correctly)
RUN node tools/build-docs/dist/index.js

# Build Next.js web app (with telemetry disabled)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/web
