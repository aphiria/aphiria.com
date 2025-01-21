FROM php:8.4.3-fpm

WORKDIR /app

# Install dependencies and extensions
RUN apt-get update && apt-get install -y git libxml2-dev libpq-dev libzip-dev nodejs npm
RUN docker-php-ext-install dom intl opcache pdo_pgsql pgsql zip
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN npm install --global yarn

# Copy over source files
COPY . .
COPY ./.env.dist ./.env

# Install dependencies and build the app
RUN composer install --no-interaction --ignore-platform-reqs && composer dump-autoload -o
RUN yarn install && yarn global add gulp

# Use the docs' git SHA to bust the cache and force gulp build to run when it has changed
ARG DOCS_SHA=latest
RUN gulp build
