import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as digitalocean from "@pulumi/digitalocean";

/**
 * Environment type for stack configuration
 */
export type Environment = "local" | "preview" | "production";

/**
 * PodDisruptionBudget configuration for high availability
 * Ensures minimum pod availability during voluntary disruptions (node drains, upgrades)
 */
export interface PodDisruptionBudgetConfig {
    /** Minimum number of pods that must be available (e.g., 1) */
    minAvailable?: number;
    /** Maximum number of pods that can be unavailable (e.g., 1) */
    maxUnavailable?: number;
}

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
    /** Log level (e.g., "warning", "debug", "info") */
    logLevel: string;
    /** PR number (optional, preview environments only) */
    prNumber?: string;
    /** Additional custom environment variables */
    extraVars?: Record<string, pulumi.Input<string>>;
    /** Optional image pull secrets for private registries */
    imagePullSecrets?: pulumi.Input<string>[];
    /** Optional resource limits */
    resources?: {
        requests?: {
            cpu?: string;
            memory?: string;
        };
        limits?: {
            cpu?: string;
            memory?: string;
        };
    };
    /** Optional PodDisruptionBudget for high availability (production only) */
    podDisruptionBudget?: PodDisruptionBudgetConfig;
    /** @deprecated Component calculates checksum internally. ConfigMap checksum for pod annotations */
    configChecksum?: string;
    /** @deprecated Use envConfig instead. ConfigMap references to load as environment variables */
    configMapRefs?: pulumi.Input<string>[];
    /** @deprecated Use envConfig instead. Secret references to load as environment variables */
    secretRefs?: pulumi.Input<string>[];
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
    dbHost: pulumi.Input<string>;
    /** Database name */
    dbName: string;
    /** Database user */
    dbUser: pulumi.Input<string>;
    /** Database password (sensitive) */
    dbPassword: pulumi.Input<string>;
    /** Base URL for the API */
    apiUrl: string;
    /** Base URL for the web app (for CORS) */
    webUrl: string;
    /** Log level (e.g., "warning", "debug", "info") */
    logLevel: string;
    /** Cookie domain (e.g., ".aphiria.com") */
    cookieDomain: string;
    /** Enable secure cookies (true for HTTPS, false for local HTTP) */
    cookieSecure: boolean;
    /** PR number (optional, preview environments only) */
    prNumber?: string;
    /** Additional custom environment variables */
    extraVars?: Record<string, pulumi.Input<string>>;
    /** Optional image pull secrets for private registries */
    imagePullSecrets?: pulumi.Input<string>[];
    /** Optional resource limits for containers */
    resources?: {
        nginx?: {
            requests?: { cpu?: string; memory?: string };
            limits?: { cpu?: string; memory?: string };
        };
        php?: {
            requests?: { cpu?: string; memory?: string };
            limits?: { cpu?: string; memory?: string };
        };
        initContainer?: {
            requests?: { cpu?: string; memory?: string };
            limits?: { cpu?: string; memory?: string };
        };
    };
    /** Optional PodDisruptionBudget for high availability (production only) */
    podDisruptionBudget?: PodDisruptionBudgetConfig;
    /** @deprecated Use envConfig instead. ConfigMap references to load as environment variables */
    configMapRefs?: pulumi.Input<string>[];
    /** @deprecated Use envConfig instead. Secret references to load as environment variables */
    secretRefs?: pulumi.Input<string>[];
    /** @deprecated Component calculates checksum internally. ConfigMap checksum for pod annotations */
    configChecksum?: string;
}

/**
 * Arguments for PostgreSQL component
 */
