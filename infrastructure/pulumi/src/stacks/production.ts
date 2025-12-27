/**
 * Production Infrastructure Stack (DigitalOcean)
 * Single stack containing cluster + base infrastructure + applications (all long-lived).
 * Stack name: production
 */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createKubernetesCluster } from "../components";
import { createStack } from "../shared/factory";

const config = new pulumi.Config();

// Create production Kubernetes cluster
const { cluster, kubeconfig: clusterKubeconfig } = createKubernetesCluster({
    name: "aphiria-com-cluster",
    region: "nyc3",
    version: "1.34.1-do.0",
    nodeSize: "s-2vcpu-2gb",
    nodeCount: 1,
    autoScale: true,
    minNodes: 1,
    maxNodes: 3,
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
});

// Create Kubernetes provider using the cluster's kubeconfig
const k8sProvider = new k8s.Provider(
    "production-k8s",
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
const webImageDigest = config.require("webImageDigest");
const apiImageDigest = config.require("apiImageDigest");
const ghcrUsername = ghcrConfig.require("username");
const ghcrToken = ghcrConfig.requireSecret("token");
const webImageRef = `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`;
const apiImageRef = `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`;

const postgresqlUser = postgresqlConfig.require("user");
const postgresqlPassword = postgresqlConfig.requireSecret("password");

// Naming conventions
const webUrl = "https://www.aphiria.com";
const apiUrl = "https://api.aphiria.com";

createStack(
    {
        env: "production",
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
            dbUser: postgresqlUser,
            dbPassword: postgresqlPassword,
        },
        gateway: {
            tlsMode: "letsencrypt-prod",
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: certmanagerConfig.requireSecret("digitaloceanDnsToken"),
            dns: {
                domain: "aphiria.com",
                records: [
                    { name: "@", resourceName: "production-root-dns" },
                    { name: "www", resourceName: "production-www-dns" },
                    { name: "api", resourceName: "production-api-dns" },
                ],
                ttl: 300,
            },
        },
        app: {
            webReplicas: 2,
            apiReplicas: 2,
            webUrl: webUrl,
            apiUrl: apiUrl,
            webImage: webImageRef,
            apiImage: apiImageRef,
            cookieDomain: ".aphiria.com",
            webPodDisruptionBudget: { minAvailable: 1 },
            apiPodDisruptionBudget: { minAvailable: 1 },
        },
    },
    k8sProvider
);
