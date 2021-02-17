FROM php:8-fpm

MAINTAINER David Young

WORKDIR /var/www

# Install dependencies
RUN apt-get update \
    && apt-get install -y git libxml2-dev libpq-dev libzip-dev

# Install PHP extensions
RUN docker-php-ext-install intl opcache pdo_pgsql pgsql zip

# Install Composer
# TODO: Do I actually need Composer?
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Add user and configure permissions
# TODO: Do I really need this stuff?  What's it doing for me?
RUN groupadd -g 1000 www
RUN useradd -u 1000 -ms /bin/bash -g www www
COPY --chown=www:www . /var/www
USER www

# Start the php-fpm server
EXPOSE 9000
CMD ["php-fpm"]
