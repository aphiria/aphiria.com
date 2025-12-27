/**
 * Base Infrastructure Stack for Preview Environments (DigitalOcean)
 * This stack creates its own dedicated cluster for complete isolation from production.
 * Stack name: preview-base
 */

import * as pulumi from "@pulumi/pulumi";
import { createKubernetesCluster } from "../components";
import { createStack } from "./lib/stack-factory";
import { StackConfig } from "./lib/stack-config";

// Create the preview Kubernetes cluster (includes provider)
const { kubeconfig: clusterKubeconfig, provider: k8sProvider } = createKubernetesCluster({
    name: "aphiria-com-preview-cluster",
    region: "nyc3",
    version: "1.34.1-do.2",
    nodeSize: "s-2vcpu-2gb",
    nodeCount: 1,
    autoScale: true,
    minNodes: 1,
    maxNodes: 3,
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
});

const stackConfig = new StackConfig("", "");

// Export these for preview-pr consumption
const postgresqlAdminUser = stackConfig.postgresql.user;
const postgresqlAdminPassword = stackConfig.postgresql.password;

const stack = createStack(
    {
        env: "preview",
        namespace: {
            name: "default",
            imagePullSecret: {
                registry: "ghcr.io",
                username: stackConfig.ghcr.username,
                token: stackConfig.ghcr.token,
            },
        },
        database: {
            persistentStorage: true,
            storageSize: "20Gi",
            dbUser: stackConfig.postgresql.user,
            dbPassword: stackConfig.postgresql.password,
        },
        gateway: {
            tlsMode: "letsencrypt-prod",
            domains: [
                "*.pr.aphiria.com", // Web preview URLs
                "*.pr-api.aphiria.com", // API preview URLs
            ],
            dnsToken: stackConfig.certManager.dnsToken,
            dns: {
                domain: "aphiria.com",
                records: [
                    { name: "*.pr", resourceName: "preview-web-dns" },
                    { name: "*.pr-api", resourceName: "preview-api-dns" },
                ],
                ttl: 300,
            },
        },
        // No app config - preview-base is infrastructure only
    },
    k8sProvider
);

// Outputs (consumed by preview-pr via StackReference and cleanup-preview.yml workflow)
if (!stack.namespace) throw new Error("Preview-base stack must create namespace");

export const kubeconfig = pulumi.secret(clusterKubeconfig);
export const postgresqlHost = pulumi.interpolate`db.${stack.namespace.namespace.metadata.name}.svc.cluster.local`;
export { postgresqlAdminUser, postgresqlAdminPassword };
