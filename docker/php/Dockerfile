FROM php:8-fpm

ARG APP_ENV

MAINTAINER David Young

WORKDIR /var/www

# Install dependencies
RUN apt-get update \
    && apt-get install -y git libxml2-dev libpq-dev libzip-dev

# Install PHP extensions
RUN docker-php-ext-install intl opcache pdo_pgsql pgsql zip

# If we're running this locally, install Xdebug, too
RUN if [ $APP_ENV = "development" ]; then \
   pecl install xdebug; \
   docker-php-ext-enable xdebug; \
fi;

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copy over PHP source/config files (used for production)
COPY . ./api
COPY ./docker/php/local.ini /usr/local/etc/php/conf.d/local.ini

# Start the php-fpm server
EXPOSE 9000
CMD ["php-fpm"]
