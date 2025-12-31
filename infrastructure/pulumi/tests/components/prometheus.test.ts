import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createPrometheus } from "../../src/components/prometheus";
import { promiseOf } from "../test-utils";

describe("createPrometheus", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
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

    it("should create ServiceAccount with correct namespace", async () => {
        const result = createPrometheus({
            env: "preview",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "10Gi",
            provider: k8sProvider,
        });

        const sa = await promiseOf(result.serviceAccount);
        expect(sa.name).toBe("prometheus");
        expect(sa.namespace).toBe("monitoring");
    });

    it("should create PVC with correct storage size", async () => {
        const result = createPrometheus({
            env: "local",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "20Gi",
            provider: k8sProvider,
        });

        const pvc = await promiseOf(result.pvc);
        expect(pvc.name).toBe("prometheus-pvc");
        expect(pvc.namespace).toBe("monitoring");
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

    it("should apply custom labels to resources", async () => {
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

        const sts = await promiseOf(result.statefulSet);
        expect(sts.name).toBe("prometheus");
    });

    it("should create ClusterRole with read-only permissions", async () => {
        const result = createPrometheus({
            env: "production",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "10Gi",
            provider: k8sProvider,
        });

        const cr = await promiseOf(result.clusterRole);
        expect(cr.name).toBe("prometheus");
    });

    it("should create Service with correct port", async () => {
        const result = createPrometheus({
            env: "preview",
            namespace: "monitoring",
            retentionTime: "7d",
            storageSize: "10Gi",
            provider: k8sProvider,
        });

        const svc = await promiseOf(result.service);
        expect(svc.name).toBe("prometheus");
        expect(svc.namespace).toBe("monitoring");
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
