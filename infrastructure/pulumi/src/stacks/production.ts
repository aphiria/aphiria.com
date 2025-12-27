/**
 * Production Infrastructure Stack (DigitalOcean)
 * Single stack containing cluster + base infrastructure + applications (all long-lived).
 * Stack name: production
 */

import { createKubernetesCluster } from "../components";
import { createStack } from "./lib/stack-factory";
import { StackConfig } from "./lib/stack-config";

// Create the production Kubernetes cluster
const { provider: k8sProvider } = createKubernetesCluster({
    name: "aphiria-com-cluster",
    region: "nyc3",
    version: "1.34.1-do.2",
    nodeSize: "s-2vcpu-2gb",
    nodeCount: 1,
    autoScale: true,
    minNodes: 1,
    maxNodes: 3,
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
});

const stackConfig = new StackConfig("https://www.aphiria.com", "https://api.aphiria.com");

createStack(
    {
        env: "production",
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
            domains: ["aphiria.com", "*.aphiria.com"],
            dnsToken: stackConfig.certManager.dnsToken,
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
            webUrl: stackConfig.urls.web,
            apiUrl: stackConfig.urls.api,
            webImage: stackConfig.images.web,
            apiImage: stackConfig.images.api,
            cookieDomain: ".aphiria.com",
            webPodDisruptionBudget: { minAvailable: 1 },
            apiPodDisruptionBudget: { minAvailable: 1 },
        },
    },
    k8sProvider
);
