FROM nginx:alpine

WORKDIR /var/www

# Copy over files (used for production)
COPY ./public-web ./web/public-web
COPY ./ /var/www/api
COPY ./docker/nginx/templates /etc/nginx/templates
