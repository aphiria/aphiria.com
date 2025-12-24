import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as crypto from "crypto";

/**
 * Calculate SHA256 checksum of ConfigMap data for pod template annotation.
 * This forces pod restarts when ConfigMap data changes.
 *
 * @param data ConfigMap data object
 * @returns SHA256 hex digest
 */
function configMapChecksum(data: Record<string, pulumi.Input<string>>): string {
    // Serialize with sorted keys for deterministic hashing
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash("sha256").update(serialized).digest("hex");
}

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
const gatewayNamespace = baseStack.getOutput("gatewayNamespace");
const tlsSecretName = baseStack.getOutput("tlsSecretName");
const kubeconfig = baseStack.requireOutput("kubeconfig");

// Create Kubernetes provider using kubeconfig from base stack
// This ensures preview-pr stacks connect to the same cluster as preview-base
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
// Kubernetes Namespace
// ============================================================================

const namespace = new k8s.core.v1.Namespace("preview-namespace", {
    metadata: {
        name: namespaceName,
        labels: commonLabels,
    },
}, { provider: k8sProvider });

// ============================================================================
// Image Pull Secret (copy from default namespace)
// ============================================================================

// Get GHCR credentials to create imagePullSecret in this namespace
const ghcrConfig = new pulumi.Config("ghcr");
const ghcrToken = ghcrConfig.requireSecret("token");
const ghcrUsername = ghcrConfig.require("username");

const imagePullSecret = new k8s.core.v1.Secret("ghcr-pull-secret", {
    metadata: {
        name: "ghcr-pull-secret",
        namespace: namespace.metadata.name,
    },
    type: "kubernetes.io/dockerconfigjson",
    stringData: {
        ".dockerconfigjson": pulumi.interpolate`{"auths":{"ghcr.io":{"username":"${ghcrUsername}","password":"${ghcrToken}"}}}`,
    },
}, { provider: k8sProvider });

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
            "requests.cpu": "4",
            "requests.memory": "8Gi",
            "limits.cpu": "4",
            "limits.memory": "8Gi",
            "pods": "5",
        },
    },
}, { provider: k8sProvider });

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
                // Allow ingress from Gateway (nginx-gateway namespace)
                from: [
                    {
                        namespaceSelector: {
                            matchLabels: {
                                "kubernetes.io/metadata.name": "nginx-gateway",
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
}, { provider: k8sProvider });

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
}, { provider: k8sProvider });

// ============================================================================
// ConfigMap and Secrets
// ============================================================================

// Define ConfigMap data as variable (single source of truth for checksum calculation)
const previewConfigData = {
    // Database configuration
    DB_HOST: postgresqlHost,
    DB_PORT: "5432",
    DB_NAME: databaseName,
    DB_USER: postgresqlAdminUser,

    // Environment configuration
    APP_ENV: "preview",
    PR_NUMBER: prNumber.toString(),

    // URL configuration (legacy names - kept for compatibility)
    WEB_URL: webUrl,
    API_URL: apiUrl,

    // APP_* prefixed variables (required by CORS middleware and application code)
    APP_WEB_URL: webUrl,
    APP_API_URL: apiUrl,
    APP_COOKIE_DOMAIN: ".pr.aphiria.com",
    APP_COOKIE_SECURE: "1",
    APP_BUILDER_API: "\\Aphiria\\Framework\\Api\\SynchronousApiApplicationBuilder",
    APP_BUILDER_CONSOLE: "\\Aphiria\\Framework\\Console\\ConsoleApplicationBuilder",
    LOG_LEVEL: "debug",
};

// Calculate checksum for pod template annotation (triggers restart when config changes)
const previewConfigChecksum = configMapChecksum(previewConfigData);

const configMap = new k8s.core.v1.ConfigMap("preview-config", {
    metadata: {
        name: "preview-config",
        namespace: namespace.metadata.name,
        labels: commonLabels,
    },
    data: previewConfigData,
}, { provider: k8sProvider });

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
}, { provider: k8sProvider });

// ============================================================================
// JavaScript Configuration (js-config ConfigMap)
// ============================================================================

const jsConfigMap = new k8s.core.v1.ConfigMap("js-config", {
    metadata: {
        name: "js-config",
        namespace: namespace.metadata.name,
        labels: commonLabels,
    },
    data: {
        "config.js": pulumi.interpolate`export default {
      apiUri: '${apiUrl}',
      cookieDomain: '.pr.aphiria.com'
    }`,
    },
}, { provider: k8sProvider });

