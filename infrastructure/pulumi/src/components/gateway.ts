import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { GatewayResult } from "./types";

/**
 * Arguments for Gateway component
 */
export interface GatewayArgs {
    /** Whether to require both root and wildcard domains (production requirement) */
    requireRootAndWildcard: boolean;
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

/** Creates Gateway with TLS (self-signed or letsencrypt-prod) and separate listeners for root/subdomains */
export function createGateway(args: GatewayArgs): GatewayResult {
    // Validate domain requirements based on environment
    const rootDomain = args.domains.find((d) => !d.startsWith("*"));
    const wildcardDomains = args.domains.filter((d) => d.startsWith("*"));
    const wildcardDomain = wildcardDomains[0]; // Keep for backward compatibility with validation

    // Some environments require both root and wildcard domains
    if (args.requireRootAndWildcard) {
        if (!rootDomain) {
            throw new Error(
                `Gateway requires a root domain (non-wildcard). Provided domains: ${args.domains.join(", ")}`
            );
        }
        if (!wildcardDomain) {
            throw new Error(
                `Gateway requires a wildcard domain (e.g., *.example.com). Provided domains: ${args.domains.join(", ")}`
            );
        }
    } else {
        // Non-production: require at least one domain of any type
        if (args.domains.length === 0) {
            throw new Error("Gateway requires at least one domain");
        }
    }

    // Validate DNS-01 requirement for wildcard certificates
    if (wildcardDomain && args.tlsMode !== "self-signed" && !args.dnsToken) {
        throw new Error(
            `Wildcard domain "${wildcardDomain}" requires DNS-01 ACME challenge. ` +
                `You must provide dnsToken for DigitalOcean DNS API access. ` +
                `HTTP-01 challenge cannot validate wildcard certificates.`
        );
    }

    const labels = {
        "app.kubernetes.io/name": args.name,
        "app.kubernetes.io/component": "gateway",
        ...(args.labels || {}),
    };

    // Create ClusterIssuer and Certificate for cert-manager
    let certificate: k8s.apiextensions.CustomResource | undefined;

    if (args.tlsMode === "self-signed") {
        // Create self-signed issuer and certificate for dev-local
        const dependencies = args.certManagerDependency ? [args.certManagerDependency] : undefined;
        const issuer = createSelfSignedIssuer(args.provider, dependencies);
        certificate = createSelfSignedCert(
            {
                namespace: args.namespace,
                domains: args.domains,
            },
            args.provider,
            [issuer, ...(dependencies || [])]
        );
    } else {
        // letsencrypt-prod only (staging removed - not used in any stacks)
        const issuerName = "letsencrypt-prod";
        const acmeServer = "https://acme-v02.api.letsencrypt.org/directory";

        // Create Secret for DigitalOcean DNS token if provided (for DNS-01 challenges)
        if (args.dnsToken) {
            new k8s.core.v1.Secret(
                "digitalocean-dns-token",
                {
                    metadata: {
                        name: "digitalocean-dns-token",
                        namespace: "cert-manager",
                    },
                    stringData: {
                        "access-token": args.dnsToken,
                    },
                },
                { provider: args.provider }
            );
        }

        // Create ClusterIssuer for Let's Encrypt
        const dependencies = args.certManagerDependency ? [args.certManagerDependency] : undefined;
        const clusterIssuer = new k8s.apiextensions.CustomResource(
            "cert-issuer",
            {
                apiVersion: "cert-manager.io/v1",
                kind: "ClusterIssuer",
                metadata: {
                    name: issuerName,
                },
                spec: {
                    acme: {
                        server: acmeServer,
                        email: "admin@aphiria.com", // Update this email
                        privateKeySecretRef: {
                            name: `${issuerName}-account-key`,
                        },
                        solvers: args.dnsToken
                            ? [
                                  {
                                      dns01: {
                                          digitalocean: {
                                              tokenSecretRef: {
                                                  name: "digitalocean-dns-token",
                                                  key: "access-token",
                                              },
                                          },
                                      },
                                  },
                              ]
                            : [
                                  {
                                      http01: {
                                          gatewayHTTPRoute: {
                                              parentRefs: [
                                                  {
                                                      name: args.name,
                                                      namespace: args.namespace,
                                                      kind: "Gateway",
                                                  },
                                              ],
                                          },
                                      },
                                  },
                              ],
                    },
                },
            },
            { provider: args.provider, dependsOn: dependencies }
        );

        // Create Certificate resource for Let's Encrypt
        certificate = new k8s.apiextensions.CustomResource(
            "tls-cert",
            {
                apiVersion: "cert-manager.io/v1",
                kind: "Certificate",
                metadata: {
                    name: "tls-cert",
                    namespace: args.namespace,
                },
                spec: {
                    secretName: "tls-cert",
                    dnsNames: args.domains,
                    issuerRef: {
                        name: issuerName,
                        kind: "ClusterIssuer",
                    },
                },
            },
            { provider: args.provider, dependsOn: [clusterIssuer] }
        );
    }

    // Create Gateway
    const gateway = new k8s.apiextensions.CustomResource(
        args.name,
        {
            apiVersion: "gateway.networking.k8s.io/v1",
            kind: "Gateway",
            metadata: {
                name: args.name,
                namespace: args.namespace,
                labels,
                annotations:
                    args.tlsMode !== "self-signed"
                        ? {
                              "cert-manager.io/cluster-issuer": "letsencrypt-prod",
                          }
                        : undefined,
            },
            spec: {
                gatewayClassName: "nginx",
                listeners: [
                    // HTTP listeners - conditionally include based on available domains
                    ...(rootDomain
                        ? [
                              {
                                  name: "http-root",
                                  hostname: rootDomain,
                                  port: 80,
                                  protocol: "HTTP" as const,
                                  allowedRoutes: {
                                      namespaces: {
                                          from: "All" as const,
                                      },
                                  },
                              },
                          ]
                        : []),
                    // Create HTTP listener for EACH wildcard domain
                    ...wildcardDomains.map((domain, index) => ({
                        name:
                            wildcardDomains.length === 1
                                ? "http-subdomains"
                                : `http-subdomains-${index + 1}`,
                        hostname: domain,
                        port: 80,
                        protocol: "HTTP" as const,
                        allowedRoutes: {
                            namespaces: {
                                from: "All" as const,
                            },
                        },
                    })),
                    // HTTPS listeners - conditionally include based on available domains
                    ...(rootDomain
                        ? [
                              {
                                  name: "https-root",
                                  hostname: rootDomain,
                                  port: 443,
                                  protocol: "HTTPS" as const,
                                  allowedRoutes: {
                                      namespaces: {
                                          from: "All" as const,
                                      },
                                  },
                                  tls: {
                                      mode: "Terminate" as const,
                                      certificateRefs: [
                                          {
                                              name: "tls-cert",
                                          },
                                      ],
                                  },
                              },
                          ]
                        : []),
                    // Create HTTPS listener for EACH wildcard domain
                    ...wildcardDomains.map((domain, index) => ({
                        name:
                            wildcardDomains.length === 1
                                ? "https-subdomains"
                                : `https-subdomains-${index + 1}`,
                        hostname: domain,
                        port: 443,
                        protocol: "HTTPS" as const,
                        allowedRoutes: {
                            namespaces: {
                                from: "All" as const,
                            },
                        },
                        tls: {
                            mode: "Terminate" as const,
                            certificateRefs: [
                                {
                                    name: "tls-cert",
                                },
                            ],
                        },
                    })),
                ],
            },
        },
        {
            /* istanbul ignore next - certificate dependency varies by environment */
            dependsOn: certificate ? [certificate] : [],
            provider: args.provider,
        }
    );

    return {
        name: gateway.metadata.name,
        namespace: gateway.metadata.namespace,
        urn: gateway.urn,
        /* istanbul ignore next - certificate presence varies by environment */
        certificate: certificate ? certificate.urn : undefined,
    };
}

/** Creates self-signed TLS certificate (dev-local only) */
export interface SelfSignedCertArgs {
    namespace: pulumi.Input<string>;
    domains: string[];
}

export function createSelfSignedCert(
    args: SelfSignedCertArgs,
    provider: k8s.Provider,
    dependsOn?: pulumi.Resource[]
): k8s.apiextensions.CustomResource {
    return new k8s.apiextensions.CustomResource(
        "tls-cert",
        {
            apiVersion: "cert-manager.io/v1",
            kind: "Certificate",
            metadata: {
                name: "tls-cert",
                namespace: args.namespace,
            },
            spec: {
                secretName: "tls-cert",
                dnsNames: args.domains,
                issuerRef: {
                    name: "selfsigned-issuer",
                    kind: "ClusterIssuer",
                },
            },
        },
        { provider, dependsOn }
    );
}

/** Creates self-signed ClusterIssuer (required for self-signed certs) */
export function createSelfSignedIssuer(
    provider: k8s.Provider,
    dependsOn?: pulumi.Resource[]
): k8s.apiextensions.CustomResource {
    return new k8s.apiextensions.CustomResource(
        "selfsigned-issuer",
        {
            apiVersion: "cert-manager.io/v1",
            kind: "ClusterIssuer",
            metadata: {
                name: "selfsigned-issuer",
            },
            spec: {
                selfSigned: {},
            },
        },
        { provider, dependsOn }
    );
}
