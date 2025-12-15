import * as kubernetes from "@pulumi/kubernetes";
import { createKubernetesCluster } from "./kubernetes";
import { createMonitoring } from "./monitoring";
import { createNetworking } from "./networking";
import { createStorage } from "./storage";

// Create storage bucket (for state and other infrastructure needs)
createStorage();

// Create Kubernetes cluster
const k8s = createKubernetesCluster();

// Create Kubernetes provider using the cluster's kubeconfig
const kubeProvider = new kubernetes.Provider("kubernetes-provider", {
    kubeconfig: k8s.cluster.kubeConfigs[0].rawConfig,
});

// Create monitoring (depends on cluster being available)
createMonitoring();

// Create networking (depends on cluster and load balancer being available)
createNetworking(kubeProvider);

// Export outputs that are needed by other tooling
export const clusterId = k8s.clusterId;
