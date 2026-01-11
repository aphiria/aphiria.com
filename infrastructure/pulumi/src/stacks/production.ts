/**
 * Production Infrastructure Stack (DigitalOcean)
 */

import * as pulumi from "@pulumi/pulumi";
import { createKubernetesCluster } from "../components";
import { createStack } from "./lib/stack-factory";
import { ClusterConfig } from "./lib/config/types";

// Read cluster configuration from Pulumi config
const config = new pulumi.Config();
const clusterConfig = config.requireObject<ClusterConfig>("cluster");

// Create the production Kubernetes cluster
const { provider: k8sProvider } = createKubernetesCluster({
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
createStack("production", k8sProvider);
