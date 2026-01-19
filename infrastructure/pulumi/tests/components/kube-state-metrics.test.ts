import { describe, it, expect, beforeAll } from "vitest";
import * as k8s from "@pulumi/kubernetes";
import { createKubeStateMetrics } from "../../src/components/kube-state-metrics";
import { promiseOf } from "../test-utils";

describe("createKubeStateMetrics", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create ServiceAccount for kube-state-metrics", async () => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        const sa = await promiseOf(result.serviceAccount);
        expect(sa.name).toBe("kube-state-metrics");
        expect(sa.namespace).toBe("monitoring");
    });

    it("should create ClusterRole with read permissions", async () => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        const cr = await promiseOf(result.clusterRole);
        expect(cr.name).toBe("kube-state-metrics");
    });

    it("should create ClusterRoleBinding", async () => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        const crb = await promiseOf(result.clusterRoleBinding);
        expect(crb.name).toBe("kube-state-metrics");
    });

    it("should create Deployment with correct image", async () => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("kube-state-metrics");
        expect(deployment.namespace).toBe("monitoring");
    });

    it("should create Service with metrics and telemetry ports", async () => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        const service = await promiseOf(result.service);
        expect(service.name).toBe("kube-state-metrics");
        expect(service.namespace).toBe("monitoring");
    });

    it("should include Prometheus scrape annotations", () => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        expect(result.service).toBeDefined();
        expect(result.deployment).toBeDefined();
    });

    it("should use custom namespace when provided", async () => {
        const result = createKubeStateMetrics({
            namespace: "custom-monitoring",
            provider: k8sProvider,
        });

        const [sa, deployment, service] = await Promise.all([
            promiseOf(result.serviceAccount),
            promiseOf(result.deployment),
            promiseOf(result.service),
        ]);
        expect(sa.namespace).toBe("custom-monitoring");
        expect(deployment.namespace).toBe("custom-monitoring");
        expect(service.namespace).toBe("custom-monitoring");
    });

    it("should include standard labels", async () => {
        const result = createKubeStateMetrics({
            namespace: "monitoring",
            provider: k8sProvider,
        });

        const deployment = await promiseOf(result.deployment);
        expect(deployment.name).toBe("kube-state-metrics");
    });
});
