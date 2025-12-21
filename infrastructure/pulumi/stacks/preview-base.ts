/** Base Infrastructure Stack for Preview Environments
 *
 * Deploys persistent infrastructure for preview environments:
 * - Kubernetes cluster (dedicated preview cluster, separate from production)
 * - Helm charts (cert-manager, nginx-gateway-fabric)
 * - Shared PostgreSQL instance (1 replica, persistent storage)
 * - Gateway with Let's Encrypt production TLS
 * - Wildcard certificate for *.pr.aphiria.com
 *
 * This stack creates its own dedicated cluster for complete isolation from production.
 * Stack name: preview-base
 */

import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    createPostgreSQL,
    createGateway,
} from "../components";

const config = new pulumi.Config();

// 1. Create dedicated preview Kubernetes cluster
const cluster = new digitalocean.KubernetesCluster("aphiria-com-preview-cluster", {
    name: "aphiria-com-preview-cluster",
    region: digitalocean.Region.NYC3,
    version: "1.34.1-do.2",
    nodePool: {
        name: "preview-pool",
        size: "s-2vcpu-2gb",
        nodeCount: 1,
        autoScale: true,
        minNodes: 1,
        maxNodes: 3,
    },
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
    maintenancePolicy: {
        day: "any",
        startTime: "6:00",
    },
}, {
    protect: true, // Prevents accidental deletion
});

// 2. Create Kubernetes provider using the preview cluster's kubeconfig
const k8sProvider = new k8s.Provider("preview-k8s", {
    kubeconfig: cluster.kubeConfigs[0].rawConfig,
}, {
    dependsOn: [cluster], // Ensure cluster is created before provider initialization
});

// 3. Install Helm charts (cert-manager, nginx-gateway-fabric)
const helmCharts = installBaseHelmCharts({
    env: "preview",
    provider: k8sProvider,
});

// 4. Create shared PostgreSQL (1 replica, cloud persistent storage)
// This single instance is shared by all preview environments with separate databases per PR
const postgres = createPostgreSQL({
    env: "preview",
    namespace: "default",
    replicas: 1,
    persistentStorage: true,
    storageSize: "20Gi",
    provider: k8sProvider,
});

// 5. Create Gateway with Let's Encrypt production TLS
// Wildcard certificate covers all preview subdomains: {PR}.pr.aphiria.com, {PR}.pr-api.aphiria.com
const gateway = createGateway({
    env: "preview",
    namespace: "nginx-gateway",
    name: "nginx-gateway",
    tlsMode: "letsencrypt-prod",
    domains: [
        "*.pr.aphiria.com",      // Web preview URLs
        "*.pr-api.aphiria.com",  // API preview URLs
    ],
    provider: k8sProvider,
});

// Outputs (used by ephemeral-stack.ts and workflows)
export const clusterId = cluster.id;
export const clusterEndpoint = cluster.endpoint;
export const kubeconfig = pulumi.secret(cluster.kubeConfigs[0].rawConfig);
export const postgresqlHost = "db";  // Service name
export const postgresqlPort = 5432;
export const gatewayName = "nginx-gateway";
export const gatewayNamespace = "nginx-gateway";
export const namespace = "default";
