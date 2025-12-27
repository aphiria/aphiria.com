import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

/**
 * DNS record configuration
 */
export interface DNSRecordConfig {
    /** Subdomain or wildcard (e.g., "@", "www", "api", "*.pr") */
    name: string;
    /** Pulumi resource name (e.g., "production-www-dns") */
    resourceName: string;
}

/**
 * Arguments for creating DNS records
 */
export interface CreateDNSRecordsArgs {
    /** Domain name (e.g., "aphiria.com") */
    domain: string;
    /** LoadBalancer IP address from Gateway Service */
    loadBalancerIp: pulumi.Input<string>;
    /** DNS records to create */
    records: DNSRecordConfig[];
    /** TTL in seconds (default: 300) */
    ttl?: number;
}

/**
 * Result from creating DNS records
 */
export interface CreateDNSRecordsResult {
    records: digitalocean.DnsRecord[];
}

/**
 * Creates DigitalOcean DNS A records pointing to a LoadBalancer IP
 *
 * @example Production domains
 * ```typescript
 * createDNSRecords({
 *   domain: "aphiria.com",
 *   loadBalancerIp: gatewayService.status.loadBalancer.ingress[0].ip,
 *   records: [
 *     { name: "@", resourceName: "production-root-dns" },
 *     { name: "www", resourceName: "production-www-dns" },
 *     { name: "api", resourceName: "production-api-dns" },
 *   ],
 * });
 * ```
 *
 * @example Preview wildcard domains
 * ```typescript
 * createDNSRecords({
 *   domain: "aphiria.com",
 *   loadBalancerIp: gatewayService.status.loadBalancer.ingress[0].ip,
 *   records: [
 *     { name: "*.pr", resourceName: "preview-web-dns" },
 *     { name: "*.pr-api", resourceName: "preview-api-dns" },
 *   ],
 * });
 * ```
 */
export function createDNSRecords(args: CreateDNSRecordsArgs): CreateDNSRecordsResult {
    const records = args.records.map(
        (recordConfig) =>
            new digitalocean.DnsRecord(recordConfig.resourceName, {
                domain: args.domain,
                type: "A",
                name: recordConfig.name,
                value: args.loadBalancerIp,
                ttl: args.ttl || 300,
            })
    );

    return { records };
}
