/**
 * Base Infrastructure Stack for Preview Environments (DigitalOcean)
 * This stack creates its own dedicated cluster for complete isolation from production.
 * Stack name: preview-base
 */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createKubernetesCluster } from "../components";
import { createStack } from "../shared/factory";

// Create the preview Kubernetes cluster (includes provider)
const { cluster, kubeconfig: clusterKubeconfig, provider: k8sProvider } = createKubernetesCluster({
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

// Get configuration
const postgresqlConfig = new pulumi.Config("postgresql");
const certmanagerConfig = new pulumi.Config("certmanager");
const ghcrConfig = new pulumi.Config("ghcr");

const postgresqlAdminUser = postgresqlConfig.require("user");
const postgresqlAdminPassword = postgresqlConfig.requireSecret("password");
const ghcrUsername = ghcrConfig.require("username");
const ghcrToken = ghcrConfig.requireSecret("token");

const stack = createStack(
    {
        env: "preview",
        namespace: {
            name: "default",
            imagePullSecret: {
                registry: "ghcr.io",
                username: ghcrUsername,
                token: ghcrToken,
            },
        },
        database: {
            persistentStorage: true,
            storageSize: "20Gi",
            dbUser: postgresqlAdminUser,
            dbPassword: postgresqlAdminPassword,
        },
        gateway: {
            tlsMode: "letsencrypt-prod",
            domains: [
                "*.pr.aphiria.com", // Web preview URLs
                "*.pr-api.aphiria.com", // API preview URLs
            ],
            dnsToken: certmanagerConfig.requireSecret("digitaloceanDnsToken"),
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
