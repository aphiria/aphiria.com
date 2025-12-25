/**
 * Production Infrastructure Stack (DigitalOcean)
 * This stack creates the Kubernetes cluster itself, unlike preview-base which assumes
 * a pre-existing cluster. The cluster is long-lived infrastructure.
 * Stack name: production
 */

import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import { createStack } from "../shared/factory";

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

// Get configuration
const postgresqlConfig = new pulumi.Config("postgresql");

// Naming conventions
const webUrl = "https://www.aphiria.com";
const apiUrl = "https://api.aphiria.com";

// Create all infrastructure using a factory
createStack({
    env: "production",
    database: {
        replicas: 2,
        persistentStorage: true,
        storageSize: "20Gi",
        dbUser: postgresqlConfig.require("user"),
        dbPassword: postgresqlConfig.requireSecret("password"),
    },
    gateway: {
        tlsMode: "letsencrypt-prod",
        domains: ["aphiria.com", "*.aphiria.com"],
    },
    app: {
        webReplicas: 2,
        apiReplicas: 2,
        webUrl: "https://www.aphiria.com",
        apiUrl: "https://api.aphiria.com",
        webImage: config.require("webImage"),
        apiImage: config.require("apiImage"),
        cookieDomain: ".aphiria.com",
        webPodDisruptionBudget: { minAvailable: 1 },
        apiPodDisruptionBudget: { minAvailable: 1 },
    },
}, k8sProvider);

// Outputs
export { webUrl, apiUrl };
export const clusterId = cluster.id;
export const clusterEndpoint = cluster.endpoint;
export const kubeconfig = pulumi.secret(cluster.kubeConfigs[0].rawConfig);
export const gatewayName = "nginx-gateway";
export const gatewayNamespace = "nginx-gateway";
