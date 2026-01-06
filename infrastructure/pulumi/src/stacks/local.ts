/**
 * Local Stack (Minikube local development environment)
 * Stack name: local
 */

import * as k8s from "@pulumi/kubernetes";
import { createStack } from "./lib/stack-factory";
import { StackConfig } from "./lib/stack-config";

// Minikube provider (default kubeconfig)
const k8sProvider = new k8s.Provider("aphiria-com-local-k8s", {
    context: "minikube",
    // Disable SSA to prevent field manager conflicts between deployments
    enableServerSideApply: false,
});

const stackConfig = new StackConfig("https://www.aphiria.com", "https://api.aphiria.com");

createStack(
    {
        env: "local",
        database: {
            persistentStorage: true,
            storageSize: "5Gi",
            dbUser: "postgres",
            dbPassword: "postgres",
            resources: {
                // PostgreSQL 16 needs 512Mi to initialize (shared buffers, background processes)
                // Once running, it uses ~21Mi RSS for this small database (7.5MB data)
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "200m", memory: "512Mi" },
            },
        },
        gateway: {
            tlsMode: "self-signed",
            domains: ["aphiria.com", "*.aphiria.com"],
        },
        app: {
            web: {
                replicas: 1,
                url: stackConfig.urls.web,
                image: "aphiria.com-web:latest",
                resources: {
                    requests: { cpu: "50m", memory: "64Mi" },
                    limits: { cpu: "100m", memory: "128Mi" },
                },
            },
            api: {
                replicas: 1,
                url: stackConfig.urls.api,
                image: "aphiria.com-api:latest",
                resources: {
                    initContainer: {
                        requests: { cpu: "50m", memory: "64Mi" },
                        limits: { cpu: "100m", memory: "128Mi" },
                    },
                    nginx: {
                        requests: { cpu: "50m", memory: "64Mi" },
                        limits: { cpu: "100m", memory: "128Mi" },
                    },
                    php: {
                        requests: { cpu: "100m", memory: "128Mi" },
                        limits: { cpu: "200m", memory: "256Mi" },
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
            cookieDomain: ".aphiria.com",
        },
        monitoring: {
            prometheus: {
                authToken: stackConfig.prometheus.authToken,
                storageSize: "2Gi",
                scrapeInterval: "15s",
                retentionTime: "7d",
            },
            grafana: {
                storageSize: "1Gi",
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
