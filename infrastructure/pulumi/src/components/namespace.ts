import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { NamespaceArgs, NamespaceResult } from "./types";

/**
 * Creates a Kubernetes namespace with optional ResourceQuota, NetworkPolicy, and ImagePullSecret
 */
export function createNamespace(args: NamespaceArgs): NamespaceResult {
    const labels = {
        "app.kubernetes.io/name": "aphiria",
        "app.kubernetes.io/environment": args.env,
        ...(args.labels || {}),
    };

    // Create Namespace
    const namespace = new k8s.core.v1.Namespace(
        args.name,
        {
            metadata: {
                name: args.name,
                labels,
            },
        },
        { provider: args.provider }
    );

    // Create ResourceQuota (if specified)
    let resourceQuota: k8s.core.v1.ResourceQuota | undefined;
    if (args.resourceQuota) {
        resourceQuota = new k8s.core.v1.ResourceQuota(
            `${args.name}-quota`,
            {
                metadata: {
                    name: `${args.name}-quota`,
                    namespace: namespace.metadata.name,
                    labels,
                },
                spec: {
                    hard: {
                        "requests.cpu": args.resourceQuota.cpu,
                        "requests.memory": args.resourceQuota.memory,
                        "limits.cpu": args.resourceQuota.cpu,
                        "limits.memory": args.resourceQuota.memory,
                        pods: args.resourceQuota.pods,
                    },
                },
            },
            { provider: args.provider, parent: namespace }
        );
    }

    // Create NetworkPolicy (if specified)
    let networkPolicy: k8s.networking.v1.NetworkPolicy | undefined;
    if (args.networkPolicy) {
        const egressRules: any[] = [];

        // DNS egress (always required)
        if (args.networkPolicy.allowDNS) {
            egressRules.push({
                to: [
                    {
                        namespaceSelector: {
                            matchLabels: {
                                "kubernetes.io/metadata.name": "kube-system",
                            },
                        },
                        podSelector: {
                            matchLabels: {
                                "k8s-app": "kube-dns",
                            },
                        },
                    },
                ],
                ports: [
                    { protocol: "UDP", port: 53 },
                    { protocol: "TCP", port: 53 },
                ],
            });
        }

        // HTTPS egress (for external APIs, GHCR, etc.)
        if (args.networkPolicy.allowHTTPS) {
            egressRules.push({
                to: [{ ipBlock: { cidr: "0.0.0.0/0" } }],
                ports: [{ protocol: "TCP", port: 443 }],
            });
        }

        // PostgreSQL egress (if specified)
        if (args.networkPolicy.allowPostgreSQL) {
            egressRules.push({
                to: [
                    {
                        namespaceSelector: {
                            matchLabels: {
                                "kubernetes.io/metadata.name": "default",
                            },
                        },
                        podSelector: {
                            matchLabels: {
                                app: "db",
                            },
                        },
                    },
                ],
                ports: [
                    {
                        protocol: "TCP",
                        port: args.networkPolicy.allowPostgreSQL.port,
                    },
                ],
            });
        }

        networkPolicy = new k8s.networking.v1.NetworkPolicy(
            `${args.name}-network-policy`,
            {
                metadata: {
                    name: `${args.name}-network-policy`,
                    namespace: namespace.metadata.name,
                    labels,
                },
                spec: {
                    podSelector: {}, // Apply to all pods in namespace
                    policyTypes: ["Ingress", "Egress"],
                    ingress: [
                        {
                            from: [
                                {
                                    namespaceSelector: {
                                        matchLabels: {
                                            "kubernetes.io/metadata.name": "nginx-gateway",
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                    egress: egressRules,
                },
            },
            { provider: args.provider, parent: namespace }
        );
    }

    // Create ImagePullSecret (if specified)
    let imagePullSecret: k8s.core.v1.Secret | undefined;
    if (args.imagePullSecret) {
        imagePullSecret = new k8s.core.v1.Secret(
            "ghcr-pull-secret",
            {
                metadata: {
                    name: "ghcr-pull-secret",
                    namespace: namespace.metadata.name,
                    labels,
                },
                type: "kubernetes.io/dockerconfigjson",
                stringData: {
                    ".dockerconfigjson": pulumi.interpolate`{"auths":{"${args.imagePullSecret.registry}":{"username":"${args.imagePullSecret.username}","password":"${args.imagePullSecret.token}"}}}`,
                },
            },
            { provider: args.provider, parent: namespace }
        );
    }

    return {
        namespace,
        resourceQuota,
        networkPolicy,
        imagePullSecret,
    };
}
