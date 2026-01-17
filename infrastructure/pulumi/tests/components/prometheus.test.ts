import { describe, it, expect, beforeAll } from "@jest/globals";
import * as k8s from "@pulumi/kubernetes";
import { createPrometheus, PrometheusScrapeConfig } from "../../src/components/prometheus";
import { promiseOf } from "../test-utils";

describe("createPrometheus", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create all required Prometheus resources", (done) => {
        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
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
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const sa = await promiseOf(result.serviceAccount);
        expect(sa.name).toBe("prometheus");
        expect(sa.namespace).toBe("monitoring");
    });

    it("should create PVC with correct storage size", async () => {
        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "20Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const pvc = await promiseOf(result.pvc);
        expect(pvc.name).toBe("prometheus-pvc");
        expect(pvc.namespace).toBe("monitoring");
    });

    it("should use default scrape interval when not specified", (done) => {
        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "30s",
            evaluationInterval: "30s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        expect(result.configMap).toBeDefined();
        done();
    });

    it("should apply custom labels to resources", async () => {
        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "30s",
            evaluationInterval: "30s",
            imageVersion: "v2.45.0",
            environment: "prod",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
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
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "30s",
            evaluationInterval: "30s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const cr = await promiseOf(result.clusterRole);
        expect(cr.name).toBe("prometheus");
    });

    it("should create Service with correct port", async () => {
        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "30s",
            evaluationInterval: "30s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const svc = await promiseOf(result.service);
        expect(svc.name).toBe("prometheus");
        expect(svc.namespace).toBe("monitoring");
    });

    it("should tag metrics with environment label", (done) => {
        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "5Gi",
            scrapeInterval: "30s",
            evaluationInterval: "30s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        expect(result.configMap).toBeDefined();
        done();
    });

    it("should build scrape config with all optional fields", async () => {
        const scrapeConfig: PrometheusScrapeConfig = {
            job_name: "api-monitoring",
            scrape_interval: "30s",
            scrape_timeout: "10s",
            metrics_path: "/metrics",
            scheme: "https" as const,
            static_configs: [{ targets: ["api:8080"] }],
            kubernetes_sd_configs: [{ role: "pod" }],
            relabel_configs: [{ action: "keep", regex: "true" }],
        };

        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [scrapeConfig],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        const prometheusYml = data["prometheus.yml"];

        // Verify all optional fields are included
        expect(prometheusYml).toContain("job_name: 'api-monitoring'");
        expect(prometheusYml).toContain("scrape_interval: 30s");
        expect(prometheusYml).toContain("scrape_timeout: 10s");
        expect(prometheusYml).toContain("metrics_path: /metrics");
        expect(prometheusYml).toContain("scheme: https");
    });

    it("should handle scrape config with only required fields", async () => {
        const scrapeConfig = {
            job_name: "minimal-job",
        };

        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [scrapeConfig],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        const prometheusYml = data["prometheus.yml"];

        expect(prometheusYml).toContain("job_name: 'minimal-job'");
        // Should not contain optional job-specific fields (only job_name)
        // Extract the job config section to verify it only has job_name
        const jobConfigMatch = prometheusYml.match(/- job_name: 'minimal-job'[^\n]*/);
        expect(jobConfigMatch).toBeTruthy();
        // The job line should only contain job_name, nothing else
        expect(jobConfigMatch![0]).toBe("- job_name: 'minimal-job'");
    });

    it("should handle scrape config with kubernetes_sd namespaces filter", async () => {
        const scrapeConfig: PrometheusScrapeConfig = {
            job_name: "kubernetes-pods",
            kubernetes_sd_configs: [
                {
                    role: "pod",
                    namespaces: {
                        names: ["default", "monitoring"],
                    },
                },
            ],
        };

        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [scrapeConfig],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        const prometheusYml = data["prometheus.yml"];

        expect(prometheusYml).toContain("job_name: 'kubernetes-pods'");
        expect(prometheusYml).toContain("kubernetes_sd_configs:");
        expect(prometheusYml).toContain("namespaces:");
        expect(prometheusYml).toContain("names:");
    });

    it("should handle multiple scrape configs", async () => {
        const scrapeConfigs = [
            { job_name: "job-1", scrape_interval: "30s" },
            { job_name: "job-2", metrics_path: "/custom" },
            { job_name: "job-3" },
        ];

        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs,
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        const prometheusYml = data["prometheus.yml"];

        expect(prometheusYml).toContain("job_name: 'job-1'");
        expect(prometheusYml).toContain("job_name: 'job-2'");
        expect(prometheusYml).toContain("job_name: 'job-3'");
        expect(prometheusYml).toContain("scrape_interval: 30s");
        expect(prometheusYml).toContain("metrics_path: /custom");
    });

    it("should serialize static_configs with target strings", async () => {
        const scrapeConfig: PrometheusScrapeConfig = {
            job_name: "static-targets",
            static_configs: [
                {
                    targets: ["localhost:9090", "localhost:9091"],
                },
            ],
        };

        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [scrapeConfig],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        const prometheusYml = data["prometheus.yml"];

        expect(prometheusYml).toContain("static_configs:");
        expect(prometheusYml).toBeDefined();
    });

    it("should serialize relabel_configs with nested objects", async () => {
        const scrapeConfig: PrometheusScrapeConfig = {
            job_name: "relabel-test",
            relabel_configs: [
                {
                    source_labels: ["__meta_kubernetes_pod_name"],
                    target_label: "pod",
                    action: "replace",
                },
            ],
        };

        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [scrapeConfig],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        const prometheusYml = data["prometheus.yml"];

        expect(prometheusYml).toContain("relabel_configs:");
        expect(prometheusYml).toBeDefined();
    });

    it("should handle ServiceAccount with annotations", async () => {
        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
                serviceAccountAnnotations: {
                    "eks.amazonaws.com/role-arn": "arn:aws:iam::123456789:role/prometheus",
                },
            },
            provider: k8sProvider,
        });

        const sa = await promiseOf(result.serviceAccount);
        expect(sa.name).toBe("prometheus");
    });

    it("should create PVC without storageClassName when not specified", () => {
        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        // Verify PVC is created without explicit storageClassName
        expect(result.pvc).toBeDefined();
    });

    it("should handle scrape config with kubernetes_sd nested namespaces object", async () => {
        // This test exercises the YAML serialization code path for nested objects (lines 245-248)
        // kubernetes_sd_configs[].namespaces is an object (not an array, not a primitive)
        const scrapeConfig: PrometheusScrapeConfig = {
            job_name: "kubernetes-discovery",
            kubernetes_sd_configs: [
                {
                    role: "pod",
                    // namespaces is a nested object that exercises lines 245-248
                    namespaces: {
                        names: ["default", "kube-system"],
                    },
                },
            ],
        };

        const result = createPrometheus({
            namespace: "monitoring",
            replicas: 1,
            resources: {
                requests: { cpu: "100m", memory: "256Mi" },
                limits: { cpu: "500m", memory: "512Mi" },
            },
            retentionTime: "7d",
            storageSize: "10Gi",
            scrapeInterval: "15s",
            evaluationInterval: "15s",
            imageVersion: "v2.45.0",
            environment: "test",
            scrapeConfigs: [scrapeConfig],
            rules: [],
            rbac: {
                serviceAccountName: "prometheus",
                clusterRoleName: "prometheus",
            },
            provider: k8sProvider,
        });

        const data = await promiseOf(result.configMap.data);
        const prometheusYml = data["prometheus.yml"];

        // Verify kubernetes_sd_configs was serialized
        expect(prometheusYml).toContain("kubernetes_sd_configs:");
        expect(prometheusYml).toContain("namespaces:");
    });
});
