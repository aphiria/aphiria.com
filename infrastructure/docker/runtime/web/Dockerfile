# Stage 1: Use the build image to copy necessary files
ARG BUILD_IMAGE=davidbyoung/aphiria.com-build:latest
FROM ${BUILD_IMAGE} AS build

# Stage 2: Nginx image for serving content
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove the default content from the Nginx default web root
RUN rm -rf /usr/share/nginx/html/*

# Copy the Next.js static export from the build image (includes embedded documentation)
COPY --from=build /app/apps/web/out .
