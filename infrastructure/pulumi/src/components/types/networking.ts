import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

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
