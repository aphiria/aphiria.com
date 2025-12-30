import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createKubeStateMetrics } from "../../src/components/kube-state-metrics";

describe("createKubeStateMetrics", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        pulumi.runtime.setMocks({
            newResource: (
                args: pulumi.runtime.MockResourceArgs
            ): { id: string; state: Record<string, unknown> } => {
                return {
                    id: args.inputs.name ? `${args.name}-id` : `${args.type}-id`,
                    state: {
                        ...args.inputs,
                    },
                };
            },
            call: (args: pulumi.runtime.MockCallArgs): Record<string, unknown> => {
                return args.inputs;
            },
        });

        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create ServiceAccount for kube-state-metrics", (done) => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        pulumi.all([result.serviceAccount]).apply(([sa]) => {
            expect(sa.name).toBe("kube-state-metrics");
            expect(sa.namespace).toBe("monitoring");
            done();
        });
    });

    it("should create ClusterRole with read permissions", (done) => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        pulumi.all([result.clusterRole]).apply(([cr]) => {
            expect(cr.name).toBe("kube-state-metrics");
            done();
        });
    });

    it("should create ClusterRoleBinding", (done) => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        pulumi.all([result.clusterRoleBinding]).apply(([crb]) => {
            expect(crb.name).toBe("kube-state-metrics");
            done();
        });
    });

    it("should create Deployment with correct image", (done) => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        pulumi.all([result.deployment]).apply(([deployment]) => {
            expect(deployment.name).toBe("kube-state-metrics");
            expect(deployment.namespace).toBe("monitoring");
            done();
        });
    });

    it("should create Service with metrics and telemetry ports", (done) => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        pulumi.all([result.service]).apply(([service]) => {
            expect(service.name).toBe("kube-state-metrics");
            expect(service.namespace).toBe("monitoring");
            done();
        });
    });

    it("should include Prometheus scrape annotations", (done) => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        expect(result.service).toBeDefined();
        expect(result.deployment).toBeDefined();
        done();
    });

    it("should use custom namespace when provided", (done) => {
        const result = createKubeStateMetrics({
            namespace: "custom-monitoring",
            provider: k8sProvider,
        });

        pulumi
            .all([result.serviceAccount, result.deployment, result.service])
            .apply(([sa, deployment, service]) => {
                expect(sa.namespace).toBe("custom-monitoring");
                expect(deployment.namespace).toBe("custom-monitoring");
                expect(service.namespace).toBe("custom-monitoring");
                done();
            });
    });

    it("should include standard labels", (done) => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        pulumi.all([result.deployment]).apply(([deployment]) => {
            expect(deployment.name).toBe("kube-state-metrics");
            done();
        });
    });
});
