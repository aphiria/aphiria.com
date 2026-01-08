/**
 * Preview PR Stack (Per-PR isolated environments)
 * This stack imports the preview-base cluster and creates per-PR resources
 * Stack name format: preview-pr-{PR_NUMBER}
 */

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { createStack } from "./lib/stack-factory";

// Get PR number from config
const config = new pulumi.Config();
const prNumber = config.requireNumber("prNumber");

// Import the preview-base stack to get cluster access
const baseStackReference = new pulumi.StackReference(config.require("baseStackReference"));
const kubeconfig = baseStackReference.requireOutput("kubeconfig") as pulumi.Output<string>;

// Create provider using the preview-base cluster's kubeconfig
const k8sProvider = new k8s.Provider("aphiria-com-preview-pr-k8s", {
    kubeconfig: kubeconfig,
    deleteUnreachable: true,
    // Disable SSA to prevent field manager conflicts between deployments
    enableServerSideApply: false,
});

// Create the stack - all configuration is read from Pulumi config set by CI/CD
createStack("preview", k8sProvider);

// Export the PR URLs for GitHub Actions to post as PR comment
const appConfig = new pulumi.Config("app");
export const webUrl = appConfig.require("web:url");
export const apiUrl = appConfig.require("api:url");