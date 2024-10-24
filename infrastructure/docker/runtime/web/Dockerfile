FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove the default content
RUN rm -rf /usr/share/nginx/html/*

# Copy of the web source files
ARG TAG=latest
FROM build as build
COPY --from=build /app/public-web .
