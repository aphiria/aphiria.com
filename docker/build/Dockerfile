FROM php:8.2-fpm

MAINTAINER David Young

WORKDIR /app

# Install dependencies and extensions
RUN apt-get update && apt-get install -y git libxml2-dev libpq-dev libzip-dev nodejs npm
RUN docker-php-ext-install dom intl opcache pdo_pgsql pgsql zip
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN npm install --global yarn

# Copy over PHP and JS package files as a means to improve Docker caching
COPY ./package-lock.json ./package-lock.json
COPY ./composer.lock ./composer.lock

# Install dependencies and build the app
RUN composer install --no-interaction && composer dump-autoload -o
RUN yarn install && yarn global add gulp

# Copy over source files
COPY . .
COPY ./.env.dist ./.env

# Build our app
RUN gulp build

