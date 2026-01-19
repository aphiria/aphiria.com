// Runtime configuration for local development
//
// In production/preview environments, this file is replaced by a Kubernetes ConfigMap
// mounted at /usr/share/nginx/html/js/config/config.js in the container.
// This allows the same static build to work across all environments.
//
// See: infrastructure/pulumi/src/components/web-deployment.ts
window.__RUNTIME_CONFIG__ = {
    apiUri: "http://localhost:8080",
    cookieDomain: "localhost"
};
