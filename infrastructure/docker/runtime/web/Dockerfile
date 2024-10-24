FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove the default content
RUN rm -rf /usr/share/nginx/html/*

# Copy of the web source files
ARG TAG=latest
FROM davidbyoung/aphiria.com-build:${TAG} as build
COPY --from=build /app/public-web .
