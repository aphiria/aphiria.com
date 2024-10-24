FROM php:8.4.0RC2-fpm

WORKDIR /app/api

# Install dependencies and extensions
RUN apt-get update && apt-get install -y git libxml2-dev libpq-dev libzip-dev
RUN docker-php-ext-install dom intl opcache pdo_pgsql pgsql zip

# Copy the API source files
ARG TAG=latest
FROM build as build
COPY --from=build ./app/public-api ./public
COPY --from=build ./app/src ./src
COPY --from=build ./app/tests ./tests
COPY --from=build ./app/tmp ./tmp
COPY --from=build ./app/vendor ./vendor
COPY --from=build ./app/.env ./.env
COPY --from=build ./app/aphiria ./aphiria
COPY --from=build ./app/composer.json ./composer.json
COPY --from=build ./app/config.php ./config.php
COPY --from=build ./app/phpunit.xml.dist ./phpunit.xml.dist

# Allow nginx to write to tmp
RUN chown -R www-data:www-data .

EXPOSE 9000
