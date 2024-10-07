#FROM aphiria.com-build
FROM php:8.4.0RC1-fpm

WORKDIR /app/api

# Install dependencies and extensions
RUN apt-get update && apt-get install -y git libxml2-dev libpq-dev libzip-dev
RUN docker-php-ext-install dom intl opcache pdo_pgsql pgsql zip

# Copy the API source files
COPY --from=davidbyoung/aphiria.com-build ./app/public-api ./public
COPY --from=davidbyoung/aphiria.com-build ./app/src ./src
COPY --from=davidbyoung/aphiria.com-build ./app/tests ./tests
COPY --from=davidbyoung/aphiria.com-build ./app/tmp ./tmp
COPY --from=davidbyoung/aphiria.com-build ./app/vendor ./vendor
COPY --from=davidbyoung/aphiria.com-build ./app/.env ./.env
COPY --from=davidbyoung/aphiria.com-build ./app/aphiria ./aphiria
COPY --from=davidbyoung/aphiria.com-build ./app/composer.json ./composer.json
COPY --from=davidbyoung/aphiria.com-build ./app/config.php ./config.php
COPY --from=davidbyoung/aphiria.com-build ./app/phpunit.xml.dist ./phpunit.xml.dist

# Allow nginx to write to tmp
RUN chown -R www-data:www-data .

EXPOSE 9000
