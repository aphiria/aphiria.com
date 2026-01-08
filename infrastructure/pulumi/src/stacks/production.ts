/**
 * Production Infrastructure Stack (DigitalOcean)
 * Single stack containing cluster + base infrastructure + applications (all long-lived).
 * Stack name: production
 */

import { createKubernetesCluster } from "../components";
import { createStack } from "./lib/stack-factory";

// Create the production Kubernetes cluster
const { provider: k8sProvider } = createKubernetesCluster({
    name: "aphiria-com-cluster",
    region: "nyc3",
    version: "1.34.1-do.2",
    autoUpgrade: true, // Enable automatic Kubernetes version upgrades
    surgeUpgrade: false, // Disable surge upgrades for more controlled rollouts
    ha: false, // Consider enabling for true production workloads
    nodeSize: "s-2vcpu-2gb",
    nodeCount: 1,
    autoScale: true,
    minNodes: 1,
    maxNodes: 4,
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
});

// Create the stack - all configuration is read from Pulumi.production.yml
createStack("production", k8sProvider);