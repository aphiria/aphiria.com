/** dev-local stack: Minikube local development environment */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    createPostgreSQL,
    createGateway,
    createWebDeployment,
    createAPIDeployment,
    createDBMigrationJob,
    createHTTPRoute,
    createHTTPSRedirectRoute,
    createWWWRedirectRoute,
} from "../components";

// Minikube provider (default kubeconfig)
const k8sProvider = new k8s.Provider("minikube", {
    context: "minikube",
});

// 1. Install Helm charts (cert-manager, nginx-gateway)
const helmCharts = installBaseHelmCharts({
    env: "dev-local",
    provider: k8sProvider,
});

// 2. Create PostgreSQL (1 replica, hostPath storage for Minikube)
const postgres = createPostgreSQL({
    env: "dev-local",
    namespace: "default",
    replicas: 1,
    persistentStorage: true,
    storageSize: "5Gi",
    provider: k8sProvider,
});

// 3. Create Gateway with self-signed TLS for Minikube
const gateway = createGateway({
    env: "dev-local",
    namespace: "nginx-gateway",
    name: "nginx-gateway",
    tlsMode: "self-signed",
    domains: ["aphiria.com", "*.aphiria.com"],
    provider: k8sProvider,
});

// 4. Create web deployment (1 replica)
const web = createWebDeployment({
    env: "dev-local",
    namespace: "default",
    replicas: 1,
    image: "davidbyoung/aphiria.com-web:latest",
    jsConfigData: {
        apiUri: "https://api.aphiria.com",
        cookieDomain: ".aphiria.com",
    },
    baseUrl: "https://www.aphiria.com",
    provider: k8sProvider,
});

// 5. Create API deployment (1 replica)
const api = createAPIDeployment({
    env: "dev-local",
    namespace: "default",
    replicas: 1,
    image: "davidbyoung/aphiria.com-api:latest",
    dbHost: "db",
    dbName: "postgres",
    dbUser: "aphiria",
    dbPassword: pulumi.secret("password"),
    apiUrl: "https://api.aphiria.com",
    webUrl: "https://www.aphiria.com",
    provider: k8sProvider,
});

// 6. Run database migrations
const migration = createDBMigrationJob({
    env: "dev-local",
    namespace: "default",
    image: "davidbyoung/aphiria.com-api:latest",
    dbHost: "db",
    dbName: "postgres",
    dbUser: "aphiria",
    dbPassword: pulumi.secret("password"),
    runSeeder: true,
    provider: k8sProvider,
});

// 7. Create HTTP routes
const webRoute = createHTTPRoute({
    namespace: "default",
    name: "web",
    hostname: "www.aphiria.com",
    serviceName: "web",
    servicePort: 80,
    gatewayName: "nginx-gateway",
    gatewayNamespace: "nginx-gateway",
    provider: k8sProvider,
});

const apiRoute = createHTTPRoute({
    namespace: "default",
    name: "api",
    hostname: "api.aphiria.com",
    serviceName: "api",
    servicePort: 80,
    gatewayName: "nginx-gateway",
    gatewayNamespace: "nginx-gateway",
    provider: k8sProvider,
});

const httpsRedirect = createHTTPSRedirectRoute({
    namespace: "nginx-gateway",
    gatewayName: "nginx-gateway",
    gatewayNamespace: "nginx-gateway",
});

const wwwRedirect = createWWWRedirectRoute({
    namespace: "nginx-gateway",
    gatewayName: "nginx-gateway",
    gatewayNamespace: "nginx-gateway",
    rootDomain: "aphiria.com",
    wwwDomain: "www.aphiria.com",
});

// Exports
export const webUrl = "https://www.aphiria.com";
export const apiUrl = "https://api.aphiria.com";
export const dbHost = "db";
