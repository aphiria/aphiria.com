/**
 * Preview PR Stack (DigitalOcean)
 * Stack name pattern: preview-pr-{PR_NUMBER}
 * Preview URLs: {PR}.pr.aphiria.com (web), {PR}.pr-api.aphiria.com (api)
 */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createStack } from "../shared/factory";

// Configuration
const config = new pulumi.Config();
const ghcrConfig = new pulumi.Config("ghcr");
const prNumber = config.requireNumber("prNumber");
const webImageDigest = config.require("webImageDigest");
const apiImageDigest = config.require("apiImageDigest");
const baseStackRef = config.get("baseStackReference") || "davidbyoung/aphiria-com-infrastructure/preview-base";
const ghcrUsername = ghcrConfig.require("username");
const ghcrToken = ghcrConfig.requireSecret("token");

// Reference base stack outputs
const baseStack = new pulumi.StackReference(baseStackRef);
const postgresqlHost = baseStack.getOutput("postgresqlHost");
const postgresqlAdminUser = baseStack.getOutput("postgresqlAdminUser");
const postgresqlAdminPassword = baseStack.requireOutput("postgresqlAdminPassword");
const kubeconfig = baseStack.requireOutput("kubeconfig");

// Create Kubernetes provider using kubeconfig from base stack
const k8sProvider = new k8s.Provider("preview-pr-k8s", {
    kubeconfig: kubeconfig,
    enableServerSideApply: true,
});

// Naming conventions
const namespaceName = `preview-pr-${prNumber}`;
const databaseName = `aphiria_pr_${prNumber}`;
const webUrl = `https://${prNumber}.pr.aphiria.com`;
const apiUrl = `https://${prNumber}.pr-api.aphiria.com`;

// Create all infrastructure using factory
const stack = createStack({
    env: "preview",
    skipBaseInfrastructure: true, // Uses shared Helm charts and Gateway from preview-base
    namespace: {
        name: namespaceName,
        resourceQuota: {
            cpu: "1200m",
            memory: "2Gi",
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
            username: ghcrUsername,
            token: ghcrToken,
        },
    },
    database: {
        replicas: 1,
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
        domains: [
            "*.pr.aphiria.com",
            "*.pr-api.aphiria.com",
        ],
    },
    app: {
        webReplicas: 1,
        apiReplicas: 1,
        webUrl: webUrl,
        apiUrl: apiUrl,
        webImage: `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`,
        apiImage: `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`,
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
}, k8sProvider);

// Outputs
export { webUrl, apiUrl, databaseName, namespaceName };
export const namespaceResourceName = stack.namespace?.namespace.metadata.name;
export const webImageRef = `ghcr.io/aphiria/aphiria.com-web@${webImageDigest}`;
export const apiImageRef = `ghcr.io/aphiria/aphiria.com-api@${apiImageDigest}`;
