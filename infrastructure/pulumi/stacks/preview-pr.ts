import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    createNamespace,
    createDatabaseCreationJob,
    createWebDeployment,
    createAPIDeployment,
    createHTTPRoute,
} from "../components";

/**
 * Preview PR Stack
 *
 * Deploys per-PR preview environment resources:
 * - Kubernetes namespace with ResourceQuota and NetworkPolicy
 * - Per-PR PostgreSQL database
 * - Web and API deployments
 * - HTTPRoute configuration
 * - ConfigMaps and Secrets
 *
 * Stack name pattern: preview-pr-{PR_NUMBER}
 * Preview URLs: {PR}.pr.aphiria.com (web), {PR}.pr-api.aphiria.com (api)
 */

const config = new pulumi.Config();
const prNumber = config.requireNumber("prNumber");
const webImageDigest = config.require("webImageDigest");
const apiImageDigest = config.require("apiImageDigest");
const baseStackRef = config.get("baseStackReference") || "davidbyoung/aphiria-com-infrastructure/preview-base";

// Reference base stack outputs
const baseStack = new pulumi.StackReference(baseStackRef);
const postgresqlHost = baseStack.getOutput("postgresqlHost");
const postgresqlAdminUser = baseStack.getOutput("postgresqlAdminUser");
const postgresqlAdminPassword = baseStack.requireOutput("postgresqlAdminPassword");
const gatewayName = baseStack.getOutput("gatewayName");
const gatewayNamespace = baseStack.getOutput("gatewayNamespace");
const tlsSecretName = baseStack.getOutput("tlsSecretName");
const kubeconfig = baseStack.requireOutput("kubeconfig");

// Create Kubernetes provider using kubeconfig from base stack
const k8sProvider = new k8s.Provider("preview-pr-k8s", {
    kubeconfig: kubeconfig,
    enableServerSideApply: true,
});

// Naming conventions
const namespaceName = `preview-pr-${prNumber}`;
const databaseName = `aphiria_pr_${prNumber}`;
const webUrl = `https://${prNumber}.pr.aphiria.com`;
const apiUrl = `https://${prNumber}.pr-api.aphiria.com`;

// Common labels
const commonLabels = {
    "app.kubernetes.io/managed-by": "pulumi",
    "app.kubernetes.io/part-of": "ephemeral-preview",
    "preview.aphiria.com/pr-number": prNumber.toString(),
};

// ============================================================================
// Get GHCR credentials from Pulumi ESC for ImagePullSecret
// ============================================================================

const ghcrUsername = config.require("ghcr-username");
const ghcrToken = config.requireSecret("ghcr-token");

// ============================================================================
// Namespace with ResourceQuota, NetworkPolicy, and ImagePullSecret
// ============================================================================

const { namespace, imagePullSecret } = createNamespace({
    name: namespaceName,
    env: "preview",
    resourceQuota: {
        cpu: "4",
        memory: "8Gi",
        pods: "5",
    },
    networkPolicy: {
        allowDNS: true,
        allowHTTPS: true,
        allowPostgreSQL: {
            host: "db.preview-base",
            port: 5432,
        },
    },
    imagePullSecret: {
        registry: "ghcr.io",
        username: ghcrUsername,
        token: ghcrToken,
    },
    labels: commonLabels,
    provider: k8sProvider,
});

// ============================================================================
// Per-PR Database (via Kubernetes Job)
// ============================================================================

const dbInitJob = createDatabaseCreationJob({
    env: "preview",
    namespace: namespace.metadata.name,
    databaseName,
    dbHost: postgresqlHost,
    dbAdminUser: postgresqlAdminUser,
    dbAdminPassword: postgresqlAdminPassword,
    labels: commonLabels,
    provider: k8sProvider,
});

// ============================================================================
// Web Deployment (using component)
// ============================================================================

const webDeployment = createWebDeployment({
    env: "preview",
    namespace: namespace.metadata.name,
    replicas: 1,
    image: `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`,
    jsConfigData: {
        apiUri: apiUrl,
        cookieDomain: ".pr.aphiria.com",
    },
    baseUrl: webUrl,
    envConfig: {
        appEnv: "preview",
        logLevel: "debug",
        prNumber: prNumber.toString(),
    },
    imagePullSecrets: imagePullSecret ? [imagePullSecret.metadata.name] : undefined,
    resources: {
        requests: {
            cpu: "100m",
            memory: "256Mi",
        },
        limits: {
            cpu: "500m",
            memory: "1Gi",
        },
    },
    labels: commonLabels,
    provider: k8sProvider,
});

// ============================================================================
// API Deployment (using component)
// ============================================================================

const apiDeployment = createAPIDeployment({
    env: "preview",
    namespace: namespace.metadata.name,
    replicas: 1,
    image: `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`,
    dbHost: postgresqlHost,
    dbName: databaseName,
    dbUser: postgresqlAdminUser,
    dbPassword: postgresqlAdminPassword,
    apiUrl: apiUrl,
    webUrl: webUrl,
    envConfig: {
        appEnv: "preview",
        logLevel: "debug",
        cookieDomain: ".pr.aphiria.com",
        prNumber: prNumber.toString(),
    },
    imagePullSecrets: imagePullSecret ? [imagePullSecret.metadata.name] : undefined,
    resources: {
        nginx: {
            requests: {
                cpu: "100m",
                memory: "128Mi",
            },
            limits: {
                cpu: "200m",
                memory: "256Mi",
            },
        },
        php: {
            requests: {
                cpu: "500m",
                memory: "1280Mi",
            },
            limits: {
                cpu: "1",
                memory: "2560Mi",
            },
        },
        initContainer: {
            requests: {
                cpu: "100m",
                memory: "128Mi",
            },
            limits: {
                cpu: "200m",
                memory: "256Mi",
            },
        },
    },
    labels: commonLabels,
    provider: k8sProvider,
});

// ============================================================================
// HTTPRoute Configuration (using component)
// ============================================================================

const webRoute = createHTTPRoute({
    name: `preview-pr-${prNumber}-web`,
    namespace: gatewayNamespace,
    gatewayName: gatewayName,
    gatewayNamespace: gatewayNamespace,
    hostname: `${prNumber}.pr.aphiria.com`,
    serviceName: "web",
    servicePort: 80,
    labels: commonLabels,
    provider: k8sProvider,
});

const apiRoute = createHTTPRoute({
    name: `preview-pr-${prNumber}-api`,
    namespace: gatewayNamespace,
    gatewayName: gatewayName,
    gatewayNamespace: gatewayNamespace,
    hostname: `${prNumber}.pr-api.aphiria.com`,
    serviceName: "api",
    servicePort: 80,
    labels: commonLabels,
    provider: k8sProvider,
});

// ============================================================================
// Outputs
// ============================================================================

export { webUrl, apiUrl, databaseName, namespaceName };
export const namespaceResourceName = namespace.metadata.name;
export const webImageRef = `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`;
export const apiImageRef = `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`;
