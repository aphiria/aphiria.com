/**
 * Base Infrastructure Stack for Preview Environments (DigitalOcean)
 */

import * as pulumi from "@pulumi/pulumi";
import { createKubernetesCluster } from "../components";
import { createStack } from "./lib/stack-factory";
import {
    ClusterConfig,
    PostgreSQLConfig,
    GrafanaConfig,
    PrometheusConfig,
} from "./lib/config/types";

// Read cluster configuration from Pulumi config
const config = new pulumi.Config();
const clusterConfig = config.requireObject<ClusterConfig>("cluster");

// Create the preview Kubernetes cluster (includes provider)
const {
    cluster: k8sCluster,
    clusterId,
    kubeconfig: clusterKubeconfig,
    provider: k8sProvider,
} = createKubernetesCluster({
    name: clusterConfig.name,
    region: clusterConfig.region,
    version: clusterConfig.version,
    autoUpgrade: clusterConfig.autoUpgrade,
    surgeUpgrade: clusterConfig.surgeUpgrade,
    ha: clusterConfig.ha,
    nodeSize: clusterConfig.nodeSize,
    nodeCount: clusterConfig.nodeCount,
    autoScale: clusterConfig.autoScale,
    minNodes: clusterConfig.minNodes,
    maxNodes: clusterConfig.maxNodes,
    vpcUuid: clusterConfig.vpcUuid,
});

// Create the stack
const stack = createStack("preview", k8sProvider);

// Export cluster info for preview-pr stacks to consume
export const clusterName = k8sCluster.name;
export { clusterId };
export const kubeconfig = pulumi.secret(clusterKubeconfig);

// Export PostgreSQL credentials for preview-pr to use
const postgresqlConfig = config.requireObject<PostgreSQLConfig>("postgresql");
export const postgresqlAdminUser = postgresqlConfig.user;
export const postgresqlAdminPassword = pulumi.secret(postgresqlConfig.password);

// Export PostgreSQL host (needed by preview-pr)
if (!stack.namespace) throw new Error("Preview-base stack must create namespace");
export const postgresqlHost = pulumi.interpolate`db.${stack.namespace.namespace.metadata.name}.svc.cluster.local`;

// Export monitoring resources (created for preview-base, consumed by preview-pr)
const grafanaConfig = config.requireObject<GrafanaConfig>("grafana");
const prometheusConfig = config.requireObject<PrometheusConfig>("prometheus");
export const grafanaHostname = grafanaConfig.hostname;
export const prometheusEndpoint = stack.monitoring
    ? pulumi.interpolate`http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090`
    : undefined;
export const prometheusAuthToken = pulumi.secret(prometheusConfig.authToken);