export interface PostgreSQLArgs {
    /** Environment this database targets */
    env: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
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
    tlsMode: "self-signed" | "letsencrypt-prod";
    /** Domains to secure with TLS */
    domains: string[];
    /** DigitalOcean DNS API token for DNS-01 ACME challenges (required for wildcard certs) */
    dnsToken?: pulumi.Input<string>;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
    /** Optional cert-manager dependency to ensure CRDs are ready */
    certManagerDependency?: pulumi.Resource;
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
    /** Backend service namespace (for cross-namespace routing) */
    serviceNamespace: pulumi.Input<string>;
    /** Backend service port */
    servicePort: number;
    /** Gateway reference */
    gatewayName: pulumi.Input<string>;
    gatewayNamespace: pulumi.Input<string>;
    /** Gateway listener sectionName (e.g., "https-subdomains-1") to attach to specific listener */
    sectionName?: string;
    /** Enable connection-level rate limiting */
    enableRateLimiting?: boolean;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Arguments for database creation job component
 */
export interface DatabaseCreationJobArgs {
    /** Environment this job targets */
    env: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Database name to create */
    databaseName: string;
    /** PostgreSQL host */
    dbHost: pulumi.Input<string>;
    /** PostgreSQL admin user (must have CREATE DATABASE privilege) */
    dbAdminUser: pulumi.Input<string>;
    /** PostgreSQL admin password (sensitive) */
    dbAdminPassword: pulumi.Input<string>;
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
    dbHost: pulumi.Input<string>;
    /** Database name */
    dbName: string;
    /** Database user */
    dbUser: pulumi.Input<string>;
    /** Database password (sensitive) */
    dbPassword: pulumi.Input<string>;
    /** Run LexemeSeeder after migrations */
    runSeeder: boolean;
    /** Optional image pull secrets for private registries */
    imagePullSecrets?: pulumi.Input<string>[];
    /** Optional resource limits for containers */
    resources?: {
        migration?: {
            requests?: { cpu?: string; memory?: string };
            limits?: { cpu?: string; memory?: string };
        };
        initContainer?: {
            requests?: { cpu?: string; memory?: string };
            limits?: { cpu?: string; memory?: string };
        };
    };
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Arguments for namespace component
 */
export interface NamespaceArgs {
    /** Namespace name */
    name: string;
    /** Environment this namespace targets */
    env: Environment;
    /** Optional ResourceQuota for the namespace */
    resourceQuota?: {
        cpu: string;
        memory: string;
        pods: string;
    };
    /** Optional NetworkPolicy configuration */
    networkPolicy?: {
        allowDNS: boolean;
        allowHTTPS: boolean;
        allowPostgreSQL?: {
            host: string;
            port: number;
        };
    };
    /** Optional ImagePullSecret for private registries */
    imagePullSecret?: {
        registry: string;
        username: pulumi.Input<string>;
        token: pulumi.Input<string>;
    };
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
    values?: Record<string, unknown>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Return type for namespace component
 */
export interface NamespaceResult {
    namespace: k8s.core.v1.Namespace;
    resourceQuota?: k8s.core.v1.ResourceQuota;
    networkPolicy?: k8s.networking.v1.NetworkPolicy;
    imagePullSecret?: k8s.core.v1.Secret;
}

/**
 * Return type for web deployment component
 */
export interface WebDeploymentResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    configMap: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    podDisruptionBudget?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Return type for API deployment component
 */
export interface APIDeploymentResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    secret: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    podDisruptionBudget?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Return type for PostgreSQL component
 */
export interface PostgreSQLResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pvc?: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>; // Only present if persistentStorage=true
}

/**
 * Return type for Gateway component
 */
export interface GatewayResult {
    name: pulumi.Output<string>;
    namespace: pulumi.Output<string>;
    urn: pulumi.Output<string>;
    certificate?: pulumi.Output<string>; // Only present for non-self-signed
    ip?: pulumi.Output<string>; // LoadBalancer IP (populated by factory after gateway creation)
    dnsRecords?: digitalocean.DnsRecord[]; // DNS records pointing to gateway IP (populated by factory if configured)
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
    cluster: digitalocean.KubernetesCluster;
    clusterId: pulumi.Output<string>;
    endpoint: pulumi.Output<string>;
    kubeconfig: pulumi.Output<string>;
    clusterCaCertificate: pulumi.Output<string>;
    provider: k8s.Provider;
}

/**
 * Arguments for Prometheus component
 */
export interface PrometheusArgs {
    /** Environment this Prometheus instance targets */
    env: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Metrics retention period (e.g., "7d") */
    retentionTime: string;
    /** Storage size for metrics (e.g., "10Gi") */
    storageSize: string;
    /** Scrape interval for metrics collection (e.g., "15s") */
    scrapeInterval?: string;
    /** Optional resource limits for containers */
    resources?: {
        requests?: { cpu?: string; memory?: string };
        limits?: { cpu?: string; memory?: string };
    };
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Return type for Prometheus component
 */
export interface PrometheusResult {
    serviceAccount: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRole: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRoleBinding: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    statefulSet: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pvc: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    configMap: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Arguments for kube-state-metrics component
 */
export interface KubeStateMetricsArgs {
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Return type for kube-state-metrics component
 */
export interface KubeStateMetricsResult {
    serviceAccount: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRole: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    clusterRoleBinding: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Arguments for Grafana component
 */
export interface GrafanaArgs {
    /** Environment this Grafana instance targets */
    env: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Prometheus service URL for datasource */
    prometheusUrl: pulumi.Input<string>;
    /** Storage size for dashboards (e.g., "5Gi") */
    storageSize: string;
    /** GitHub OAuth client ID */
    githubClientId: pulumi.Input<string>;
    /** GitHub OAuth client secret */
    githubClientSecret: pulumi.Input<string>;
    /** GitHub organization for access control */
    githubOrg: string;
    /** GitHub user with admin privileges */
    adminUser: string;
    /** SMTP host for email alerts (optional, only for production) */
    smtpHost?: pulumi.Input<string>;
    /** SMTP port */
    smtpPort?: number;
    /** SMTP username */
    smtpUser?: pulumi.Input<string>;
    /** SMTP password */
    smtpPassword?: pulumi.Input<string>;
    /** Email sender address */
    smtpFromAddress?: string;
    /** Email recipient for alerts */
    alertEmail?: string;
    /** Dashboards ConfigMap for auto-provisioning */
    dashboardsConfigMap?: k8s.core.v1.ConfigMap;
    /** Optional resource limits for containers */
    resources?: {
        requests?: { cpu?: string; memory?: string };
        limits?: { cpu?: string; memory?: string };
    };
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/**
 * Return type for Grafana component
 */
export interface GrafanaResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pvc: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    configMap: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    secret: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Return type for Grafana Ingress component
 */
export interface GrafanaIngressResult {
    httpsRoute: k8s.apiextensions.CustomResource;
    httpRedirectRoute: k8s.apiextensions.CustomResource;
}
