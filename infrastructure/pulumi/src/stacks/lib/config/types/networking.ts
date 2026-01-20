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
