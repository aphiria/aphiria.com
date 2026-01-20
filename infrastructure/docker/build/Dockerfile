FROM php:8.4-fpm

WORKDIR /app

# Core build + runtime deps for PHP 8.4 extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    $PHPIZE_DEPS \
    git cmake unzip \
    libxml2-dev libpq-dev libzip-dev zlib1g-dev libicu-dev \
    curl ca-certificates gnupg \
 && rm -rf /var/lib/apt/lists/*

# Node.js 24.x for tools/build-docs pipeline (via official binaries)
RUN curl -fsSL https://nodejs.org/dist/v24.1.0/node-v24.1.0-linux-x64.tar.xz -o /tmp/node.tar.xz \
 && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
 && rm /tmp/node.tar.xz \
 && corepack enable

# Help DOM's vendored Lexbor find headers
ENV CPPFLAGS="-I/usr/src/php"

# Build bundled PHP extensions (no external Lexbor)
RUN docker-php-ext-install -j"$(nproc)" \
    dom intl opcache zip pdo pdo_pgsql pgsql

# Install APCu for Prometheus metrics storage
RUN pecl install apcu && docker-php-ext-enable apcu

# Configure APCu with sufficient shared memory for metrics (64MB)
RUN echo "apc.shm_size=64M" >> /usr/local/etc/php/conf.d/docker-php-ext-apcu.ini \
 && echo "apc.enable_cli=1" >> /usr/local/etc/php/conf.d/docker-php-ext-apcu.ini

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
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
