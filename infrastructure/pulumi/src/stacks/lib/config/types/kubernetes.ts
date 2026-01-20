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
