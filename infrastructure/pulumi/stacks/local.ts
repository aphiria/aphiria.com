/**
 * Local Stack (Minikube local development environment)
 * Stack name: local
 */

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createStack } from "../shared/factory";

// Minikube provider (default kubeconfig)
const k8sProvider = new k8s.Provider("minikube", {
    context: "minikube",
});

// Get PostgreSQL credentials from config
const postgresqlConfig = new pulumi.Config("postgresql");

const postgresqlUser = postgresqlConfig.get("user") || "postgres";
const postgresqlPassword = postgresqlConfig.get("password") || "postgres";

// Naming conventions
const webUrl = "https://www.aphiria.com";
const apiUrl = "https://api.aphiria.com";

// Create all infrastructure using a factory
createStack({
    env: "local",
    skipBaseInfrastructure: true, // Helm charts already installed via minikube setup
    database: {
        replicas: 1,
        persistentStorage: true,
        storageSize: "5Gi",
        dbUser: postgresqlUser,
        dbPassword: postgresqlPassword,
    },
    gateway: {
        tlsMode: "self-signed",
        domains: ["aphiria.com", "*.aphiria.com"],
    },
    app: {
        webReplicas: 1,
        apiReplicas: 1,
        webUrl: webUrl,
        apiUrl: apiUrl,
        webImage: "aphiria.com-web:latest",
        apiImage: "aphiria.com-api:latest",
        cookieDomain: ".aphiria.com",
    },
}, k8sProvider);

// Outputs
export { webUrl, apiUrl };
export const namespace = "default";
