FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY --from=aphiria.com-build /var/www/public-web .