// ============================================================================
// nginx Configuration for API (nginx-config ConfigMap)
// ============================================================================

const nginxConfigMap = new k8s.core.v1.ConfigMap("nginx-config", {
    metadata: {
        name: "nginx-config",
        namespace: namespace.metadata.name,
        labels: commonLabels,
    },
    data: {
        "default.conf": `server {
    index index.php index.html;
    error_log  /var/log/nginx/error.log;
    access_log /var/log/nginx/access.log;
    root /usr/share/nginx/html/public;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    location / {
        try_files $uri $uri/ /index.php$is_args$args;
    }

    location ~ \\.php$ {
        fastcgi_split_path_info ^(.+\\.php)(/.+)$;
        # Pass this through to the PHP image running in this pod on port 9000
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_hide_header X-Powered-By;
    }
}`,
    },
}, { provider: k8sProvider });

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
                annotations: {
                    // Force pod restart when ConfigMap data changes
                    "checksum/config": previewConfigChecksum,
                },
            },
            spec: {
                imagePullSecrets: [
                    {
                        name: "ghcr-pull-secret",
                    },
                ],
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
                        volumeMounts: [
                            {
                                name: "js-config",
                                mountPath: "/usr/share/nginx/html/js/config",
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
                volumes: [
                    {
                        name: "js-config",
                        configMap: {
                            name: jsConfigMap.metadata.name,
                        },
                    },
                ],
            },
        },
    },
}, { provider: k8sProvider });

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
}, { provider: k8sProvider });

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
                annotations: {
                    // Force pod restart when ConfigMap data changes
                    "checksum/config": previewConfigChecksum,
                },
            },
            spec: {
                imagePullSecrets: [
                    {
                        name: "ghcr-pull-secret",
                    },
                ],
                // Init container: copy PHP source code to shared volume
                initContainers: [
                    {
                        name: "copy-api-code",
                        image: `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`,
                        command: ["sh", "-c", "cp -Rp /app/api/. /usr/share/nginx/html"],
                        volumeMounts: [
                            {
                                name: "api-code",
                                mountPath: "/usr/share/nginx/html",
                            },
                        ],
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
                    },
                ],
                containers: [
                    // nginx container: serves HTTP on port 80, proxies PHP to FastCGI
                    {
                        name: "nginx",
                        image: "nginx:alpine",
                        ports: [
                            {
                                containerPort: 80,
                                name: "http",
                            },
                        ],
                        volumeMounts: [
                            {
                                name: "api-code",
                                mountPath: "/usr/share/nginx/html",
                            },
                            {
                                name: "nginx-config",
                                mountPath: "/etc/nginx/conf.d/default.conf",
                                subPath: "default.conf",
                            },
                        ],
                        livenessProbe: {
                            httpGet: {
                                path: "/health",
                                port: 80,
                            },
                            initialDelaySeconds: 10,
                            periodSeconds: 10,
                        },
                        readinessProbe: {
                            httpGet: {
                                path: "/health",
                                port: 80,
                            },
                            initialDelaySeconds: 5,
                            periodSeconds: 5,
                        },
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
                    },
                    // PHP-FPM container: runs PHP on port 9000 (FastCGI)
                    {
                        name: "php",
                        image: `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`,
                        ports: [
                            {
                                containerPort: 9000,
                                name: "fastcgi",
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
                        volumeMounts: [
                            {
                                name: "api-code",
                                mountPath: "/usr/share/nginx/html",
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
                    },
                ],
                volumes: [
                    {
                        name: "api-code",
                        emptyDir: {},
                    },
                    {
                        name: "nginx-config",
                        configMap: {
                            name: nginxConfigMap.metadata.name,
                            items: [
                                {
                                    key: "default.conf",
                                    path: "default.conf",
                                },
                            ],
                        },
                    },
                ],
            },
        },
    },
}, { provider: k8sProvider });

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
}, { provider: k8sProvider });

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
                namespace: gatewayNamespace,
                sectionName: "https-subdomains-1", // Listener for *.pr.aphiria.com
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
}, { provider: k8sProvider });

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
                namespace: gatewayNamespace,
                sectionName: "https-subdomains-2", // Listener for *.pr-api.aphiria.com
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
}, { provider: k8sProvider });

// ============================================================================
// Outputs
// ============================================================================

export { webUrl, apiUrl, databaseName, namespaceName };
export const namespaceResourceName = namespace.metadata.name;
export const webImageRef = `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`;
export const apiImageRef = `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`;
