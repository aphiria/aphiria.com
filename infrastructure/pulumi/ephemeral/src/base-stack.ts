import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * Base Infrastructure Stack
 *
 * Deploys persistent infrastructure shared across all ephemeral preview environments:
 * - Shared PostgreSQL instance
 * - Kubernetes Gateway API configuration
 * - Wildcard TLS certificate (*.pr.aphiria.com)
 *
 * This stack is deployed once and manually updated as needed.
 * Stack name: ephemeral-base
 */

const config = new pulumi.Config();
const kubernetesNamespace = config.get("namespace") || "default";

// PostgreSQL Configuration
const postgresqlConfig = new pulumi.Config("postgresql");
const postgresqlAdminUser = postgresqlConfig.get("adminUser") || "postgres";
const postgresqlAdminPassword = postgresqlConfig.requireSecret("adminPassword");

// ============================================================================
// PostgreSQL Deployment
// ============================================================================

const postgresqlLabels = { app: "postgresql", component: "ephemeral-base" };

const postgresqlPvc = new k8s.core.v1.PersistentVolumeClaim("postgresql-pvc", {
    metadata: {
        name: "postgresql-data",
        namespace: kubernetesNamespace,
        labels: postgresqlLabels,
    },
    spec: {
        accessModes: ["ReadWriteOnce"],
        resources: {
            requests: {
                storage: "10Gi",
            },
        },
    },
});

const postgresqlDeployment = new k8s.apps.v1.Deployment("postgresql", {
    metadata: {
        name: "postgresql",
        namespace: kubernetesNamespace,
        labels: postgresqlLabels,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: postgresqlLabels,
        },
        template: {
            metadata: {
                labels: postgresqlLabels,
            },
            spec: {
                containers: [
                    {
                        name: "postgresql",
                        image: "postgres:16-alpine",
                        ports: [
                            {
                                containerPort: 5432,
                                name: "postgresql",
                            },
                        ],
                        env: [
                            {
                                name: "POSTGRES_PASSWORD",
                                value: postgresqlAdminPassword,
                            },
                            {
                                name: "POSTGRES_USER",
                                value: postgresqlAdminUser,
                            },
                            {
                                name: "PGDATA",
                                value: "/var/lib/postgresql/data/pgdata",
                            },
                        ],
                        volumeMounts: [
                            {
                                name: "postgresql-data",
                                mountPath: "/var/lib/postgresql/data",
                            },
                        ],
                        resources: {
                            requests: {
                                cpu: "500m",
                                memory: "1Gi",
                            },
                            limits: {
                                cpu: "2",
                                memory: "4Gi",
                            },
                        },
                        livenessProbe: {
                            exec: {
                                command: ["pg_isready", "-U", postgresqlAdminUser],
                            },
                            initialDelaySeconds: 30,
                            periodSeconds: 10,
                        },
                        readinessProbe: {
                            exec: {
                                command: ["pg_isready", "-U", postgresqlAdminUser],
                            },
                            initialDelaySeconds: 5,
                            periodSeconds: 5,
                        },
                    },
                ],
                volumes: [
                    {
                        name: "postgresql-data",
                        persistentVolumeClaim: {
                            claimName: postgresqlPvc.metadata.name,
                        },
                    },
                ],
            },
        },
    },
});

const postgresqlService = new k8s.core.v1.Service("postgresql-service", {
    metadata: {
        name: "db",
        namespace: kubernetesNamespace,
        labels: postgresqlLabels,
    },
    spec: {
        type: "ClusterIP",
        ports: [
            {
                port: 5432,
                targetPort: 5432,
                protocol: "TCP",
                name: "postgresql",
            },
        ],
        selector: postgresqlLabels,
    },
});

// ============================================================================
// Gateway API Configuration
// ============================================================================

const gatewayLabels = { component: "ephemeral-gateway" };

const gateway = new k8s.apiextensions.CustomResource("ephemeral-gateway", {
    apiVersion: "gateway.networking.k8s.io/v1",
    kind: "Gateway",
    metadata: {
        name: "aphiria-preview-gateway",
        namespace: kubernetesNamespace,
        labels: gatewayLabels,
    },
    spec: {
        gatewayClassName: "cilium",
        listeners: [
            {
                name: "http",
                protocol: "HTTP",
                port: 80,
                hostname: "*.pr.aphiria.com",
            },
            {
                name: "http-api",
                protocol: "HTTP",
                port: 80,
                hostname: "*.pr-api.aphiria.com",
            },
            {
                name: "https",
                protocol: "HTTPS",
                port: 443,
                hostname: "*.pr.aphiria.com",
                tls: {
                    mode: "Terminate",
                    certificateRefs: [
                        {
                            kind: "Secret",
                            name: "pr-wildcard-tls",
                        },
                    ],
                },
            },
            {
                name: "https-api",
                protocol: "HTTPS",
                port: 443,
                hostname: "*.pr-api.aphiria.com",
                tls: {
                    mode: "Terminate",
                    certificateRefs: [
                        {
                            kind: "Secret",
                            name: "pr-wildcard-tls",
                        },
                    ],
                },
            },
        ],
    },
});

// ============================================================================
// Wildcard TLS Certificate (cert-manager)
// ============================================================================

const tlsCertificate = new k8s.apiextensions.CustomResource("pr-wildcard-cert", {
    apiVersion: "cert-manager.io/v1",
    kind: "Certificate",
    metadata: {
        name: "pr-wildcard-tls",
        namespace: kubernetesNamespace,
    },
    spec: {
        secretName: "pr-wildcard-tls",
        issuerRef: {
            name: "letsencrypt-prod",
            kind: "ClusterIssuer",
        },
        dnsNames: [
            "*.pr.aphiria.com",
            "*.pr-api.aphiria.com",
        ],
    },
});

// ============================================================================
// Outputs
// ============================================================================

export const postgresqlHost = postgresqlService.metadata.name;
export const postgresqlPort = 5432;
export const gatewayName = gateway.metadata.name;
export const tlsSecretName = tlsCertificate.spec.secretName;
export const namespace = kubernetesNamespace;
