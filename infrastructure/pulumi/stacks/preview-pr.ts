import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

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
const gatewayName = baseStack.getOutput("gatewayName");
const tlsSecretName = baseStack.getOutput("tlsSecretName");

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
// Kubernetes Namespace
// ============================================================================

const namespace = new k8s.core.v1.Namespace("preview-namespace", {
    metadata: {
        name: namespaceName,
        labels: commonLabels,
    },
});

// ============================================================================
// ResourceQuota
// ============================================================================

const resourceQuota = new k8s.core.v1.ResourceQuota("preview-quota", {
    metadata: {
        name: "preview-quota",
        namespace: namespace.metadata.name,
    },
    spec: {
        hard: {
            "requests.cpu": "2",
            "requests.memory": "4Gi",
            "limits.cpu": "2",
            "limits.memory": "4Gi",
            "pods": "5",
        },
    },
});

// ============================================================================
// NetworkPolicy
// ============================================================================

const networkPolicy = new k8s.networking.v1.NetworkPolicy("preview-netpol", {
    metadata: {
        name: "preview-isolation",
        namespace: namespace.metadata.name,
    },
    spec: {
        podSelector: {},
        policyTypes: ["Ingress", "Egress"],
        ingress: [
            {
                // Allow ingress from Gateway
                from: [
                    {
                        namespaceSelector: {
                            matchLabels: {
                                "kubernetes.io/metadata.name": "default",
                            },
                        },
                    },
                ],
            },
        ],
        egress: [
            {
                // Allow egress to PostgreSQL
                to: [
                    {
                        namespaceSelector: {
                            matchLabels: {
                                "kubernetes.io/metadata.name": "default",
                            },
                        },
                    },
                ],
                ports: [
                    {
                        protocol: "TCP",
                        port: 5432,
                    },
                ],
            },
            {
                // Allow DNS
                to: [
                    {
                        namespaceSelector: {
                            matchLabels: {
                                "kubernetes.io/metadata.name": "kube-system",
                            },
                        },
                    },
                ],
                ports: [
                    {
                        protocol: "UDP",
                        port: 53,
                    },
                ],
            },
            {
                // Allow outbound HTTPS for external APIs if needed
                ports: [
                    {
                        protocol: "TCP",
                        port: 443,
                    },
                ],
            },
        ],
    },
});

// ============================================================================
// Per-PR Database (via Kubernetes Job)
// ============================================================================

const postgresqlConfig = new pulumi.Config("postgresql");
const postgresqlAdminUser = postgresqlConfig.get("user") || "postgres";
const postgresqlAdminPassword = postgresqlConfig.requireSecret("password");

// Database initialization Job - runs inside the cluster
const dbInitJob = new k8s.batch.v1.Job("db-init-job", {
    metadata: {
        name: `db-init-pr-${prNumber}`,
        namespace: namespace.metadata.name,
        labels: commonLabels,
    },
    spec: {
        template: {
            spec: {
                restartPolicy: "Never",
                containers: [{
                    name: "db-init",
                    image: "postgres:16-alpine",
                    command: ["/bin/sh", "-c"],
                    args: [pulumi.interpolate`
                        psql "postgresql://${postgresqlAdminUser}:${postgresqlAdminPassword}@${postgresqlHost}:5432/postgres" -c "CREATE DATABASE ${databaseName} ENCODING 'UTF8' LC_COLLATE 'en_US.utf8' LC_CTYPE 'en_US.utf8';" || echo "Database already exists"
                    `],
                    resources: {
                        requests: {
                            cpu: "100m",
                            memory: "128Mi",
                        },
                        limits: {
                            cpu: "200m",
                            memory: "256Mi",
                        },
                    },
                }],
            },
        },
        backoffLimit: 3,
    },
});

// ============================================================================
// ConfigMap and Secrets
// ============================================================================

const configMap = new k8s.core.v1.ConfigMap("preview-config", {
    metadata: {
        name: "preview-config",
        namespace: namespace.metadata.name,
        labels: commonLabels,
    },
    data: {
        DB_HOST: postgresqlHost,
        DB_PORT: "5432",
        DB_NAME: databaseName,
        DB_USER: postgresqlAdminUser,
        APP_ENV: "preview",
        PR_NUMBER: prNumber.toString(),
        WEB_URL: webUrl,
        API_URL: apiUrl,
    },
});

const secret = new k8s.core.v1.Secret("preview-secret", {
    metadata: {
        name: "preview-secret",
        namespace: namespace.metadata.name,
        labels: commonLabels,
    },
    type: "Opaque",
    stringData: {
        DB_PASSWORD: postgresqlAdminPassword,
    },
});

// ============================================================================
// Web Deployment
// ============================================================================

const webLabels = { ...commonLabels, "app.kubernetes.io/component": "web" };

