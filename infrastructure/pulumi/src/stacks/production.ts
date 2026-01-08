/**
 * Production Infrastructure Stack (DigitalOcean)
 * Single stack containing cluster + base infrastructure + applications (all long-lived).
 * Stack name: production
 */

import * as pulumi from "@pulumi/pulumi";
import { createKubernetesCluster } from "../components";
import { createStack } from "./lib/stack-factory";

// Read cluster configuration from Pulumi config
const clusterConfig = new pulumi.Config("cluster");

// Create the production Kubernetes cluster
const { provider: k8sProvider } = createKubernetesCluster({
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

// Create the stack - all configuration is read from Pulumi.production.yml
createStack("production", k8sProvider);