# Stage 1: Use the build image to copy necessary files
ARG BUILD_IMAGE=davidbyoung/aphiria.com-build
ARG IMAGE_SHA=latest
FROM ${BUILD_IMAGE}:${IMAGE_SHA} AS build

# Stage 2: Base PHP image for the final container
FROM php:8.4.3-fpm AS base

WORKDIR /app/api

# Install dependencies and extensions
RUN apt-get update && apt-get install -y git libxml2-dev libpq-dev libzip-dev
RUN docker-php-ext-install dom intl opcache pdo_pgsql pgsql zip

# Stage 3: Copy the files from the build stage
FROM base

# Copy the API source files from the build image (from the first stage)
COPY --from=build /app/infrastructure/database ./infrastructure/database
COPY --from=build /app/public-api ./public
# We need the web files to be able to index their contents
COPY --from=build /app/public-web ./public-web
COPY --from=build /app/src ./src
COPY --from=build /app/tests ./tests
COPY --from=build /app/tmp ./tmp
COPY --from=build /app/vendor ./vendor
COPY --from=build /app/.env ./.env
COPY --from=build /app/aphiria ./aphiria
COPY --from=build /app/composer.json ./composer.json
COPY --from=build /app/config.php ./config.php
COPY --from=build /app/phinx.php ./phinx.php
COPY --from=build /app/phpunit.xml.dist ./phpunit.xml.dist

# Allow nginx to write to tmp
RUN chown -R www-data:www-data .

EXPOSE 9000
