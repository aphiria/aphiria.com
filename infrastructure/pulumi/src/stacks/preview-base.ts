/**
 * Base Infrastructure Stack for Preview Environments (DigitalOcean)
 * This stack creates its own dedicated cluster for complete isolation from production.
 * Stack name: preview-base
 */

import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";
import { createKubernetesCluster } from "../components";
import { createStack } from "../shared/factory";

// Create a dedicated preview Kubernetes cluster
const { cluster, kubeconfig: clusterKubeconfig } = createKubernetesCluster({
    name: "aphiria-com-preview-cluster",
    region: "nyc3",
    version: "1.34.1-do.2",
    nodeSize: "s-2vcpu-2gb",
    nodeCount: 1,
    autoScale: true,
    minNodes: 1,
    maxNodes: 3,
    vpcUuid: "976f980d-dc84-11e8-80bc-3cfdfea9fba1",
});

// Create a Kubernetes provider using the cluster's kubeconfig
const k8sProvider = new k8s.Provider("preview-k8s", {
    kubeconfig: clusterKubeconfig,
    enableServerSideApply: true,
}, {
    dependsOn: [cluster],
});

// Get configuration
const postgresqlConfig = new pulumi.Config("postgresql");
const certmanagerConfig = new pulumi.Config("certmanager");
const ghcrConfig = new pulumi.Config("ghcr");

const postgresqlAdminUser = postgresqlConfig.require("user");
const postgresqlAdminPassword = postgresqlConfig.requireSecret("password");

// Create base infrastructure using factory (no app deployment)
createStack({
    env: "preview",
    database: {
        replicas: 1,
        persistentStorage: true,
        storageSize: "20Gi",
        dbUser: postgresqlAdminUser,
        dbPassword: postgresqlAdminPassword,
    },
    gateway: {
        tlsMode: "letsencrypt-prod",
        domains: [
            "*.pr.aphiria.com",      // Web preview URLs
            "*.pr-api.aphiria.com",  // API preview URLs
        ],
        dnsToken: certmanagerConfig.requireSecret("digitaloceanDnsToken"),
    },
    // No app config - preview-base is infrastructure only
}, k8sProvider);

// Create imagePullSecret for GitHub Container Registry
// Required for preview-pr stacks to pull private images from ghcr.io
new k8s.core.v1.Secret("ghcr-pull-secret", {
    metadata: {
        name: "ghcr-pull-secret",
        namespace: "default",
    },
    type: "kubernetes.io/dockerconfigjson",
    stringData: {
        ".dockerconfigjson": pulumi.interpolate`{"auths":{"ghcr.io":{"username":"${ghcrConfig.require("username")}","password":"${ghcrConfig.requireSecret("token")}"}}}`,
    },
}, { provider: k8sProvider });

// Get LoadBalancer IP from nginx-gateway Service
const gatewayService = k8s.core.v1.Service.get(
    "nginx-gateway-svc",
    pulumi.interpolate`nginx-gateway/nginx-gateway-nginx-gateway-fabric`,
    { provider: k8sProvider }
);

const loadBalancerIp = gatewayService.status.loadBalancer.ingress[0].ip;

// Create DNS wildcard records for preview environments
new digitalocean.DnsRecord("preview-web-dns", {
    domain: "aphiria.com",
    type: "A",
    name: "*.pr",
    value: loadBalancerIp,
    ttl: 300,
});

new digitalocean.DnsRecord("preview-api-dns", {
    domain: "aphiria.com",
    type: "A",
    name: "*.pr-api",
    value: loadBalancerIp,
    ttl: 300,
});

// Outputs
export const clusterId = cluster.id;
export const clusterEndpoint = cluster.endpoint;
export const kubeconfig = pulumi.secret(clusterKubeconfig);
export const postgresqlHost = "db.default.svc.cluster.local";
export const postgresqlPort = 5432;
export { postgresqlAdminUser, postgresqlAdminPassword };
export const gatewayName = "nginx-gateway";
export const gatewayNamespace = "nginx-gateway";
export const namespace = "default";
