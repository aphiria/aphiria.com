/**
 * Production Infrastructure Stack (DigitalOcean)
 * This stack creates the Kubernetes cluster itself, unlike preview-base which assumes
 * a pre-existing cluster. The cluster is long-lived infrastructure.
 * Stack name: production
 */

import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    createPostgreSQL,
    createGateway,
    createWebDeployment,
    createAPIDeployment,
    createDBMigrationJob,
    createHTTPRoute,
} from "../components";

const config = new pulumi.Config();

// Imported DigitalOcean Kubernetes cluster (existing cluster, not created by Pulumi)
// This matches the actual cluster configuration from the import
const cluster = new digitalocean.KubernetesCluster("aphiria-com-cluster", {
    amdGpuDeviceMetricsExporterPlugin: {
        enabled: false,
    },
    amdGpuDevicePlugin: {
        enabled: false,
    },
    clusterSubnet: "10.244.0.0/16",
    maintenancePolicy: {
        day: "any",
        startTime: "6:00",
    },
    name: "aphiria-com-cluster",
    nodePool: {
        name: "worker-pool",
        size: "s-2vcpu-2gb",
    },
    region: digitalocean.Region.NYC3,
    routingAgent: {
        enabled: false,
    },
    serviceSubnet: "10.245.0.0/16",
    version: "1.34.1-do.0",
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
}, {
    protect: true, // Prevents accidental deletion
});

// Create Kubernetes provider using the cluster's kubeconfig
const k8sProvider = new k8s.Provider("production-k8s", {
    kubeconfig: cluster.kubeConfigs[0].rawConfig,
});

// Install Helm charts (cert-manager, nginx-gateway-fabric)
const helmCharts = installBaseHelmCharts({
    env: "production",
    provider: k8sProvider,
});

// Create PostgreSQL (2 replicas, cloud persistent storage)
const postgresqlConfig = new pulumi.Config("postgresql");
const postgres = createPostgreSQL({
    env: "production",
    namespace: "default",
    replicas: 2,
    persistentStorage: true,
    storageSize: "20Gi",
    dbUser: postgresqlConfig.require("user"),
    dbPassword: postgresqlConfig.requireSecret("password"),
    provider: k8sProvider,
});

// Create Gateway with Let's Encrypt production TLS
const gateway = createGateway({
    env: "production",
    namespace: "nginx-gateway",
    name: "nginx-gateway",
    tlsMode: "letsencrypt-prod",
    domains: [
        "aphiria.com",
        "*.aphiria.com",
    ],
    provider: k8sProvider,
});

// Create web deployment
const webImage = config.require("webImage");
const web = createWebDeployment({
    env: "production",
    namespace: "default",
    replicas: 2,
    image: webImage,
    jsConfigData: {
        apiUri: "https://api.aphiria.com",
        cookieDomain: ".aphiria.com",
    },
    baseUrl: "https://www.aphiria.com",
    provider: k8sProvider,
});

// Create API deployment
const apiImage = config.require("apiImage");
const dbPassword = config.requireSecret("dbPassword");

const api = createAPIDeployment({
    env: "production",
    namespace: "default",
    replicas: 2,
    image: apiImage,
    dbHost: "db",
    dbName: "aphiria",
    dbUser: "aphiria",
    dbPassword: dbPassword,
    apiUrl: "https://api.aphiria.com",
    webUrl: "https://www.aphiria.com",
    provider: k8sProvider,
});

// Run database migrations and seeder
const migration = createDBMigrationJob({
    namespace: "default",
    image: apiImage,
    dbHost: "db",
    dbName: "aphiria",
    dbUser: "aphiria",
    dbPassword: dbPassword,
    runSeeder: true,
    provider: k8sProvider,
});

// Create HTTP routes
const webRoute = createHTTPRoute({
    namespace: "default",
    name: "web",
    hostname: "www.aphiria.com",
    serviceName: "web",
    servicePort: 80,
    gatewayName: "nginx-gateway",
    gatewayNamespace: "nginx-gateway",
    enableRateLimiting: true,
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
    enableRateLimiting: true,
    provider: k8sProvider,
});

// Outputs
export const clusterId = cluster.id;
export const clusterEndpoint = cluster.endpoint;
export const kubeconfig = pulumi.secret(cluster.kubeConfigs[0].rawConfig);
export const webUrl = "https://www.aphiria.com";
export const apiUrl = "https://api.aphiria.com";
export const gatewayName = "nginx-gateway";
export const gatewayNamespace = "nginx-gateway";
