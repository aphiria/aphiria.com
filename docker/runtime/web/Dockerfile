FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY --from=aphiria.com-build /app/public-web .
