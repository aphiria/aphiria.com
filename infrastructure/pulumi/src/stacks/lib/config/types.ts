/**
 * Configuration type definitions for all Pulumi stack configuration objects
 *
 * These types define the structure of nested configuration objects read from Pulumi.*.yml files.
 * All config objects are read using `config.requireObject<Type>('key')` from the main
 * `aphiria-com-infrastructure` namespace.
 *
 * Secrets must be wrapped with `pulumi.secret()` after reading from config.
 */

/**
 * Resource limits and requests for Kubernetes containers
 */
export interface ResourceRequirements {
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
 * Kubernetes cluster configuration (DigitalOcean)
 */
export interface ClusterConfig {
    name: string;
    region: string;
    version: string;
    autoUpgrade: boolean;
    surgeUpgrade: boolean;
    ha: boolean;
    nodeSize: string;
    nodeCount: number;
    autoScale: boolean;
    minNodes: number;
    maxNodes: number;
    vpcUuid: string;
}

/**
 * PostgreSQL database configuration
 */
export interface PostgreSQLConfig {
    version: string;
    persistentStorage: boolean;
    user: string;
    password: string; // Secret - wrap with pulumi.secret()
    storageSize: string;
    useHostPath: boolean;
    hostPath?: string;
    host: string;
    resources: ResourceRequirements;
    createDatabase?: boolean;
    databaseName?: string;
}

/**
 * Web application configuration
 */
export interface WebAppConfig {
    url: string;
    cookieDomain: string;
    replicas: number;
    image: string;
    resources: ResourceRequirements;
    podDisruptionBudget?: {
        minAvailable: number;
    };
}

/**
 * API application configuration
 */
export interface APIAppConfig {
    url: string;
    logLevel: string;
    replicas: number;
    image: string;
    resources: {
        initContainer: ResourceRequirements;
        nginx: ResourceRequirements;
        php: ResourceRequirements;
    };
    podDisruptionBudget?: {
        minAvailable: number;
    };
}

/**
 * Database migration job configuration
 */
export interface MigrationConfig {
    resources: {
        migration: ResourceRequirements;
        initContainer: ResourceRequirements;
    };
}

/**
 * Application configuration (web, API, migration)
 */
export interface AppConfig {
    imagePullPolicy: string;
    web: WebAppConfig;
    api: APIAppConfig;
    migration: MigrationConfig;
}

/**
 * DNS record configuration
 */
export interface DNSRecordConfig {
    name: string;
    resourceName: string;
}

/**
 * DNS configuration for Gateway
 */
export interface DNSConfig {
    domain: string;
    records: DNSRecordConfig[];
    ttl?: number;
}

/**
 * Gateway configuration (nginx-gateway, TLS, DNS)
 */
export interface GatewayConfig {
    tlsMode: "self-signed" | "letsencrypt-prod";
    domains: string[];
    requireRootAndWildcard: boolean;
    dns?: DNSConfig;
    digitaloceanDnsToken?: string; // Secret - wrap with pulumi.secret() (optional - only for Let's Encrypt wildcard certs, set via ESC in CD)
}

/**
 * Namespace resource quota configuration
 */
export interface ResourceQuotaConfig {
    cpu: string;
    memory: string;
    pods: string;
}

/**
 * Namespace network policy configuration
 * Optional - not currently used in any stacks
 */
export interface NetworkPolicyConfig {
    allowDNS: boolean;
    allowHTTPS: boolean;
    allowPostgreSQL?: {
        host: string;
        port: number;
    };
}

/**
 * Image pull secret configuration for GHCR
 */
export interface ImagePullSecretConfig {
    registry: string;
    username: string; // Secret - wrap with pulumi.secret()
    token: string; // Secret - wrap with pulumi.secret()
}

/**
 * Namespace configuration (preview-pr only)
 */
export interface NamespaceConfig {
    name: string;
    resourceQuota?: ResourceQuotaConfig;
    networkPolicy?: NetworkPolicyConfig;
    imagePullSecret?: ImagePullSecretConfig;
}

/**
 * Monitoring namespace configuration
 */
export interface MonitoringConfig {
    namespace: {
        resourceQuota: ResourceQuotaConfig;
    };
}

/**
 * Prometheus Operator configuration
 */
export interface PrometheusOperatorConfig {
    resources: ResourceRequirements;
    configReloader: ResourceRequirements;
}

/**
 * Node exporter configuration
 */
export interface NodeExporterConfig {
    resources: ResourceRequirements;
}

/**
 * kube-state-metrics configuration
 */
export interface KubeStateMetricsConfig {
    resources: ResourceRequirements;
}

/**
 * Prometheus configuration
 */
export interface PrometheusConfig {
    scrapeInterval: string;
    authToken: string; // Secret - wrap with pulumi.secret()
    storageSize: string;
    retentionTime: string;
    resources: ResourceRequirements;
    operator: PrometheusOperatorConfig;
    nodeExporter: NodeExporterConfig;
    kubeStateMetrics: KubeStateMetricsConfig;
}

/**
 * Grafana basic auth configuration (preview only)
 */
export interface GrafanaBasicAuthConfig {
    user: string; // Secret - wrap with pulumi.secret()
    password: string; // Secret - wrap with pulumi.secret()
}

/**
 * Grafana configuration
 */
export interface GrafanaConfig {
    version: string;
    defaultReceiver: string;
    ingressSectionName: string;
    githubClientId: string;
    githubClientSecret: string; // Secret - wrap with pulumi.secret()
    githubOrg: string;
    adminUser: string;
    smtpHost?: string; // Secret - wrap with pulumi.secret() (optional - preview doesn't have)
    smtpPort?: number; // Optional - preview doesn't have
    smtpUser?: string; // Secret - wrap with pulumi.secret() (optional - preview doesn't have)
    smtpPassword?: string; // Secret - wrap with pulumi.secret() (optional - preview doesn't have)
    smtpFromAddress?: string; // Optional - preview doesn't have
    alertEmail?: string; // Optional - preview doesn't have
    basicAuth?: GrafanaBasicAuthConfig; // Optional - preview only
    storageSize: string;
    hostname: string;
    replicas: number;
    resources: ResourceRequirements;
}

/**
 * Utility type for creating deep partial types (all properties optional at all nesting levels)
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Configuration overrides structure
 *
 * Used for stack-specific config overrides via the 'overrides' key in Pulumi.{stack}.yaml
 * Each property is a deep partial of the corresponding config type, allowing selective
 * override of nested properties without duplicating the entire config object.
 */
export interface ConfigOverrides {
    cluster?: DeepPartial<ClusterConfig>;
    app?: DeepPartial<AppConfig>;
    postgresql?: DeepPartial<PostgreSQLConfig>;
    prometheus?: DeepPartial<PrometheusConfig>;
    grafana?: DeepPartial<GrafanaConfig>;
    gateway?: DeepPartial<GatewayConfig>;
    namespace?: DeepPartial<NamespaceConfig>;
    monitoring?: DeepPartial<MonitoringConfig>;
}
