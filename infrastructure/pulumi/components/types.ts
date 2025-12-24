import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * Environment type for stack configuration
 */
export type Environment = "local" | "preview" | "production";

/**
 * Common arguments shared across all deployment components
 */
export interface CommonDeploymentArgs {
    /** Environment this deployment targets */
    env: Environment;
    /** Kubernetes namespace to deploy into */
    namespace: pulumi.Input<string>;
    /** Resource labels for Kubernetes resources */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Arguments for web deployment component
 */
export interface WebDeploymentArgs extends CommonDeploymentArgs {
    /** Number of replicas (1 for dev-local/preview, 2 for production) */
    replicas: number;
    /** Docker image reference (can be tag or digest) */
    image: string;
    /** JavaScript configuration data for js-config ConfigMap */
    jsConfigData: Record<string, string>;
    /** Base URL for the web application */
    baseUrl: string;
}

/**
 * Arguments for API deployment component
 */
export interface APIDeploymentArgs extends CommonDeploymentArgs {
    /** Number of replicas (1 for dev-local/preview, 2 for production) */
    replicas: number;
    /** Docker image reference (can be tag or digest) */
    image: string;
    /** Database host */
    dbHost: string;
    /** Database name */
    dbName: string;
    /** Database user */
    dbUser: string;
    /** Database password (sensitive) */
    dbPassword: pulumi.Input<string>;
    /** Base URL for the API */
    apiUrl: string;
    /** Base URL for the web app (for CORS) */
    webUrl: string;
}

/**
 * Arguments for PostgreSQL component
 */
export interface PostgreSQLArgs {
    /** Environment this database targets */
    env: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Number of replicas (1 for dev-local/preview, 2 for production) */
    replicas: number;
    /** Enable persistent storage (false for dev-local, true for preview/production) */
    persistentStorage: boolean;
    /** Storage size (e.g., "10Gi") - only used if persistentStorage=true */
    storageSize?: string;
    /** Database user */
    dbUser: string;
    /** Database password (sensitive) */
    dbPassword: pulumi.Input<string>;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Arguments for Gateway component
 */
export interface GatewayArgs {
    /** Environment this gateway targets */
    env: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Gateway name */
    name: string;
    /** TLS certificate type */
    tlsMode: "self-signed" | "letsencrypt-staging" | "letsencrypt-prod";
    /** Domains to secure with TLS */
    domains: string[];
    /** DigitalOcean DNS API token for DNS-01 ACME challenges (required for wildcard certs) */
    dnsToken?: pulumi.Input<string>;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Arguments for HTTPRoute component
 */
export interface HTTPRouteArgs {
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Route name */
    name: string;
    /** Hostname to match (e.g., "www.aphiria.com", "123.pr.aphiria.com") */
    hostname: string;
    /** Backend service name */
    serviceName: string;
    /** Backend service port */
    servicePort: number;
    /** Gateway reference */
    gatewayName: string;
    gatewayNamespace: pulumi.Input<string>;
    /** Enable connection-level rate limiting */
    enableRateLimiting?: boolean;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Arguments for database migration job component
 */
export interface DBMigrationJobArgs {
    /** Environment this migration targets */
    env?: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Docker image containing migrations */
    image: string;
    /** Database host */
    dbHost: string;
    /** Database name */
    dbName: string;
    /** Database user */
    dbUser: string;
    /** Database password (sensitive) */
    dbPassword: pulumi.Input<string>;
    /** Run LexemeSeeder after migrations */
    runSeeder: boolean;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Arguments for Helm chart component
 */
export interface HelmChartArgs {
    /** Environment this chart targets */
    env: Environment;
    /** Chart name */
    chartName: string;
    /** Chart repository URL or OCI registry */
    repository: string;
    /** Chart version */
    version: string;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Helm values */
    values?: Record<string, any>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Return type for web deployment component
 */
export interface WebDeploymentResult {
    deployment: pulumi.Output<any>;
    service: pulumi.Output<any>;
    configMap: pulumi.Output<any>;
}

/**
 * Return type for API deployment component
 */
export interface APIDeploymentResult {
    deployment: pulumi.Output<any>;
    service: pulumi.Output<any>;
    secret: pulumi.Output<any>;
}

/**
 * Return type for PostgreSQL component
 */
export interface PostgreSQLResult {
    deployment: pulumi.Output<any>;
    service: pulumi.Output<any>;
    pvc?: pulumi.Output<any>; // Only present if persistentStorage=true
}

/**
 * Return type for Gateway component
 */
export interface GatewayResult {
    gateway: pulumi.Output<any>;
    certificate?: pulumi.Output<any>; // Only present for non-self-signed
}

/**
 * Arguments for Kubernetes cluster component
 */
export interface KubernetesClusterArgs {
    /** Cluster name */
    name: string;
    /** DigitalOcean region (default: nyc1) */
    region?: string;
    /** Kubernetes version (default: 1.34.1-do.0) */
    version?: string;
    /** Enable automatic Kubernetes version upgrades */
    autoUpgrade?: boolean;
    /** Enable surge upgrades (more aggressive) */
    surgeUpgrade?: boolean;
    /** Enable high availability control plane */
    ha?: boolean;
    /** VPC UUID to attach cluster to */
    vpcUuid?: string;
    /** Node pool machine size (default: s-2vcpu-4gb) */
    nodeSize?: string;
    /** Initial node count (default: 2) */
    nodeCount?: number;
    /** Enable auto-scaling (default: true) */
    autoScale?: boolean;
    /** Minimum nodes when auto-scaling (default: 1) */
    minNodes?: number;
    /** Maximum nodes when auto-scaling (default: 5) */
    maxNodes?: number;
    /** Resource tags */
    tags?: string[];
    /** Node labels */
    labels?: Record<string, string>;
}

/**
 * Return type for Kubernetes cluster component
 */
export interface KubernetesClusterResult {
    cluster: any;
    clusterId: pulumi.Output<string>;
    endpoint: pulumi.Output<string>;
    kubeconfig: pulumi.Output<string>;
    clusterCaCertificate: pulumi.Output<string>;
}
