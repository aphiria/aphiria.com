# Stage 1: Build image
ARG IMAGE_SHA=latest
FROM davidbyoung/aphiria.com-build:${IMAGE_SHA} AS build

# Stage 2: Nginx image for serving content
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove the default content from the Nginx default web root
RUN rm -rf /usr/share/nginx/html/*

# Copy the web source files from the build image
COPY --from=build /app/public-web .
