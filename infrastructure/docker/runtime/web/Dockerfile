# Stage 1: Use the build image to copy necessary files
ARG BUILD_IMAGE=davidbyoung/aphiria.com-build
ARG IMAGE_SHA=latest
FROM ${BUILD_IMAGE}:${IMAGE_SHA} AS build

# Stage 2: Nginx image for serving content
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove the default content from the Nginx default web root
RUN rm -rf /usr/share/nginx/html/*

# Copy the web source files from the build image
COPY --from=build /app/public-web .
