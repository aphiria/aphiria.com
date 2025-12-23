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
        name: "worker-pool",
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

// Create Kubernetes provider using the cluster's kubeconfig
// Uses canonical Pulumi pattern - provider validates connection on first resource operation
const k8sProvider = new k8s.Provider("preview-k8s", {
    kubeconfig: cluster.kubeConfigs[0].rawConfig,
    enableServerSideApply: true,
}, {
    dependsOn: [cluster],
});

// 3. Install Helm charts (cert-manager, nginx-gateway-fabric)
const helmCharts = installBaseHelmCharts({
    env: "preview",
    provider: k8sProvider,
});

// 4. Create shared PostgreSQL (1 replica, cloud persistent storage)
// This single instance is shared by all preview environments with separate databases per PR
const postgresqlConfig = new pulumi.Config("postgresql");
const postgres = createPostgreSQL({
    env: "preview",
    namespace: "default",
    replicas: 1,
    persistentStorage: true,
    storageSize: "20Gi",
    dbUser: postgresqlConfig.require("user"),
    dbPassword: postgresqlConfig.requireSecret("password"),
    provider: k8sProvider,
});

// 5. Create imagePullSecret for GitHub Container Registry
// Required for pulling private images from ghcr.io
const ghcrConfig = new pulumi.Config("ghcr");
const ghcrToken = ghcrConfig.requireSecret("token");
const ghcrUsername = ghcrConfig.require("username");

const imagePullSecret = new k8s.core.v1.Secret("ghcr-pull-secret", {
    metadata: {
        name: "ghcr-pull-secret",
        namespace: "default",
    },
    type: "kubernetes.io/dockerconfigjson",
    stringData: {
        ".dockerconfigjson": pulumi.interpolate`{"auths":{"ghcr.io":{"username":"${ghcrUsername}","password":"${ghcrToken}"}}}`,
    },
}, { provider: k8sProvider });

// 6. Create Gateway with Let's Encrypt production TLS
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

// 7. Get LoadBalancer IP from nginx-gateway Service
const gatewayService = k8s.core.v1.Service.get(
    "nginx-gateway-svc",
    pulumi.interpolate`nginx-gateway/nginx-gateway-nginx-gateway-fabric`,
    { provider: k8sProvider }
);

const loadBalancerIp = gatewayService.status.loadBalancer.ingress[0].ip;

// 8. Create DNS wildcard records for preview environments
const previewWebDns = new digitalocean.DnsRecord("preview-web-dns", {
    domain: "aphiria.com",
    type: "A",
    name: "*.pr",
    value: loadBalancerIp,
    ttl: 300,
});

const previewApiDns = new digitalocean.DnsRecord("preview-api-dns", {
    domain: "aphiria.com",
    type: "A",
    name: "*.pr-api",
    value: loadBalancerIp,
    ttl: 300,
});

// Outputs (used by workflows)
export const clusterId = cluster.id;
export const clusterEndpoint = cluster.endpoint;
export const kubeconfig = pulumi.secret(cluster.kubeConfigs[0].rawConfig);
export const postgresqlHost = "db.default.svc.cluster.local";  // Fully qualified service name for cross-namespace access
export const postgresqlPort = 5432;
export const gatewayName = "nginx-gateway";
export const gatewayNamespace = "nginx-gateway";
export const namespace = "default";
