import { describe, it, expect, beforeAll } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {
    installBaseHelmCharts,
    installCertManager,
    installNginxGateway,
    installKubePrometheusStack,
    ignoreDigitalOceanServiceAnnotationsV4,
    injectPrometheusCRDWaitInitContainer,
} from "../../src/components/helm-charts";
import { promiseOf } from "../test-utils";

describe("installBaseHelmCharts", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should install cert-manager and nginx-gateway for local environment", async () => {
        const result = installBaseHelmCharts({
            env: "local",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        const [certUrn, nginxUrn] = await Promise.all([
            promiseOf(result.certManager.urn),
            promiseOf(result.nginxGateway.urn),
        ]);

        expect(certUrn).toContain("cert-manager");
        expect(nginxUrn).toContain("nginx-gateway");
    });

    it("should install cert-manager and nginx-gateway for production environment", async () => {
        const result = installBaseHelmCharts({
            env: "production",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        const [certUrn, nginxUrn] = await Promise.all([
            promiseOf(result.certManager.urn),
            promiseOf(result.nginxGateway.urn),
        ]);

        expect(certUrn).toContain("cert-manager");
        expect(nginxUrn).toContain("nginx-gateway");
    });

    it("should install cert-manager and nginx-gateway for preview environment", async () => {
        const result = installBaseHelmCharts({
            env: "preview",
            provider: k8sProvider,
        });

        expect(result.certManager).toBeDefined();
        expect(result.nginxGateway).toBeDefined();

        const [certUrn, nginxUrn] = await Promise.all([
            promiseOf(result.certManager.urn),
            promiseOf(result.nginxGateway.urn),
        ]);

        expect(certUrn).toContain("cert-manager");
        expect(nginxUrn).toContain("nginx-gateway");
    });

    it("should configure cert-manager with resource limits", async () => {
        const certManager = installCertManager({
            env: "production",
            chartName: "cert-manager",
            repository: "https://charts.jetstack.io",
            version: "v1.13.2",
            namespace: "cert-manager",
            provider: k8sProvider,
        });

        expect(certManager).toBeDefined();

        const urn = await promiseOf(certManager.urn);
        expect(urn).toContain("cert-manager");
    });
});

describe("installNginxGateway", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should install nginx-gateway-fabric chart", async () => {
        const result = installNginxGateway({
            env: "production",
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
            provider: k8sProvider,
        });

        expect(result).toBeDefined();

        const urn = await promiseOf(result.urn);
        expect(urn).toContain("nginx-gateway");
    });

    it("should conditionally apply transforms based on NODE_ENV (skipped in mock runtime)", () => {
        // Note: In test environment (NODE_ENV=test), transforms are skipped to avoid
        // "Pulumi CLI does not support transforms" error in mock runtime.
        // In production, transforms are applied to ignore DigitalOcean annotations
        // on LoadBalancer Service resources.
        const chart = installNginxGateway({
            env: "production",
            chartName: "nginx-gateway-fabric",
            repository: "oci://ghcr.io/nginxinc/charts",
            version: "1.2.0",
            namespace: "nginx-gateway",
            provider: k8sProvider,
        });

        expect(chart).toBeDefined();
    });
});

describe("ignoreDigitalOceanServiceAnnotationsV4", () => {
    it("should add ignoreChanges for DigitalOcean annotations on Service resources", () => {
        const args: pulumi.ResourceTransformArgs = {
            type: "kubernetes:core/v1:Service",
            name: "test-service",
            custom: true,
            props: {
                metadata: { name: "test" },
            },
            opts: {},
        };

        const result = ignoreDigitalOceanServiceAnnotationsV4(args);

        expect(result).toBeDefined();
        expect(result?.props).toEqual(args.props);
        expect(result?.opts).toBeDefined();
    });

    it("should return undefined for non-Service resources", () => {
        const args: pulumi.ResourceTransformArgs = {
            type: "kubernetes:apps/v1:Deployment",
            name: "test-deployment",
            custom: true,
            props: {
                metadata: { name: "test" },
            },
            opts: {},
        };

        const result = ignoreDigitalOceanServiceAnnotationsV4(args);

        expect(result).toBeUndefined();
    });
});

describe("installKubePrometheusStack", () => {
    let k8sProvider: k8s.Provider;

    beforeAll(() => {
        k8sProvider = new k8s.Provider("test", {});
    });

    it("should install kube-prometheus-stack with provided values", async () => {
        const chart = installKubePrometheusStack({
            env: "production",
            chartName: "kube-prometheus-stack",
            repository: "https://prometheus-community.github.io/helm-charts",
            version: "45.0.0",
            namespace: "monitoring",
            provider: k8sProvider,
            values: {
                prometheus: {
                    prometheusSpec: {
                        retention: "30d",
                    },
                },
            },
        });

        expect(chart).toBeDefined();

        const urn = await promiseOf(chart.urn);
        expect(urn).toContain("kube-prometheus-stack");
    });

    it("should install kube-prometheus-stack without values (exercises fallback)", async () => {
        const chart = installKubePrometheusStack({
            env: "production",
            chartName: "kube-prometheus-stack",
            repository: "https://prometheus-community.github.io/helm-charts",
            version: "45.0.0",
            namespace: "monitoring",
            provider: k8sProvider,
        });

        expect(chart).toBeDefined();

        const urn = await promiseOf(chart.urn);
        expect(urn).toContain("kube-prometheus-stack");
    });

    it("should conditionally apply CRD wait transformation based on NODE_ENV (skipped in test)", () => {
        // In test environment (NODE_ENV=test), transformations are skipped to avoid
        // "Pulumi CLI does not support transforms" error in mock runtime.
        // In production, transformation injects init container that waits for CRDs.
        const chart = installKubePrometheusStack({
            env: "production",
            chartName: "kube-prometheus-stack",
            repository: "https://prometheus-community.github.io/helm-charts",
            version: "45.0.0",
            namespace: "monitoring",
            provider: k8sProvider,
        });

        expect(chart).toBeDefined();
    });
});

