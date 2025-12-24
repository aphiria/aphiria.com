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

// Create all infrastructure using factory
const stack = createStack({
    env: "local",
    database: {
        replicas: 1,
        persistentStorage: true,
        storageSize: "5Gi",
        dbUser: postgresqlConfig.get("user") || "postgres",
        dbPassword: postgresqlConfig.get("password") || "postgres",
    },
    gateway: {
        tlsMode: "self-signed",
        domains: ["aphiria.com", "*.aphiria.com"],
    },
    app: {
        webReplicas: 1,
        apiReplicas: 1,
        webUrl: "https://www.aphiria.com",
        apiUrl: "https://api.aphiria.com",
        webImage: "davidbyoung/aphiria.com-web:latest",
        apiImage: "davidbyoung/aphiria.com-api:latest",
        cookieDomain: ".aphiria.com",
    },
}, k8sProvider);

// Exports
export const webUrl = "https://www.aphiria.com";
export const apiUrl = "https://api.aphiria.com";
export const dbHost = "db";
