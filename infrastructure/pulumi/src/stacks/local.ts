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
        },
        gateway: {
            tlsMode: "self-signed",
            domains: ["aphiria.com", "*.aphiria.com"],
        },
        app: {
            webReplicas: 1,
            apiReplicas: 1,
            webUrl: stackConfig.urls.web,
            apiUrl: stackConfig.urls.api,
            webImage: "aphiria.com-web:latest",
            apiImage: "aphiria.com-api:latest",
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
