FROM aphiria.com-build

WORKDIR /var/www

COPY ./public-api ./html
COPY ./src ./src
COPY ./tests ./tests
COPY ./tmp ./tmp
COPY ./vendor ./vendor
COPY ./.env ./.env
COPY ./aphiria ./aphiria
COPY ./composer.json ./composer.json
COPY ./phpunit.xml.dist ./phpunit.xml.dist