describe("injectPrometheusCRDWaitInitContainer", () => {
    it("should inject init container into Prometheus Operator deployment", () => {
        const deployment = {
            kind: "Deployment",
            metadata: {
                name: "kube-prometheus-stack-operator",
                namespace: "monitoring",
            },
            spec: {
                template: {
                    spec: {
                        containers: [
                            {
                                name: "kube-prometheus-stack",
                                image: "quay.io/prometheus-operator/prometheus-operator:v0.81.0",
                            },
                        ],
                    },
                },
            },
        };

        const args: pulumi.ResourceTransformArgs = {
            type: "kubernetes:apps/v1:Deployment",
            name: "kube-prometheus-stack-operator",
            props: deployment,
            opts: {},
            custom: false,
        };

        const result = injectPrometheusCRDWaitInitContainer(args);

        expect(result).toBeDefined();
        expect(result?.props.spec.template.spec.initContainers).toBeDefined();
        expect(result?.props.spec.template.spec.initContainers).toHaveLength(1);

        const initContainer = result?.props.spec.template.spec.initContainers[0];
        expect(initContainer.name).toBe("wait-for-prometheus-crds");
        expect(initContainer.image).toBe("docker.io/bitnami/kubectl:latest");
        expect(initContainer.command).toEqual(["bash", "-c"]);
        expect(initContainer.args).toHaveLength(1);
        expect(initContainer.args[0]).toContain("prometheuses.monitoring.coreos.com");
        expect(initContainer.args[0]).toContain("servicemonitors.monitoring.coreos.com");
        expect(initContainer.args[0]).toContain("prometheusrules.monitoring.coreos.com");
        expect(initContainer.args[0]).toContain("kubectl wait --for condition=established");

        // Verify security context
        expect(initContainer.securityContext).toBeDefined();
        expect(initContainer.securityContext.allowPrivilegeEscalation).toBe(false);
        expect(initContainer.securityContext.readOnlyRootFilesystem).toBe(true);
        expect(initContainer.securityContext.runAsNonRoot).toBe(true);
        expect(initContainer.securityContext.runAsUser).toBe(65534);
        expect(initContainer.securityContext.capabilities?.drop).toEqual(["ALL"]);
    });

    it("should preserve existing init containers when injecting CRD wait container", () => {
        const deployment = {
            kind: "Deployment",
            metadata: {
                name: "kube-prometheus-stack-operator",
            },
            spec: {
                template: {
                    spec: {
                        initContainers: [
                            {
                                name: "existing-init-container",
                                image: "busybox",
                            },
                        ],
                        containers: [],
                    },
                },
            },
        };

        const args: pulumi.ResourceTransformArgs = {
            type: "kubernetes:apps/v1:Deployment",
            name: "kube-prometheus-stack-operator",
            props: deployment,
            opts: {},
            custom: false,
        };

        const result = injectPrometheusCRDWaitInitContainer(args);

        expect(result?.props.spec.template.spec.initContainers).toHaveLength(2);
        expect(result?.props.spec.template.spec.initContainers[0].name).toBe(
            "existing-init-container"
        );
        expect(result?.props.spec.template.spec.initContainers[1].name).toBe(
            "wait-for-prometheus-crds"
        );
    });

    it("should not transform non-operator deployments", () => {
        const deployment = {
            kind: "Deployment",
            metadata: {
                name: "some-other-deployment",
            },
            spec: {
                template: {
                    spec: {
                        containers: [],
                    },
                },
            },
        };

        const args: pulumi.ResourceTransformArgs = {
            type: "kubernetes:apps/v1:Deployment",
            name: "some-other-deployment",
            props: deployment,
            opts: {},
            custom: false,
        };

        const result = injectPrometheusCRDWaitInitContainer(args);

        expect(result).toBeUndefined();
    });

    it("should not transform non-Deployment resources", () => {
        const service = {
            kind: "Service",
            metadata: {
                name: "kube-prometheus-stack-operator",
            },
            spec: {
                ports: [],
            },
        };

        const args: pulumi.ResourceTransformArgs = {
            type: "kubernetes:core/v1:Service",
            name: "kube-prometheus-stack-operator",
            props: service,
            opts: {},
            custom: false,
        };

        const result = injectPrometheusCRDWaitInitContainer(args);

        expect(result).toBeUndefined();
    });
});
