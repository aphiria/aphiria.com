FROM php:8-fpm

MAINTAINER David Young

WORKDIR /var/www

# Install dependencies
RUN apt-get update \
    && apt-get install -y git libxml2-dev libpq-dev libzip-dev

# Install PHP extensions
RUN docker-php-ext-install intl opcache pdo_pgsql pgsql zip

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Start the php-fpm server
EXPOSE 9000
CMD ["php-fpm"]
