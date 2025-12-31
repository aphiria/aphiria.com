import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createGrafanaIngress } from "../../src/components/grafana-ingress";

describe("createGrafanaIngress", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should create both HTTPS route and HTTP redirect", (done) => {
        const result = createGrafanaIngress({
            namespace: "monitoring",
            serviceName: "grafana",
            servicePort: 80,
            gatewayName: "gateway",
            gatewayNamespace: "nginx-gateway",
            hostname: "grafana.aphiria.com",
            sectionName: "https-subdomains",
            provider: k8sProvider,
        });

        expect(result.httpsRoute).toBeDefined();
        expect(result.httpRedirectRoute).toBeDefined();

        done();
    });

    it("should create HTTPS route with correct hostname", (done) => {
        const result = createGrafanaIngress({
            namespace: "monitoring",
            serviceName: "grafana",
            servicePort: 80,
            gatewayName: "gateway",
            gatewayNamespace: "nginx-gateway",
            hostname: "grafana.example.com",
            sectionName: "https-subdomains",
            provider: k8sProvider,
        });

        expect(result.httpsRoute).toBeDefined();
        done();
    });

    it("should create route for preview environment", (done) => {
        const result = createGrafanaIngress({
            namespace: "monitoring",
            serviceName: "grafana",
            servicePort: 80,
            gatewayName: "preview-gateway",
            gatewayNamespace: pulumi.output("nginx-gateway"),
            hostname: "grafana-preview-123.aphiria.com",
            sectionName: "https-subdomains-3",
            provider: k8sProvider,
        });

        expect(result.httpsRoute).toBeDefined();
        expect(result.httpRedirectRoute).toBeDefined();
        done();
    });

    it("should create route for local environment", (done) => {
        const result = createGrafanaIngress({
            namespace: "monitoring",
            serviceName: "grafana",
            servicePort: 80,
            gatewayName: "gateway",
            gatewayNamespace: "nginx-gateway",
            hostname: "grafana.aphiria.com",
            sectionName: "https-subdomains",
            labels: {
                environment: "local",
            },
            provider: k8sProvider,
        });

        expect(result.httpsRoute).toBeDefined();
        done();
    });

    it("should apply custom labels to routes", (done) => {
        const result = createGrafanaIngress({
            namespace: "monitoring",
            serviceName: "grafana",
            servicePort: 80,
            gatewayName: "gateway",
            gatewayNamespace: "nginx-gateway",
            hostname: "grafana.aphiria.com",
            sectionName: "https-subdomains",
            labels: {
                team: "platform",
                component: "monitoring",
            },
            provider: k8sProvider,
        });

        expect(result.httpsRoute).toBeDefined();
        expect(result.httpRedirectRoute).toBeDefined();
        done();
    });

    it("should route to correct service port", (done) => {
        const result = createGrafanaIngress({
            namespace: "monitoring",
            serviceName: "grafana",
            servicePort: 3000,
            gatewayName: "gateway",
            gatewayNamespace: "nginx-gateway",
            hostname: "grafana.aphiria.com",
            sectionName: "https-subdomains",
            provider: k8sProvider,
        });

        expect(result.httpsRoute).toBeDefined();
        done();
    });
});
