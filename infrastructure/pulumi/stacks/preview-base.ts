/** Base Infrastructure Stack for Preview Environments
 *
 * Deploys persistent infrastructure shared across all ephemeral preview environments:
 * - Helm charts (cert-manager, nginx-gateway-fabric)
 * - Shared PostgreSQL instance (1 replica, persistent storage)
 * - Gateway with Let's Encrypt production TLS
 * - Wildcard certificate for *.pr.aphiria.com
 *
 * This stack is deployed once to the production DigitalOcean Kubernetes cluster.
 * Stack name: preview-base
 */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    createPostgreSQL,
    createGateway,
} from "../components";

const config = new pulumi.Config();

// Kubernetes provider for DigitalOcean
const k8sProvider = new k8s.Provider("do-k8s", {
    // Uses default kubeconfig context (set via KUBECONFIG or ~/.kube/config)
});

// 1. Install Helm charts (cert-manager, nginx-gateway-fabric)
const helmCharts = installBaseHelmCharts({
    env: "preview",
    provider: k8sProvider,
});

// 2. Create shared PostgreSQL (1 replica, cloud persistent storage)
// This single instance is shared by all preview environments with separate databases per PR
const postgres = createPostgreSQL({
    env: "preview",
    namespace: "default",
    replicas: 1,
    persistentStorage: true,
    storageSize: "20Gi",
    provider: k8sProvider,
});

// 3. Create Gateway with Let's Encrypt production TLS
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

// Outputs (used by ephemeral-stack.ts)
export const postgresqlHost = "db";  // Service name
export const postgresqlPort = 5432;
export const gatewayName = "nginx-gateway";
export const gatewayNamespace = "nginx-gateway";
export const namespace = "default";
