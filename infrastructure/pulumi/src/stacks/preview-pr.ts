/**
 * Preview PR Stack (Per-PR isolated environments)
 */

import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { createStack } from "./lib/stack-factory";
import { AppConfig } from "./lib/config/types";

// Get PR number from config
const config = new pulumi.Config();
const _prNumber = config.requireNumber("prNumber");

// Import the preview-base stack to get cluster access
const baseStackReference = new pulumi.StackReference(config.require("baseStackReference"));

// Get base stack outputs
const _postgresqlHost = baseStackReference.getOutput("postgresqlHost");
const _postgresqlAdminUser = baseStackReference.getOutput("postgresqlAdminUser");
const _postgresqlAdminPassword = baseStackReference.requireOutput("postgresqlAdminPassword");
const _prometheusAuthToken = baseStackReference.requireOutput("prometheusAuthToken");
const clusterName = baseStackReference.requireOutput("clusterName");

// Fetch fresh kubeconfig from DigitalOcean on every operation
// This ensures credentials never expire (DO rotates them every 7 days)
const kubeconfig = clusterName.apply((name) =>
    digitalocean.getKubernetesCluster({ name }).then((cluster) => cluster.kubeConfigs[0].rawConfig)
);

// Create provider using the preview-base cluster's kubeconfig
const k8sProvider = new k8s.Provider(
    "aphiria-com-preview-pr-k8s",
    {
        kubeconfig: kubeconfig,
        deleteUnreachable: true,
        // Disable SSA to prevent field manager conflicts between deployments
        enableServerSideApply: false,
    },
    {
        dependsOn: [baseStackReference],
    }
);

// Create the stack - all configuration is read from Pulumi config set by CI/CD
createStack("preview", k8sProvider);

// Export the PR URLs for GitHub Actions to post as PR comment
const appConfig = config.requireObject<AppConfig>("app");
export const webUrl = appConfig.web.url;
export const apiUrl = appConfig.api.url;