const webDeployment = new k8s.apps.v1.Deployment("web", {
    metadata: {
        name: "web",
        namespace: namespace.metadata.name,
        labels: webLabels,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: webLabels,
        },
        template: {
            metadata: {
                labels: webLabels,
            },
            spec: {
                containers: [
                    {
                        name: "web",
                        image: `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`,
                        ports: [
                            {
                                containerPort: 80,
                                name: "http",
                            },
                        ],
                        envFrom: [
                            {
                                configMapRef: {
                                    name: configMap.metadata.name,
                                },
                            },
                            {
                                secretRef: {
                                    name: secret.metadata.name,
                                },
                            },
                        ],
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
                        livenessProbe: {
                            httpGet: {
                                path: "/",
                                port: 80,
                            },
                            initialDelaySeconds: 10,
                            periodSeconds: 10,
                        },
                        readinessProbe: {
                            httpGet: {
                                path: "/",
                                port: 80,
                            },
                            initialDelaySeconds: 5,
                            periodSeconds: 5,
                        },
                    },
                ],
            },
        },
    },
});

const webService = new k8s.core.v1.Service("web-service", {
    metadata: {
        name: "web",
        namespace: namespace.metadata.name,
        labels: webLabels,
    },
    spec: {
        type: "ClusterIP",
        ports: [
            {
                port: 80,
                targetPort: 80,
                protocol: "TCP",
                name: "http",
            },
        ],
        selector: webLabels,
    },
});

// ============================================================================
// API Deployment
// ============================================================================

const apiLabels = { ...commonLabels, "app.kubernetes.io/component": "api" };

const apiDeployment = new k8s.apps.v1.Deployment("api", {
    metadata: {
        name: "api",
        namespace: namespace.metadata.name,
        labels: apiLabels,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: apiLabels,
        },
        template: {
            metadata: {
                labels: apiLabels,
            },
            spec: {
                initContainers: [
                    {
                        name: "db-migration",
                        image: `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`,
                        command: ["/bin/sh", "-c"],
                        args: [
                            "vendor/bin/phinx migrate && vendor/bin/phinx seed:run",
                        ],
                        envFrom: [
                            {
                                configMapRef: {
                                    name: configMap.metadata.name,
                                },
                            },
                            {
                                secretRef: {
                                    name: secret.metadata.name,
                                },
                            },
                        ],
                    },
                ],
                containers: [
                    {
                        name: "api",
                        image: `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`,
                        ports: [
                            {
                                containerPort: 80,
                                name: "http",
                            },
                        ],
                        envFrom: [
                            {
                                configMapRef: {
                                    name: configMap.metadata.name,
                                },
                            },
                            {
                                secretRef: {
                                    name: secret.metadata.name,
                                },
                            },
                        ],
                        resources: {
                            requests: {
                                cpu: "200m",
                                memory: "512Mi",
                            },
                            limits: {
                                cpu: "1",
                                memory: "2Gi",
                            },
                        },
                        livenessProbe: {
                            httpGet: {
                                path: "/",
                                port: 80,
                            },
                            initialDelaySeconds: 30,
                            periodSeconds: 10,
                        },
                        readinessProbe: {
                            httpGet: {
                                path: "/",
                                port: 80,
                            },
                            initialDelaySeconds: 10,
                            periodSeconds: 5,
                        },
                    },
                ],
            },
        },
    },
});

const apiService = new k8s.core.v1.Service("api-service", {
    metadata: {
        name: "api",
        namespace: namespace.metadata.name,
        labels: apiLabels,
    },
    spec: {
        type: "ClusterIP",
        ports: [
            {
                port: 80,
                targetPort: 80,
                protocol: "TCP",
                name: "http",
            },
        ],
        selector: apiLabels,
    },
});

// ============================================================================
// HTTPRoute Configuration
// ============================================================================

const webHttpRoute = new k8s.apiextensions.CustomResource("web-httproute", {
    apiVersion: "gateway.networking.k8s.io/v1",
    kind: "HTTPRoute",
    metadata: {
        name: "web",
        namespace: namespace.metadata.name,
        labels: webLabels,
        annotations: {
            // Connection-level rate limiting (100 connections per second)
            "cilium.io/connection-rate-limit": "100",
        },
    },
    spec: {
        parentRefs: [
            {
                name: gatewayName,
                namespace: "default",
            },
        ],
        hostnames: [`${prNumber}.pr.aphiria.com`],
        rules: [
            {
                matches: [
                    {
                        path: {
                            type: "PathPrefix",
                            value: "/",
                        },
                    },
                ],
                backendRefs: [
                    {
                        name: webService.metadata.name,
                        port: 80,
                    },
                ],
            },
        ],
    },
});

const apiHttpRoute = new k8s.apiextensions.CustomResource("api-httproute", {
    apiVersion: "gateway.networking.k8s.io/v1",
    kind: "HTTPRoute",
    metadata: {
        name: "api",
        namespace: namespace.metadata.name,
        labels: apiLabels,
        annotations: {
            // Connection-level rate limiting (50 connections per second for API)
            "cilium.io/connection-rate-limit": "50",
        },
    },
    spec: {
        parentRefs: [
            {
                name: gatewayName,
                namespace: "default",
            },
        ],
        hostnames: [`${prNumber}.pr-api.aphiria.com`],
        rules: [
            {
                matches: [
                    {
                        path: {
                            type: "PathPrefix",
                            value: "/",
                        },
                    },
                ],
                backendRefs: [
                    {
                        name: apiService.metadata.name,
                        port: 80,
                    },
                ],
            },
        ],
    },
});

// ============================================================================
// Outputs
// ============================================================================

export { webUrl, apiUrl, databaseName, namespaceName };
export const namespaceResourceName = namespace.metadata.name;
export const webImageRef = `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`;
export const apiImageRef = `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`;
