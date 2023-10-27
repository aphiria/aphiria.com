FROM php:8.2-fpm

MAINTAINER David Young

WORKDIR /var/www

# Install dependencies and extensions
RUN apt-get update && apt-get install -y git libxml2-dev libpq-dev libzip-dev nodejs npm
RUN docker-php-ext-install dom intl opcache pdo_pgsql pgsql zip
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN npm install --global yarn

# Copy over source files
# TODO: Should I copy these to /var/www/html?  How will I separate the API from web?
COPY . .

# Install dependencies and build the app
RUN composer install --no-interaction && composer dump-autoload -o
RUN yarn install && yarn global add gulp && gulp build
