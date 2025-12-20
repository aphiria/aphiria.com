import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { GatewayArgs, GatewayResult } from "./types";

/** Creates Gateway with TLS (self-signed/letsencrypt-staging/letsencrypt-prod) and separate listeners for root/subdomains */
export function createGateway(args: GatewayArgs): GatewayResult {
    const labels = {
        "app.kubernetes.io/name": args.name,
        "app.kubernetes.io/component": "gateway",
        ...(args.labels || {}),
    };

    // Create ClusterIssuer for cert-manager (if using Let's Encrypt)
    let certificate: k8s.apiextensions.CustomResource | undefined;

    if (args.tlsMode !== "self-signed") {
        const issuerName = args.tlsMode === "letsencrypt-prod" ? "letsencrypt-prod" : "letsencrypt-staging";
        const acmeServer =
            args.tlsMode === "letsencrypt-prod"
                ? "https://acme-v02.api.letsencrypt.org/directory"
                : "https://acme-staging-v02.api.letsencrypt.org/directory";

        // Create ClusterIssuer for Let's Encrypt
        const clusterIssuer = new k8s.apiextensions.CustomResource("cert-issuer", {
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
                    solvers: [
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
        });

        certificate = clusterIssuer;
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
                              "cert-manager.io/cluster-issuer":
                                  args.tlsMode === "letsencrypt-prod" ? "letsencrypt-prod" : "letsencrypt-staging",
                          }
                        : undefined,
            },
            spec: {
                gatewayClassName: "nginx",
                listeners: [
                    // HTTP listener for root domain (aphiria.com)
                    {
                        name: "http-root",
                        hostname: args.domains.find((d) => !d.startsWith("*")) || "aphiria.com",
                        port: 80,
                        protocol: "HTTP",
                        allowedRoutes: {
                            namespaces: {
                                from: "All",
                            },
                        },
                    },
                    // HTTP listener for subdomains (*.aphiria.com)
                    {
                        name: "http-subdomains",
                        hostname: args.domains.find((d) => d.startsWith("*")) || "*.aphiria.com",
                        port: 80,
                        protocol: "HTTP",
                        allowedRoutes: {
                            namespaces: {
                                from: "All",
                            },
                        },
                    },
                    // HTTPS listener for root domain
                    {
                        name: "https-root",
                        hostname: args.domains.find((d) => !d.startsWith("*")) || "aphiria.com",
                        port: 443,
                        protocol: "HTTPS",
                        allowedRoutes: {
                            namespaces: {
                                from: "All",
                            },
                        },
                        tls: {
                            mode: "Terminate",
                            certificateRefs: [
                                {
                                    name: "tls-cert",
                                },
                            ],
                        },
                    },
                    // HTTPS listener for subdomains (*.aphiria.com)
                    {
                        name: "https-subdomains",
                        hostname: args.domains.find((d) => d.startsWith("*")) || "*.aphiria.com",
                        port: 443,
                        protocol: "HTTPS",
                        allowedRoutes: {
                            namespaces: {
                                from: "All",
                            },
                        },
                        tls: {
                            mode: "Terminate",
                            certificateRefs: [
                                {
                                    name: "tls-cert",
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            dependsOn: certificate ? [certificate] : [],
        }
    );

    return {
        gateway: gateway.urn.apply((urn) => ({ urn })),
        certificate: certificate ? certificate.urn.apply((urn) => ({ urn })) : undefined,
    };
}

/** Creates self-signed TLS certificate (dev-local only) */
export interface SelfSignedCertArgs {
    namespace: pulumi.Input<string>;
    domains: string[];
}

export function createSelfSignedCert(args: SelfSignedCertArgs): k8s.apiextensions.CustomResource {
    return new k8s.apiextensions.CustomResource("tls-cert", {
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
    });
}

/** Creates self-signed ClusterIssuer (required for self-signed certs) */
export function createSelfSignedIssuer(): k8s.apiextensions.CustomResource {
    return new k8s.apiextensions.CustomResource("selfsigned-issuer", {
        apiVersion: "cert-manager.io/v1",
        kind: "ClusterIssuer",
        metadata: {
            name: "selfsigned-issuer",
        },
        spec: {
            selfSigned: {},
        },
    });
}
