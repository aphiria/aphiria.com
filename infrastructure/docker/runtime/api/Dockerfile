FROM php:8.4.0RC2-fpm

WORKDIR /app/api

# Install dependencies and extensions
RUN apt-get update && apt-get install -y git libxml2-dev libpq-dev libzip-dev
RUN docker-php-ext-install dom intl opcache pdo_pgsql pgsql zip

# Copy the API source files
ARG TAG=latest
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/public-api ./public
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/src ./src
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/tests ./tests
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/tmp ./tmp
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/vendor ./vendor
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/.env ./.env
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/aphiria ./aphiria
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/composer.json ./composer.json
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/config.php ./config.php
COPY --from=davidbyoung/aphiria.com-build:${TAG} ./app/phpunit.xml.dist ./phpunit.xml.dist

# Allow nginx to write to tmp
RUN chown -R www-data:www-data .

EXPOSE 9000
