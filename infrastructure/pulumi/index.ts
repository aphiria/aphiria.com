import * as kubernetes from "@pulumi/kubernetes";
import { createKubernetesCluster } from "./src/kubernetes";
import { createMonitoring } from "./src/monitoring";
import { createNetworking } from "./src/networking";
import { createStorage } from "./src/storage";

// Create storage bucket (for state and other infrastructure needs)
const storage = createStorage();

// Create Kubernetes cluster
const k8s = createKubernetesCluster();

// Create Kubernetes provider using the cluster's kubeconfig
const kubeProvider = new kubernetes.Provider("kubernetes-provider", {
    kubeconfig: k8s.cluster.kubeConfigs[0].rawConfig,
});

// Create monitoring (depends on cluster being available)
const monitoring = createMonitoring();

// Create networking (depends on cluster and load balancer being available)
const networking = createNetworking(kubeProvider);

// Export outputs that are needed by other tooling
export const clusterId = k8s.clusterId;
