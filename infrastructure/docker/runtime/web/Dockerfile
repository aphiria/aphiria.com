# Stage 1: Use the build image to copy necessary files
ARG BUILD_IMAGE=davidbyoung/aphiria.com-build:latest
FROM ${BUILD_IMAGE} AS build

# Stage 2: Nginx image for serving content
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove the default content from the Nginx default web root
RUN rm -rf /usr/share/nginx/html/*

# Copy the web source files from the build image
COPY --from=build /app/apps/web/public .

# Copy compiled documentation artifacts (rendered HTML, metadata)
COPY --from=build /app/dist/docs .
