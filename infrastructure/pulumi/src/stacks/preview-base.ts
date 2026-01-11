/**
 * Base Infrastructure Stack for Preview Environments (DigitalOcean)
 */

import * as pulumi from "@pulumi/pulumi";
import { createKubernetesCluster } from "../components";
import { createStack } from "./lib/stack-factory";

// Read cluster configuration from Pulumi config
const clusterConfig = new pulumi.Config("cluster");

// Create the preview Kubernetes cluster (includes provider)
const {
    cluster,
    clusterId,
    kubeconfig: clusterKubeconfig,
    provider: k8sProvider,
} = createKubernetesCluster({
    name: clusterConfig.require("name"),
    region: clusterConfig.require("region"),
    version: clusterConfig.require("version"),
    autoUpgrade: clusterConfig.requireBoolean("autoUpgrade"),
    surgeUpgrade: clusterConfig.requireBoolean("surgeUpgrade"),
    ha: clusterConfig.requireBoolean("ha"),
    nodeSize: clusterConfig.require("nodeSize"),
    nodeCount: clusterConfig.requireNumber("nodeCount"),
    autoScale: clusterConfig.requireBoolean("autoScale"),
    minNodes: clusterConfig.requireNumber("minNodes"),
    maxNodes: clusterConfig.requireNumber("maxNodes"),
    vpcUuid: clusterConfig.require("vpcUuid"),
});

// Create the stack - all configuration is read from Pulumi.preview-base.yml
const stack = createStack("preview", k8sProvider);

// Export cluster info for preview-pr stacks to consume
export const clusterName = cluster.name;
export { clusterId };
export const kubeconfig = pulumi.secret(clusterKubeconfig);

// Export PostgreSQL credentials for preview-pr to use (read from config)
const postgresqlConfig = new pulumi.Config("postgresql");
export const postgresqlAdminUser = postgresqlConfig.require("user");
export const postgresqlAdminPassword = postgresqlConfig.requireSecret("password");

// Export PostgreSQL host (needed by preview-pr)
if (!stack.namespace) throw new Error("Preview-base stack must create namespace");
export const postgresqlHost = pulumi.interpolate`db.${stack.namespace.namespace.metadata.name}.svc.cluster.local`;

// Export monitoring resources (created for preview-base, consumed by preview-pr)
const grafanaConfig = new pulumi.Config("grafana");
const prometheusConfig = new pulumi.Config("prometheus");
export const grafanaHostname = grafanaConfig.get("hostname");
export const prometheusEndpoint = stack.monitoring
    ? pulumi.interpolate`http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090`
    : undefined;
export const prometheusAuthToken = pulumi.secret(prometheusConfig.require("authToken"));
