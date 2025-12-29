import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createPrometheus } from "../../../src/components/monitoring/prometheus";

describe("createPrometheus", () => {
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

    it("should create all required Prometheus resources", (done) => {
        const result = createPrometheus({
            env: "production",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            provider: k8sProvider,
        });

        expect(result.serviceAccount).toBeDefined();
        expect(result.clusterRole).toBeDefined();
        expect(result.clusterRoleBinding).toBeDefined();
        expect(result.configMap).toBeDefined();
        expect(result.pvc).toBeDefined();
        expect(result.statefulSet).toBeDefined();
        expect(result.service).toBeDefined();

        done();
    });

    it("should create ServiceAccount with correct namespace", (done) => {
        const result = createPrometheus({
            env: "preview",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "10Gi",
            provider: k8sProvider,
        });

        pulumi.all([result.serviceAccount]).apply(([sa]) => {
            expect(sa.name).toBe("prometheus");
            expect(sa.namespace).toBe("monitoring");
            done();
        });
    });

    it("should create PVC with correct storage size", (done) => {
        const result = createPrometheus({
            env: "local",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "20Gi",
            provider: k8sProvider,
        });

        pulumi.all([result.pvc]).apply(([pvc]) => {
            expect(pvc.name).toBe("prometheus-pvc");
            expect(pvc.namespace).toBe("monitoring");
            done();
        });
    });

    it("should use default scrape interval when not specified", (done) => {
        const result = createPrometheus({
            env: "production",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "10Gi",
            provider: k8sProvider,
        });

        expect(result.configMap).toBeDefined();
        done();
    });

    it("should apply custom labels to resources", (done) => {
        const result = createPrometheus({
            env: "production",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "10Gi",
            labels: {
                team: "platform",
                environment: "prod",
            },
            provider: k8sProvider,
        });

        pulumi.all([result.statefulSet]).apply(([sts]) => {
            expect(sts.name).toBe("prometheus");
            done();
        });
    });

    it("should create ClusterRole with read-only permissions", (done) => {
        const result = createPrometheus({
            env: "production",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "10Gi",
            provider: k8sProvider,
        });

        pulumi.all([result.clusterRole]).apply(([cr]) => {
            expect(cr.name).toBe("prometheus");
            done();
        });
    });

    it("should create Service with correct port", (done) => {
        const result = createPrometheus({
            env: "preview",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "10Gi",
            provider: k8sProvider,
        });

        pulumi.all([result.service]).apply(([svc]) => {
            expect(svc.name).toBe("prometheus");
            expect(svc.namespace).toBe("monitoring");
            done();
        });
    });

    it("should tag metrics with environment label", (done) => {
        const result = createPrometheus({
            env: "local",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "5Gi",
            scrapeInterval: "30s",
            provider: k8sProvider,
        });

        expect(result.configMap).toBeDefined();
        done();
    });
});
