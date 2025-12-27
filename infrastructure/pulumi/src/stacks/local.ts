/**
 * Local Stack (Minikube local development environment)
 * Stack name: local
 */

import * as k8s from "@pulumi/kubernetes";
import { createStack } from "../shared/factory";
import { StackConfig } from "../shared/stack-config";

// Minikube provider (default kubeconfig)
const k8sProvider = new k8s.Provider("aphiria-com-local-k8s", {
    context: "minikube",
});

const stackConfig = new StackConfig("https://www.aphiria.com", "https://api.aphiria.com");

createStack(
    {
        env: "local",
        skipBaseInfrastructure: true, // Helm charts already installed via minikube setup
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
    },
    k8sProvider
);
