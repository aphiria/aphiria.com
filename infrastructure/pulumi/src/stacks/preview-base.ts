/**
 * Base Infrastructure Stack for Preview Environments (DigitalOcean)
 * This stack creates its own dedicated cluster for complete isolation from production.
 * Stack name: preview-base
 */

import * as pulumi from "@pulumi/pulumi";
import { createKubernetesCluster } from "../components";
import { createStack } from "./lib/stack-factory";

// Create the preview Kubernetes cluster (includes provider)
const { kubeconfig: clusterKubeconfig, provider: k8sProvider } = createKubernetesCluster({
    name: "aphiria-com-preview-cluster",
    region: "nyc3",
    version: "1.34.1-do.2",
    autoUpgrade: true, // Enable automatic Kubernetes version upgrades
    surgeUpgrade: false, // Disable surge upgrades for preview
    ha: false, // Disable HA for preview to save costs
    nodeSize: "s-2vcpu-2gb",
    nodeCount: 1,
    autoScale: true,
    minNodes: 1,
    maxNodes: 4,
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
});

// Create the stack - all configuration is read from Pulumi.preview-base.yml
const stack = createStack("preview", k8sProvider);

// Export kubeconfig for preview-pr stacks to consume
export const kubeconfig = pulumi.secret(clusterKubeconfig);

// Export PostgreSQL credentials for preview-pr to use (read from config)
const postgresqlConfig = new pulumi.Config("postgresql");
export const postgresqlAdminUser = postgresqlConfig.require("user");
export const postgresqlAdminPassword = postgresqlConfig.requireSecret("password");

// Export monitoring namespace resources (they are created for preview-base, but not preview-pr)
const grafanaConfig = new pulumi.Config("grafana");
export const grafanaHostname = grafanaConfig.get("hostname");
export const prometheusEndpoint = stack.monitoring ?
    pulumi.interpolate`http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090` :
    undefined;
