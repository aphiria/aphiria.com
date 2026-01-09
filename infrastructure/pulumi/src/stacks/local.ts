/**
 * Local Stack (Minikube local development environment)
 */

import * as k8s from "@pulumi/kubernetes";
import { createStack } from "./lib/stack-factory";

// Minikube provider (default kubeconfig)
const k8sProvider = new k8s.Provider("aphiria-com-local-k8s", {
    context: "minikube",
    // Disable SSA to prevent field manager conflicts between deployments
    enableServerSideApply: false,
});

// Create the stack - all configuration is read from Pulumi.local.yml
createStack("local", k8sProvider);
