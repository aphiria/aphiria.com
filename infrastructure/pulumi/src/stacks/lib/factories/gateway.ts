import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { Environment } from "../types";
import { createGateway, createDNSRecords } from "../../../components";
import { GatewayResult } from "../../../components/types";
import { BaseInfrastructureResources } from "./base-infrastructure";

/**
 * Gateway resources
 */
export interface GatewayResources {
    gateway: GatewayResult;
}

/**
 * Arguments for creating gateway resources
 */
export interface GatewayResourcesArgs {
    env: Environment;
    provider: k8s.Provider;
    baseInfrastructure?: BaseInfrastructureResources;
}

/**
 * Creates gateway resources (Gateway with TLS, DNS records)
 *
 * This factory handles:
 * - Gateway creation with TLS (self-signed for local, Let's Encrypt for production)
 * - DNS record creation (if configured)
 * - LoadBalancer IP extraction from nginx-gateway Chart resources
 *
 * @param args Gateway resources configuration
 * @returns Gateway resources
 */
export function createGatewayResources(args: GatewayResourcesArgs): GatewayResources {
    const { env, provider, baseInfrastructure } = args;

    // Read configuration
    const gatewayConfig = new pulumi.Config("gateway");
    const certManagerConfig = new pulumi.Config("certmanager");

    const gatewayNamespace = "nginx-gateway";
    const dnsToken = certManagerConfig.getSecret("digitaloceanDnsToken");

    const gateway = createGateway({
        requireRootAndWildcard: env === "production",
        namespace: gatewayNamespace,
        name: "nginx-gateway",
        tlsMode: gatewayConfig.require("tlsMode") as "self-signed" | "letsencrypt-prod",
        domains: gatewayConfig.requireObject<string[]>("domains"),
        dnsToken: dnsToken,
        provider,
        // Ensure cert-manager CRDs are ready before creating ClusterIssuer/Certificate
        certManagerDependency: baseInfrastructure?.helmCharts.certManager,
    });

    // Create DNS records if configured
    // Fetch LoadBalancer IP from nginx-gateway Chart resources
    /* istanbul ignore next - Chart.resources is only populated at runtime, cannot be mocked in unit tests */
    const dnsConfig = gatewayConfig.getObject("dns");
    if (dnsConfig && baseInfrastructure?.helmCharts.nginxGateway) {
        // Workaround for Pulumi bug #16395: Service.get() doesn't respect dependsOn
        // Use Chart v4's .resources output to get the Service directly from child resources
        const gatewayServiceOutput = baseInfrastructure.helmCharts.nginxGateway.resources.apply(
            (chartResources) => {
                const service = chartResources.find(
                    (r) =>
                        r.__pulumiType === "kubernetes:core/v1:Service" &&
                        r.__name === "nginx-gateway:nginx-gateway/nginx-gateway-nginx-gateway-fabric"
                );
                if (!service) {
                    throw new Error("Could not find nginx-gateway Service in Chart resources");
                }
                return service as k8s.core.v1.Service;
            }
        );

        gateway.ip = gatewayServiceOutput.status.loadBalancer.ingress[0].ip;

        // Type the DNS config properly
        interface DNSConfig {
            domain: string;
            records: Array<{
                name: string;
                resourceName: string;
            }>;
            ttl?: number;
        }

        const typedDnsConfig = dnsConfig as DNSConfig;
        if (!gateway.ip) {
            throw new Error("Gateway IP is required for DNS configuration but was not set");
        }
        const dnsResult = createDNSRecords({
            domain: typedDnsConfig.domain,
            loadBalancerIp: gateway.ip,
            records: typedDnsConfig.records,
            ttl: typedDnsConfig.ttl,
        });
        gateway.dnsRecords = dnsResult.records;
    }

    return { gateway };
}
