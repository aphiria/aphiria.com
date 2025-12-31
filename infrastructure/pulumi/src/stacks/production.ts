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
                    { name: "grafana", resourceName: "production-grafana-dns" },
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
        monitoring: {
            prometheus: {
                authToken: stackConfig.prometheus.authToken,
                storageSize: "10Gi",
                scrapeInterval: "15s",
                retentionTime: "7d",
                resources: {
                    requests: { cpu: "500m", memory: "1Gi" },
                    limits: { cpu: "1", memory: "2Gi" },
                },
            },
            grafana: {
                storageSize: "5Gi",
                hostname: "grafana.aphiria.com",
                githubOAuth: {
                    clientId: stackConfig.grafana.githubClientId,
                    clientSecret: stackConfig.grafana.githubClientSecret,
                    org: stackConfig.grafana.githubOrg,
                    adminUser: stackConfig.grafana.adminUser,
                },
                smtp: {
                    host: stackConfig.grafana.smtpHost,
                    port: stackConfig.grafana.smtpPort,
                    user: stackConfig.grafana.smtpUser,
                    password: stackConfig.grafana.smtpPassword,
                    fromAddress: stackConfig.grafana.smtpFromAddress,
                    alertEmail: stackConfig.grafana.alertEmail,
                },
            },
        },
    },
    k8sProvider
);
