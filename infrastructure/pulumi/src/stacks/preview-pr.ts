/**
 * Preview PR Stack (DigitalOcean)
 * Stack name pattern: preview-pr-{PR_NUMBER}
 * Preview URLs: {PR}.pr.aphiria.com (web), {PR}.pr-api.aphiria.com (api)
 */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createStack } from "./lib/stack-factory";
import { StackConfig } from "./lib/stack-config";

const prNumber = new pulumi.Config().requireNumber("prNumber");
const stackConfig = new StackConfig(
    `https://${prNumber}.pr.aphiria.com`,
    `https://${prNumber}.pr-api.aphiria.com`
);

// Reference base stack outputs
const baseStack = new pulumi.StackReference(stackConfig.baseStackReference);
const postgresqlHost = baseStack.getOutput("postgresqlHost");
const postgresqlAdminUser = baseStack.getOutput("postgresqlAdminUser");
const postgresqlAdminPassword = baseStack.requireOutput("postgresqlAdminPassword");
const prometheusAuthToken = baseStack.requireOutput("prometheusAuthToken");
const kubeconfig = baseStack.requireOutput("kubeconfig");

// Naming conventions
const namespaceName = `preview-pr-${prNumber}`;
const databaseName = `aphiria_pr_${prNumber}`;

// Create the Kubernetes provider using kubeconfig from the base stack
const k8sProvider = new k8s.Provider(
    `${namespaceName}-k8s`,
    {
        kubeconfig: kubeconfig,
        // Disable SSA to prevent field manager conflicts between deployments
        // SSA field manager IDs change when provider is recreated, causing conflicts
        enableServerSideApply: false,
    },
    {
        dependsOn: [baseStack],
    }
);

createStack(
    {
        env: "preview",
        prometheusAuthToken: prometheusAuthToken,
        skipBaseInfrastructure: true, // Uses shared Helm charts and Gateway from preview-base
        namespace: {
            name: namespaceName,
            resourceQuota: {
                cpu: "2",
                memory: "4Gi",
                pods: "5",
            },
            networkPolicy: {
                allowDNS: true,
                allowHTTPS: true,
                allowPostgreSQL: {
                    host: "db.default.svc.cluster.local",
                    port: 5432,
                },
            },
            imagePullSecret: {
                registry: "ghcr.io",
                username: stackConfig.ghcr.username,
                token: stackConfig.ghcr.token,
            },
        },
        database: {
            persistentStorage: false,
            storageSize: "1Gi",
            dbUser: postgresqlAdminUser,
            dbPassword: postgresqlAdminPassword,
            createDatabase: true,
            databaseName: databaseName,
            dbHost: postgresqlHost,
            dbAdminUser: postgresqlAdminUser,
            dbAdminPassword: postgresqlAdminPassword,
            // Unused (preview uses shared DB from preview-base), but required by type
            resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "200m", memory: "256Mi" },
            },
        },
        gateway: {
            tlsMode: "letsencrypt-prod",
            domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
        },
        app: {
            web: {
                replicas: 1,
                url: stackConfig.urls.web,
                image: stackConfig.images.web,
                resources: {
                    requests: { cpu: "50m", memory: "64Mi" },
                    limits: { cpu: "100m", memory: "128Mi" },
                },
            },
            api: {
                replicas: 1,
                url: stackConfig.urls.api,
                image: stackConfig.images.api,
                resources: {
                    nginx: {
                        requests: { cpu: "50m", memory: "64Mi" },
                        limits: { cpu: "100m", memory: "128Mi" },
                    },
                    php: {
                        requests: { cpu: "100m", memory: "128Mi" },
                        limits: { cpu: "200m", memory: "256Mi" },
                    },
                    initContainer: {
                        requests: { cpu: "50m", memory: "64Mi" },
                        limits: { cpu: "100m", memory: "128Mi" },
                    },
                },
            },
            migration: {
                resources: {
                    migration: {
                        requests: { cpu: "50m", memory: "128Mi" },
                        limits: { cpu: "200m", memory: "256Mi" },
                    },
                    initContainer: {
                        requests: { cpu: "10m", memory: "32Mi" },
                        limits: { cpu: "50m", memory: "64Mi" },
                    },
                },
            },
            cookieDomain: ".pr.aphiria.com",
        },
    },
    k8sProvider
);
