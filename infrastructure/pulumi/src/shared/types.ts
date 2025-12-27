import * as pulumi from "@pulumi/pulumi";
import { Environment } from "../components/types";

/**
 * Kubernetes cluster configuration for cloud providers (DigitalOcean, AWS, etc.)
 * Not used for local environments (which use minikube)
 */
export interface KubernetesClusterConfig {
    /** Cluster name */
    name: string;
    /** Cloud provider region (e.g., "nyc3" for DigitalOcean) */
    region: string;
    /** Kubernetes version (e.g., "1.34.1-do.2") */
    version?: string;
    /** Node machine size (e.g., "s-2vcpu-2gb") */
    nodeSize: string;
    /** Initial node count */
    nodeCount: number;
    /** Enable auto-scaling */
    autoScale?: boolean;
    /** Minimum nodes when auto-scaling */
    minNodes: number;
    /** Maximum nodes when auto-scaling */
    maxNodes: number;
    /** VPC UUID for network isolation */
    vpcUuid?: string;
}

/**
 * Database configuration for PostgreSQL
 */
export interface DatabaseConfig {
    /** Number of replicas (1 for dev/preview, 2+ for production) */
    replicas: number;
    /** Enable persistent storage (false for ephemeral dev, true for preview/production) */
    persistentStorage: boolean;
    /** Storage size (e.g., "5Gi", "20Gi") */
    storageSize: string;
    /** Database username */
    dbUser: pulumi.Input<string>;
    /** Database password (sensitive) */
    dbPassword: pulumi.Input<string>;

    /** Create a new database on shared instance (preview-pr only) */
    createDatabase?: boolean;
    /** Database name to create (preview-pr only) */
    databaseName?: string;
    /** Host of shared PostgreSQL instance (preview-pr only) */
    dbHost?: pulumi.Input<string>;
    /** Admin user for database creation (preview-pr only) */
    dbAdminUser?: pulumi.Input<string>;
    /** Admin password for database creation (preview-pr only) */
    dbAdminPassword?: pulumi.Input<string>;
}

/**
 * Gateway configuration for ingress/TLS
 */
export interface GatewayConfig {
    /** TLS certificate mode */
    tlsMode: "self-signed" | "letsencrypt-prod";
    /** Domains to secure with TLS (supports wildcards like "*.pr.aphiria.com") */
    domains: string[];
    /** DigitalOcean DNS API token for DNS-01 ACME challenges (required for wildcard certs) */
    dnsToken?: pulumi.Input<string>;
}

/**
 * Kubernetes resource limits (CPU and memory)
 * Used for container resource requests and limits
 */
export interface ResourceLimits {
    requests: {
        cpu: string;
        memory: string;
    };
    limits: {
        cpu: string;
        memory: string;
    };
}

/**
 * API deployment resource limits (multi-container)
 * API pods have nginx, PHP-FPM, and init containers with different resource needs
 */
export interface APIResourceLimits {
    nginx?: ResourceLimits;
    php?: ResourceLimits;
    initContainer?: ResourceLimits;
}

/**
 * Application deployment configuration (web + API)
 */
export interface AppConfig {
    /** Number of web deployment replicas */
    webReplicas: number;
    /** Number of API deployment replicas */
    apiReplicas: number;
    /** Web application base URL */
    webUrl: string;
    /** API base URL */
    apiUrl: string;
    /** Web Docker image reference (tag or digest) */
    webImage: string;
    /** API Docker image reference (tag or digest) */
    apiImage: string;
    /** Cookie domain for sessions (e.g., ".aphiria.com", ".pr.aphiria.com") */
    cookieDomain: string;
    /** Web container resource limits (optional - for cost control in preview/production) */
    webResources?: ResourceLimits;
    /** API container resource limits (optional - for cost control in preview/production) */
    apiResources?: APIResourceLimits;
    /** Database migration job resource limits (optional - for namespaces with ResourceQuotas) */
    migrationResources?: {
        migration?: {
            requests?: { cpu?: string; memory?: string };
            limits?: { cpu?: string; memory?: string };
        };
        initContainer?: {
            requests?: { cpu?: string; memory?: string };
            limits?: { cpu?: string; memory?: string };
        };
    };
    /** Web PodDisruptionBudget (optional - production only) */
    webPodDisruptionBudget?: { minAvailable?: number; maxUnavailable?: number };
    /** API PodDisruptionBudget (optional - production only) */
    apiPodDisruptionBudget?: { minAvailable?: number; maxUnavailable?: number };
}

/**
 * Namespace configuration with resource quota and network policy
 * Used for preview-pr stacks to create isolated per-PR namespaces
 */
export interface NamespaceConfig {
    /** Namespace name */
    name: string;
    /** Resource quota limits */
    resourceQuota?: {
        cpu: string;
        memory: string;
        pods: string;
    };
    /** Network policy rules */
    networkPolicy?: {
        allowDNS: boolean;
        allowHTTPS: boolean;
        allowPostgreSQL?: {
            host: string;
            port: number;
        };
    };
    /** Image pull secret for private registries */
    imagePullSecret?: {
        registry: string;
        username: pulumi.Input<string>;
        token: pulumi.Input<string>;
    };
}

/**
 * Complete stack configuration for all environments
 *
 * This interface defines all parameters needed to create a full infrastructure stack.
 * Different environments (local, preview, production) will provide different values.
 *
 * @example Local environment
 * ```typescript
 * const config: StackConfig = {
 *   env: "local",
 *   database: { replicas: 1, persistentStorage: true, storageSize: "5Gi", ... },
 *   gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
 *   app: { webReplicas: 1, apiReplicas: 1, webUrl: "https://www.aphiria.com", ... }
 * };
 * ```
 *
 * @example Preview environment (per-PR)
 * ```typescript
 * const config: StackConfig = {
 *   env: "preview",
 *   namespace: { name: "preview-pr-123", resourceQuota: { cpu: "4", memory: "8Gi", pods: "5" }, ... },
 *   database: { createDatabase: true, databaseName: "aphiria_pr_123", ... },
 *   app: { webReplicas: 1, apiReplicas: 1, webUrl: "https://123.pr.aphiria.com", ... }
 * };
 * ```
 */
export interface StackConfig {
    /** Environment type (determines default behaviors) */
    env: Environment;

    /**
     * Skip base infrastructure installation (Helm charts, Gateway)
     * Set to true for preview-pr stacks that use shared infrastructure from preview-base
     */
    skipBaseInfrastructure?: boolean;

    /**
     * Kubernetes cluster configuration
     * Optional - only needed for cloud environments (preview, production)
     * Local environments use minikube and don't need cluster creation
     */
    cluster?: KubernetesClusterConfig;

    /** Database configuration (required for all environments) */
    database: DatabaseConfig;

    /** Gateway/ingress configuration (required for all environments) */
    gateway: GatewayConfig;

    /**
     * Application configuration
     * Optional - preview-base doesn't deploy apps, only infrastructure
     */
    app?: AppConfig;

    /**
     * Namespace configuration with resource quota and network policy
     * Optional - only needed for preview-pr (per-PR isolated namespaces)
     * Local and preview-base use "default" namespace
     */
    namespace?: NamespaceConfig;
}
