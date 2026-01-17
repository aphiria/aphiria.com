import { createProvider } from "../../../../src/stacks/lib/factories/provider";
import { ClusterConfig } from "../../../../src/stacks/lib/config/types";

jest.mock("../../../../src/components", () => ({
    createKubernetesCluster: jest.fn(),
}));

jest.mock("../../../../src/stacks/lib/config/loader", () => ({
    loadConfig: jest.fn(),
}));

import { createKubernetesCluster } from "../../../../src/components";
import { loadConfig } from "../../../../src/stacks/lib/config/loader";

describe("createProvider", () => {
    const mockClusterConfig: ClusterConfig = {
        name: "test-cluster",
        region: "nyc3",
        version: "1.28.0-do.0",
        autoUpgrade: false,
        surgeUpgrade: false,
        ha: false,
        nodeSize: "s-2vcpu-4gb",
        nodeCount: 2,
        autoScale: true,
        minNodes: 1,
        maxNodes: 3,
        vpcUuid: "test-vpc-uuid",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("preview environment", () => {
        it("should throw error when cluster config is missing", () => {
            (loadConfig as jest.Mock).mockReturnValue({});

            expect(() => createProvider("preview")).toThrow(
                "Environment preview requires cluster configuration but none was found. Check Pulumi.preview.yaml for cluster: config block."
            );
        });

        it("should create cluster with config from loadConfig", () => {
            (loadConfig as jest.Mock).mockReturnValue({
                cluster: mockClusterConfig,
            });

            (createKubernetesCluster as jest.Mock).mockReturnValue({
                provider: {},
                cluster: {},
                clusterId: "cluster-123",
                kubeconfig: "kubeconfig-content",
            });

            createProvider("preview");

            expect(createKubernetesCluster).toHaveBeenCalledWith({
                name: "test-cluster",
                region: "nyc3",
                version: "1.28.0-do.0",
                autoUpgrade: false,
                surgeUpgrade: false,
                ha: false,
                nodeSize: "s-2vcpu-4gb",
                nodeCount: 2,
                autoScale: true,
                minNodes: 1,
                maxNodes: 3,
                vpcUuid: "test-vpc-uuid",
            });
        });

        it("should return provider, cluster, clusterId, and kubeconfig", () => {
            const mockProvider = {};
            const mockCluster = {};
            const mockClusterId = "cluster-123";
            const mockKubeconfig = "kubeconfig-content";

            (loadConfig as jest.Mock).mockReturnValue({
                cluster: mockClusterConfig,
            });

            (createKubernetesCluster as jest.Mock).mockReturnValue({
                provider: mockProvider,
                cluster: mockCluster,
                clusterId: mockClusterId,
                kubeconfig: mockKubeconfig,
            });

            const result = createProvider("preview");

            expect(result).toEqual({
                provider: mockProvider,
                cluster: mockCluster,
                clusterId: mockClusterId,
                kubeconfig: mockKubeconfig,
            });
        });
    });

    describe("production environment", () => {
        it("should throw error when cluster config is missing", () => {
            (loadConfig as jest.Mock).mockReturnValue({});

            expect(() => createProvider("production")).toThrow(
                "Environment production requires cluster configuration but none was found. Check Pulumi.production.yaml for cluster: config block."
            );
        });

        it("should create cluster with config from loadConfig", () => {
            const prodClusterConfig: ClusterConfig = {
                ...mockClusterConfig,
                name: "prod-cluster",
                ha: true,
                nodeCount: 3,
                autoScale: true,
                minNodes: 3,
                maxNodes: 5,
            };

            (loadConfig as jest.Mock).mockReturnValue({
                cluster: prodClusterConfig,
            });

            (createKubernetesCluster as jest.Mock).mockReturnValue({
                provider: {},
                cluster: {},
                clusterId: "cluster-456",
                kubeconfig: "kubeconfig-prod",
            });

            createProvider("production");

            expect(createKubernetesCluster).toHaveBeenCalledWith({
                name: "prod-cluster",
                region: "nyc3",
                version: "1.28.0-do.0",
                autoUpgrade: false,
                surgeUpgrade: false,
                ha: true,
                nodeSize: "s-2vcpu-4gb",
                nodeCount: 3,
                autoScale: true,
                minNodes: 3,
                maxNodes: 5,
                vpcUuid: "test-vpc-uuid",
            });
        });

        it("should return provider, cluster, clusterId, and kubeconfig", () => {
            const mockProvider = {};
            const mockCluster = {};
            const mockClusterId = "cluster-456";
            const mockKubeconfig = "kubeconfig-prod";

            (loadConfig as jest.Mock).mockReturnValue({
                cluster: mockClusterConfig,
            });

            (createKubernetesCluster as jest.Mock).mockReturnValue({
                provider: mockProvider,
                cluster: mockCluster,
                clusterId: mockClusterId,
                kubeconfig: mockKubeconfig,
            });

            const result = createProvider("production");

            expect(result).toEqual({
                provider: mockProvider,
                cluster: mockCluster,
                clusterId: mockClusterId,
                kubeconfig: mockKubeconfig,
            });
        });
    });
});
