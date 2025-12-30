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
const kubeconfig = baseStack.requireOutput("kubeconfig");

// Naming conventions
const namespaceName = `preview-pr-${prNumber}`;
const databaseName = `aphiria_pr_${prNumber}`;

// Create the Kubernetes provider using kubeconfig from the base stack
const k8sProvider = new k8s.Provider(
    `${namespaceName}-k8s`,
    {
        kubeconfig: kubeconfig,
        enableServerSideApply: true,
    },
    {
        dependsOn: [baseStack],
    }
);

createStack(
    {
        env: "preview",
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
        },
        gateway: {
            tlsMode: "letsencrypt-prod",
            domains: ["*.pr.aphiria.com", "*.pr-api.aphiria.com"],
        },
        app: {
            webReplicas: 1,
            apiReplicas: 1,
            webUrl: stackConfig.urls.web,
            apiUrl: stackConfig.urls.api,
            webImage: stackConfig.images.web,
            apiImage: stackConfig.images.api,
            cookieDomain: ".pr.aphiria.com",
            webResources: {
                requests: { cpu: "50m", memory: "128Mi" },
                limits: { cpu: "250m", memory: "512Mi" },
            },
            apiResources: {
                nginx: {
                    requests: { cpu: "50m", memory: "64Mi" },
                    limits: { cpu: "100m", memory: "128Mi" },
                },
                php: {
                    requests: { cpu: "250m", memory: "512Mi" },
                    limits: { cpu: "500m", memory: "1Gi" },
                },
                initContainer: {
                    requests: { cpu: "50m", memory: "64Mi" },
                    limits: { cpu: "100m", memory: "128Mi" },
                },
            },
            migrationResources: {
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
        monitoring: {
            prometheus: {
                storageSize: "5Gi",
                scrapeInterval: "15s",
                retentionTime: "7d",
                resources: {
                    requests: { cpu: "100m", memory: "512Mi" },
                    limits: { cpu: "500m", memory: "2Gi" },
                },
            },
            grafana: {
                storageSize: "2Gi",
                hostname: `${prNumber}.pr-grafana.aphiria.com`,
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
                resources: {
                    requests: { cpu: "50m", memory: "256Mi" },
                    limits: { cpu: "200m", memory: "512Mi" },
                },
            },
        },
    },
    k8sProvider
);
