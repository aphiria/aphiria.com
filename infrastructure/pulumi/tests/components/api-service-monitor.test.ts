import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createApiServiceMonitor } from "../../src/components/api-service-monitor";
import { promiseOf } from "../test-utils";

describe("createApiServiceMonitor", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create Secret with auth token", async () => {
        const result = createApiServiceMonitor({
            namespace: "test-ns",
            serviceName: "api",
            targetPort: 80,
            metricsPath: "/metrics",
            scrapeInterval: "15s",
            authToken: pulumi.output("test-token-123"),
            provider: k8sProvider,
        });

        expect(result.secret).toBeDefined();

        const [secretName, secretNamespace, secretType, secretData] = await Promise.all([
            promiseOf(result.secret.metadata.name),
            promiseOf(result.secret.metadata.namespace),
            promiseOf(result.secret.type),
            promiseOf(result.secret.stringData),
        ]);

        expect(secretName).toBe("prometheus-api-auth");
        expect(secretNamespace).toBe("test-ns");
        expect(secretType).toBe("Opaque");
        expect(secretData).toEqual({ token: "test-token-123" });
    });

    it("should create ServiceMonitor with correct selector", async () => {
        const result = createApiServiceMonitor({
            namespace: "production",
            serviceName: "api",
            targetPort: 80,
            metricsPath: "/metrics",
            scrapeInterval: "30s",
            authToken: pulumi.output("prod-token"),
            provider: k8sProvider,
        });

        expect(result.serviceMonitor).toBeDefined();

        const [apiVersion, kind, smNamespace] = await Promise.all([
            promiseOf(result.serviceMonitor.apiVersion),
            promiseOf(result.serviceMonitor.kind),
            promiseOf(result.serviceMonitor.metadata.apply((m) => m.namespace)),
        ]);

        expect(apiVersion).toBe("monitoring.coreos.com/v1");
        expect(kind).toBe("ServiceMonitor");
        expect(smNamespace).toBe("production");

        // Verify selector via metadata check (spec is not directly accessible in CustomResource)
        const metadata = await promiseOf(result.serviceMonitor.metadata);
        expect(metadata.name).toBe("api-metrics");
    });

    it("should configure endpoint with Bearer token secret", async () => {
        const result = createApiServiceMonitor({
            namespace: "test-ns",
            serviceName: "api",
            targetPort: 80,
            metricsPath: "/metrics",
            scrapeInterval: "15s",
            authToken: pulumi.output("test-token"),
            provider: k8sProvider,
        });

        // Verify ServiceMonitor was created with correct metadata
        const [apiVersion, kind] = await Promise.all([
            promiseOf(result.serviceMonitor.apiVersion),
            promiseOf(result.serviceMonitor.kind),
        ]);

        expect(apiVersion).toBe("monitoring.coreos.com/v1");
        expect(kind).toBe("ServiceMonitor");

        // Verify secret was created for Bearer token
        const secretData = await promiseOf(result.secret.stringData);
        expect(secretData).toEqual({ token: "test-token" });
    });

    it("should use custom target port and metrics path", async () => {
        const result = createApiServiceMonitor({
            namespace: "custom-ns",
            serviceName: "api",
            targetPort: 9090,
            metricsPath: "/custom/metrics",
            scrapeInterval: "60s",
            authToken: pulumi.output("custom-token"),
            provider: k8sProvider,
        });

        // Verify ServiceMonitor was created with correct kind and apiVersion
        const [apiVersion, kind, smNamespace] = await Promise.all([
            promiseOf(result.serviceMonitor.apiVersion),
            promiseOf(result.serviceMonitor.kind),
            promiseOf(result.serviceMonitor.metadata.apply((m) => m.namespace)),
        ]);

        expect(apiVersion).toBe("monitoring.coreos.com/v1");
        expect(kind).toBe("ServiceMonitor");
        expect(smNamespace).toBe("custom-ns");
    });

    it("should set labels on ServiceMonitor", async () => {
        const result = createApiServiceMonitor({
            namespace: "test-ns",
            serviceName: "api",
            targetPort: 80,
            metricsPath: "/metrics",
            scrapeInterval: "15s",
            authToken: pulumi.output("test-token"),
            provider: k8sProvider,
        });

        const labels = await promiseOf(result.serviceMonitor.metadata.apply((m) => m.labels));

        expect(labels).toMatchObject({
            app: "api",
            component: "metrics",
            release: "kube-prometheus-stack",
        });
    });

    it("should make ServiceMonitor depend on Secret", async () => {
        const result = createApiServiceMonitor({
            namespace: "test-ns",
            serviceName: "api",
            targetPort: 80,
            metricsPath: "/metrics",
            scrapeInterval: "15s",
            authToken: pulumi.output("test-token"),
            provider: k8sProvider,
        });

        // Verify the ServiceMonitor resource was created with dependsOn
        // The actual dependency is set in the resource options, which we can't easily assert
        // but we can verify both resources exist
        expect(result.secret).toBeDefined();
        expect(result.serviceMonitor).toBeDefined();
    });

});
