/**
 * Local Stack (Minikube local development environment)
 */

import * as k8s from "@pulumi/kubernetes";
import { createStack } from "./lib/stack-factory";

// Minikube provider
const k8sProvider = new k8s.Provider("minikube", {
    context: "minikube",
    // Disable SSA to prevent field manager conflicts between deployments
    enableServerSideApply: false,
});

createStack("local", k8sProvider);
