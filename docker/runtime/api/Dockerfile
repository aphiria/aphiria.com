#FROM aphiria.com-build
FROM php:8.2-fpm

WORKDIR /app/api

# Copy the API source files
COPY --from=aphiria.com-build ./app/public-api ./public
COPY --from=aphiria.com-build ./app/src ./src
COPY --from=aphiria.com-build ./app/tests ./tests
COPY --from=aphiria.com-build ./app/tmp ./tmp
COPY --from=aphiria.com-build ./app/vendor ./vendor
COPY --from=aphiria.com-build ./app/.env ./.env
COPY --from=aphiria.com-build ./app/aphiria ./aphiria
COPY --from=aphiria.com-build ./app/composer.json ./composer.json
COPY --from=aphiria.com-build ./app/config.php ./config.php
COPY --from=aphiria.com-build ./app/phpunit.xml.dist ./phpunit.xml.dist

EXPOSE 9000
