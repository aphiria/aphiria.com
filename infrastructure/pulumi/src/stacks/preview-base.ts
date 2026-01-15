/**
 * Base Infrastructure Stack for Preview Environments (DigitalOcean)
 */

import * as pulumi from "@pulumi/pulumi";
import { createStack } from "./lib/stack-factory";

const stack = createStack("preview");

// Export cluster info for preview-pr stacks to consume via StackReference
export const clusterName = stack.cluster!.name;
export const clusterId = stack.clusterId;
export const kubeconfig = pulumi.secret(stack.kubeconfig!);

// Export PostgreSQL host for preview-pr stacks
if (!stack.namespace) throw new Error("Preview-base stack must create namespace");
export const postgresqlHost = pulumi.interpolate`db.${stack.namespace.namespace.metadata.name}.svc.cluster.local`;

// Export monitoring endpoint for preview-pr stacks
export const prometheusEndpoint = stack.monitoring
    ? pulumi.interpolate`http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090`
    : undefined;
