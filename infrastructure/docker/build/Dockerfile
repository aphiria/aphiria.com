FROM php:8.4-fpm

WORKDIR /app

# Core build + runtime deps for PHP 8.4 extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    $PHPIZE_DEPS \
    git cmake unzip \
    libxml2-dev libpq-dev libzip-dev zlib1g-dev libicu-dev \
    curl ca-certificates gnupg \
 && rm -rf /var/lib/apt/lists/*

# Node.js + Yarn
RUN curl -fsSL https://deb.nodesource.com/setup_23.x | bash - \
 && apt-get update && apt-get install -y --no-install-recommends nodejs \
 && corepack enable \
 && rm -rf /var/lib/apt/lists/*

# Help DOM's vendored Lexbor find headers
ENV CPPFLAGS="-I/usr/src/php"

# Build bundled PHP extensions (no external Lexbor)
RUN docker-php-ext-install -j"$(nproc)" \
    dom intl opcache zip pdo pdo_pgsql pgsql

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --ignore-platform-reqs --prefer-dist --no-progress

# Copy the rest of the source
COPY . .
COPY ./.env.dist ./.env

# JS deps + gulp
RUN yarn install --frozen-lockfile || yarn install \
 && yarn global add gulp

# Use docs SHA to bust cache and force rebuilds when docs change
ARG DOCS_SHA=latest
ENV DOCS_SHA=${DOCS_SHA}
RUN gulp build

# Server-side code highlighting
RUN npm install prismjs jsdom \
 && chmod +x ./resources/js/server-side/highlight-code.js \
 && find ./public-web -type f -name "*.html" -exec node ./resources/js/server-side/highlight-code.js {} \;
