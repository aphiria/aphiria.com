FROM php:8.4-fpm

WORKDIR /app

# Core build + runtime deps for PHP 8.4 extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    $PHPIZE_DEPS \
    git cmake unzip \
    libxml2-dev libpq-dev libzip-dev zlib1g-dev libicu-dev \
    curl ca-certificates gnupg \
 && rm -rf /var/lib/apt/lists/*

# Node.js 20+ for build-docs pipeline
RUN curl -fsSL https://deb.nodesource.com/setup_23.x | bash - \
 && apt-get update && apt-get install -y --no-install-recommends nodejs \
 && corepack enable \
 && rm -rf /var/lib/apt/lists/*

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

# Install build-docs dependencies and compile documentation
RUN cd build-docs && npm install \
 && npm run build

# Build documentation artifacts (rendered HTML, search index, metadata)
RUN node build-docs/dist/index.js docs dist/docs 1.x
