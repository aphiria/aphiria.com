# Global ARGs (available to all FROM statements)
ARG BUILD_IMAGE=aphiria.com-build:latest
ARG BASE_IMAGE=aphiria.com-base:latest

# Stage 1: build
FROM ${BUILD_IMAGE} AS build

# Stage 2: base PHP with compiled extensions (use the same base image as build)
FROM ${BASE_IMAGE} AS base
WORKDIR /app/apps/api

# Stage 3: Copy over files
FROM base

# Copy the API application from the build image (preserving monorepo structure)
COPY --from=build /app/apps/api/database         ./database
COPY --from=build /app/apps/api/public           ./public
COPY --from=build /app/apps/api/src              ./src
COPY --from=build /app/apps/api/tests            ./tests
COPY --from=build /app/apps/api/tmp              ./tmp
COPY --from=build /app/apps/api/vendor           ./vendor
COPY --from=build /app/apps/api/.env             ./.env
COPY --from=build /app/apps/api/aphiria          ./aphiria
COPY --from=build /app/apps/api/composer.json    ./composer.json
COPY --from=build /app/apps/api/config.php       ./config.php
COPY --from=build /app/apps/api/phinx.php        ./phinx.php
COPY --from=build /app/apps/api/phpunit.xml.dist ./phpunit.xml.dist

# Copy search index (NDJSON) for PHP LexemeSeeder to consume
COPY --from=build /app/dist/docs/search/lexemes.ndjson /app/dist/docs/search/lexemes.ndjson

# Allow nginx/php-fpm user to write to tmp
RUN chown -R www-data:www-data .

EXPOSE 9000
