FROM php:8.4-fpm

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

WORKDIR /app
