# Stage 1: build
ARG BUILD_IMAGE=davidbyoung/aphiria.com-build:latest
FROM ${BUILD_IMAGE} AS build

# Stage 2: base PHP with compiled extensions
FROM php:8.4-fpm AS base
WORKDIR /app/api

# Build deps for PHP 8.4 extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    $PHPIZE_DEPS \
    git cmake unzip \
    libxml2-dev libpq-dev libzip-dev zlib1g-dev libicu-dev \
 && rm -rf /var/lib/apt/lists/*

# Make sure PHP source root is in the compiler include path (helps DOM+Lexbor on some setups)
ENV CPPFLAGS="-I/usr/src/php"

# Build bundled extensions
RUN docker-php-ext-install -j"$(nproc)" \
    dom intl opcache zip pdo pdo_pgsql pgsql

# Install APCu for Prometheus metrics storage
RUN pecl install apcu && docker-php-ext-enable apcu

# Configure APCu with sufficient shared memory for metrics (64MB)
RUN echo "apc.shm_size=64M" >> /usr/local/etc/php/conf.d/docker-php-ext-apcu.ini \
 && echo "apc.enable_cli=1" >> /usr/local/etc/php/conf.d/docker-php-ext-apcu.ini

# Stage 3: Copy over files
FROM base

# Copy the API application from the build image
COPY --from=build /app/infrastructure/database ./infrastructure/database
COPY --from=build /app/public-api          ./public
# We need the web files to be able to index their contents
COPY --from=build /app/public-web          ./public-web
COPY --from=build /app/src                 ./src
COPY --from=build /app/tests               ./tests
COPY --from=build /app/tmp                 ./tmp
COPY --from=build /app/vendor              ./vendor
COPY --from=build /app/.env                ./.env
COPY --from=build /app/aphiria             ./aphiria
COPY --from=build /app/composer.json       ./composer.json
COPY --from=build /app/config.php          ./config.php
COPY --from=build /app/phinx.php           ./phinx.php
COPY --from=build /app/phpunit.xml.dist    ./phpunit.xml.dist

# Allow nginx/php-fpm user to write to tmp
RUN chown -R www-data:www-data .

EXPOSE 9000
