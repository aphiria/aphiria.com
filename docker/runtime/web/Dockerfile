FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove the default content
RUN rm -rf /usr/share/nginx/html/*

# Copy of the web source files
COPY --from=aphiria.com-build /app/public-web .
