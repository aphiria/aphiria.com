/**
 * Base Infrastructure Stack for Preview Environments (DigitalOcean)
 * This stack creates its own dedicated cluster for complete isolation from production.
 * Stack name: preview-base
 */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createKubernetesCluster } from "../components";
import { createStack } from "../shared/factory";

// Create a dedicated preview Kubernetes cluster
const { cluster, kubeconfig: clusterKubeconfig } = createKubernetesCluster({
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

// Create a Kubernetes provider using the cluster's kubeconfig
const k8sProvider = new k8s.Provider(
    "preview-k8s",
    {
        kubeconfig: clusterKubeconfig,
        enableServerSideApply: true,
    },
    {
        dependsOn: [cluster],
    }
);

// Get configuration
const postgresqlConfig = new pulumi.Config("postgresql");
const certmanagerConfig = new pulumi.Config("certmanager");
const ghcrConfig = new pulumi.Config("ghcr");

const postgresqlAdminUser = postgresqlConfig.require("user");
const postgresqlAdminPassword = postgresqlConfig.requireSecret("password");
const ghcrUsername = ghcrConfig.require("username");
const ghcrToken = ghcrConfig.requireSecret("token");

// Create base infrastructure using factory (no app deployment)
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

// Outputs
export const clusterId = cluster.id;
export const clusterEndpoint = cluster.endpoint;
export const kubeconfig = pulumi.secret(clusterKubeconfig);
export const postgresqlHost = "db.default.svc.cluster.local";
export const postgresqlPort = 5432;
export { postgresqlAdminUser, postgresqlAdminPassword };
export const gatewayName = "nginx-gateway";
export const gatewayNamespace = "nginx-gateway";
export const gatewayIP = stack.gatewayIP;
export const namespace = "default";
