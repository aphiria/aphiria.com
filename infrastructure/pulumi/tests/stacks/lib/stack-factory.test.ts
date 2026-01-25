import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createStack } from "../../../src/stacks/lib/stack-factory";

// Mock all the dependencies
vi.mock("../../../src/stacks/lib/config/loader");
vi.mock("../../../src/stacks/lib/factories/base-infrastructure");
vi.mock("../../../src/stacks/lib/factories/provider");
vi.mock("../../../src/stacks/lib/factories/gateway");
vi.mock("../../../src/stacks/lib/factories/database");
vi.mock("../../../src/stacks/lib/factories/applications");
vi.mock("../../../src/stacks/lib/factories/monitoring");
vi.mock("../../../src/components");

import { loadConfig } from "../../../src/stacks/lib/config/loader";
import { createBaseInfrastructureResources } from "../../../src/stacks/lib/factories/base-infrastructure";
import { createProvider } from "../../../src/stacks/lib/factories/provider";
import { createGatewayResources } from "../../../src/stacks/lib/factories/gateway";
import { createDatabaseResources } from "../../../src/stacks/lib/factories/database";
import { createApplicationResources } from "../../../src/stacks/lib/factories/applications";
import { createMonitoringResources } from "../../../src/stacks/lib/factories/monitoring";
import {
    createNamespace,
    createImagePullSecret,
    createHTTPSRedirectRoute,
    createWWWRedirectRoute,
} from "../../../src/components";

describe("createStack", () => {
    let k8sProvider: k8s.Provider;

    beforeEach(() => {
        vi.clearAllMocks();
        k8sProvider = new k8s.Provider("test", {});

        // Default mock implementations
        (createProvider as Mock).mockReturnValue({
            provider: k8sProvider,
            cluster: {},
            clusterId: "test-cluster-id",
            kubeconfig: "test-kubeconfig",
        });
        (createBaseInfrastructureResources as Mock).mockReturnValue({
            certManager: {},
            nginxGateway: {},
        });
        (createGatewayResources as Mock).mockReturnValue({ gateway: {} });
        (createDatabaseResources as Mock).mockReturnValue({ deployment: {} });
        (createApplicationResources as Mock).mockReturnValue({ api: {}, web: {} });
        (createMonitoringResources as Mock).mockReturnValue({
            prometheus: {},
            grafana: {},
        });
        (createNamespace as Mock).mockReturnValue({
            namespace: { metadata: { name: pulumi.output("test-ns") } },
            resourceQuota: {},
        });
        (createImagePullSecret as Mock).mockReturnValue({ secret: {} });
        (createHTTPSRedirectRoute as Mock).mockReturnValue({});
        (createWWWRedirectRoute as Mock).mockReturnValue({});
    });

    describe("local environment", () => {
        it("should create base infrastructure for local", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "local",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("local");

            expect(createBaseInfrastructureResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "local",
                    provider: k8sProvider,
                })
            );
        });

        it("should create gateway with local config", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "local",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("local");

            expect(createGatewayResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "local",
                    provider: k8sProvider,
                    gatewayConfig: expect.objectContaining({
                        tlsMode: "self-signed",
                        domains: ["*.aphiria.com"],
                    }),
                })
            );
        });

        it("should create database in default namespace for local", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "local",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("local");

            expect(createDatabaseResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "local",
                    provider: k8sProvider,
                    namespace: "default",
                })
            );
        });

        it("should create monitoring resources for local", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "local",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: { namespace: "monitoring" },
                prometheus: { storageSize: "10Gi" },
            });

            createStack("local");

            expect(createMonitoringResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "local",
                    provider: k8sProvider,
                })
            );
        });

        it("should create WWW redirect for local (non-preview)", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "local",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("local");

            expect(createWWWRedirectRoute).toHaveBeenCalledWith(
                expect.objectContaining({
                    namespace: "nginx-gateway",
                    gatewayName: "nginx-gateway",
                    rootDomain: "aphiria.com",
                    wwwDomain: "www.aphiria.com",
                })
            );
        });

        it("should create HTTPS redirect with skipRootListener=true when WWW redirect exists", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "local",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("local");

            expect(createHTTPSRedirectRoute).toHaveBeenCalledWith(
                expect.objectContaining({
                    skipRootListener: true, // WWW redirect exists for local
                })
            );
        });

        it("should not create namespace for local (uses default)", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "local",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("local");

            expect(createNamespace).not.toHaveBeenCalled();
        });
    });

    describe("preview environment", () => {
        it("should create base infrastructure for preview", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "preview-pr-123",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: { name: "preview-pr-123" },
                grafana: { hostname: "grafana.preview.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("preview");

            expect(createBaseInfrastructureResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "preview",
                    provider: k8sProvider,
                })
            );
        });

        it("should create namespace when configured for preview", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "preview-pr-123",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: {
                    name: "preview-pr-123",
                    resourceQuota: { cpu: "2", memory: "4Gi", pods: "10" },
                },
                grafana: { hostname: "grafana.preview.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("preview");

            expect(createNamespace).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "preview-pr-123",
                    environmentLabel: "preview",
                    resourceQuota: { cpu: "2", memory: "4Gi", pods: "10" },
                })
            );
        });

        it("should pass isPreviewPR=true to applications when stackName starts with preview-pr-", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "preview-pr-123",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: { name: "preview-pr-123" },
                app: { web: { url: "https://pr-123.pr.aphiria.com" } },
                grafana: { hostname: "grafana.preview.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("preview");

            expect(createApplicationResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    isPreviewPR: true,
                    hasNamespaceConfig: true,
                })
            );
        });

        it("should NOT deploy applications for preview-base infrastructure-only stack", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "preview-base",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: { name: "default" },
                // App config is inherited from base Pulumi.yaml but should be ignored for preview-base
                app: { web: { url: "https://www.aphiria.com" } },
                grafana: { hostname: "pr-grafana.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            const stack = createStack("preview");

            // Preview-base should NOT deploy applications (infrastructure only)
            expect(createApplicationResources).not.toHaveBeenCalled();
            expect(stack.applications).toBeUndefined();
        });

        it("should NOT create WWW redirect for preview", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "preview-pr-123",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: { name: "preview-pr-123" },
                grafana: { hostname: "grafana.preview.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("preview");

            expect(createWWWRedirectRoute).not.toHaveBeenCalled();
        });

        it("should create HTTPS redirect with skipRootListener=false for preview (no WWW redirect)", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "preview-pr-123",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: { name: "preview-pr-123" },
                grafana: { hostname: "grafana.preview.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("preview");

            expect(createHTTPSRedirectRoute).toHaveBeenCalledWith(
                expect.objectContaining({
                    skipRootListener: false, // No WWW redirect for preview
                })
            );
        });
    });

    describe("production environment", () => {
        it("should NOT create base infrastructure for production (managed externally)", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: true,
                gateway: {
                    tlsMode: "letsencrypt-prod",
                    domains: ["aphiria.com", "*.aphiria.com"],
                },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("production");

            expect(createBaseInfrastructureResources).not.toHaveBeenCalled();
        });

        it("should NOT create gateway when skipBaseInfrastructure=true", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: true,
                gateway: {
                    tlsMode: "letsencrypt-prod",
                    domains: ["aphiria.com", "*.aphiria.com"],
                },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("production");

            expect(createGatewayResources).not.toHaveBeenCalled();
        });

        it("should create database in default namespace for production", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: true,
                gateway: {
                    tlsMode: "letsencrypt-prod",
                    domains: ["aphiria.com", "*.aphiria.com"],
                },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("production");

            expect(createDatabaseResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "production",
                    namespace: "default",
                })
            );
        });

        it("should create imagePullSecret in default namespace when configured", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: true,
                gateway: {
                    tlsMode: "letsencrypt-prod",
                    domains: ["aphiria.com", "*.aphiria.com"],
                },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: {
                    imagePullSecret: {
                        registry: "ghcr.io",
                        username: "user",
                        token: pulumi.output("ghp_token"),
                    },
                },
                grafana: { hostname: "grafana.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("production");

            expect(createImagePullSecret).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ghcr-pull-secret",
                    namespace: "default",
                    registry: "ghcr.io",
                    username: "user",
                })
            );
        });

        it("should NOT create WWW redirect when skipBaseInfrastructure=true", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: true,
                gateway: {
                    tlsMode: "letsencrypt-prod",
                    domains: ["aphiria.com", "*.aphiria.com"],
                },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("production");

            expect(createWWWRedirectRoute).not.toHaveBeenCalled();
            expect(createHTTPSRedirectRoute).not.toHaveBeenCalled();
        });
    });

    describe("conditional resource creation", () => {
        it("should deploy applications for preview-pr stacks even with inherited app config", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "preview-pr-456",
                skipBaseInfrastructure: true,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: { name: "preview-pr-456" },
                // App config inherited from base - should deploy for preview-PR
                app: {
                    web: { url: "https://456.pr.aphiria.com" },
                    api: { url: "https://456.pr-api.aphiria.com" },
                },
                grafana: { hostname: "pr-grafana.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("preview");

            // Preview-PR should deploy applications (not infrastructure-only)
            expect(createApplicationResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "preview",
                    isPreviewPR: true,
                    appConfig: expect.objectContaining({
                        web: { url: "https://456.pr.aphiria.com" },
                    }),
                })
            );
        });

        it("should not create applications when app config is missing web.url", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            const stack = createStack("local");

            expect(createApplicationResources).not.toHaveBeenCalled();
            expect(stack.applications).toBeUndefined();
        });

        it("should create applications when app.web.url is configured", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                app: {
                    web: { url: "https://www.aphiria.com" },
                    api: { url: "https://api.aphiria.com" },
                },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("local");

            expect(createApplicationResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    env: "local",
                    namespace: "default",
                    appConfig: expect.objectContaining({
                        web: { url: "https://www.aphiria.com" },
                    }),
                })
            );
        });

        it("should not create monitoring when grafana.hostname is missing", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
            });

            const stack = createStack("local");

            expect(createMonitoringResources).not.toHaveBeenCalled();
            expect(stack.monitoring).toBeUndefined();
        });

        it("should not create monitoring when skipBaseInfrastructure=true (preview-pr uses preview-base monitoring)", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "preview-pr-148",
                skipBaseInfrastructure: true,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: { name: "preview-pr-148" },
                // Grafana config inherited from base, but should not create resources
                grafana: { hostname: "grafana.preview.aphiria.com" },
                monitoring: { namespace: "monitoring" },
                prometheus: { storageSize: "10Gi" },
            });

            const stack = createStack("preview");

            expect(createMonitoringResources).not.toHaveBeenCalled();
            expect(stack.monitoring).toBeUndefined();
        });

        it("should not create imagePullSecret when namespace was already created", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: {
                    name: "preview-pr-123",
                    imagePullSecret: {
                        registry: "ghcr.io",
                        username: "user",
                        token: pulumi.output("ghp_token"),
                    },
                },
                grafana: { hostname: "grafana.preview.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("preview");

            // Should NOT call createImagePullSecret because namespace creation handles it
            expect(createImagePullSecret).not.toHaveBeenCalled();
        });
    });

    describe("provider handling", () => {
        it("should use provided k8sProvider when passed explicitly", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("local", k8sProvider);

            // Should NOT call createProvider when explicit provider is passed
            expect(createProvider).not.toHaveBeenCalled();
        });

        it("should create provider when k8sProvider is not passed", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.preview.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("preview");

            // Should call createProvider when no explicit provider is passed
            expect(createProvider).toHaveBeenCalledWith("preview");
        });
    });

    describe("namespace handling", () => {
        it("should use created namespace name for database and applications", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "letsencrypt-prod", domains: ["*.pr.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                namespace: { name: "preview-pr-456" },
                app: { web: { url: "https://pr-456.pr.aphiria.com" } },
                grafana: { hostname: "grafana.preview.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            // Mock namespace creation to return the namespace name
            (createNamespace as Mock).mockReturnValue({
                namespace: { metadata: { name: pulumi.output("preview-pr-456") } },
                resourceQuota: {},
            });

            createStack("preview");

            // Verify namespace was passed to factories
            const dbCall = (createDatabaseResources as Mock).mock.calls[0][0];
            expect(dbCall.namespace).toBeDefined();

            const appCall = (createApplicationResources as Mock).mock.calls[0][0];
            expect(appCall.namespace).toBeDefined();
        });

        it("should use default namespace when no namespace config exists", () => {
            (loadConfig as Mock).mockReturnValue({
                stackName: "production",
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
                grafana: { hostname: "grafana.local.aphiria.com" },
                monitoring: {},
                prometheus: {},
            });

            createStack("local");

            expect(createDatabaseResources).toHaveBeenCalledWith(
                expect.objectContaining({
                    namespace: "default",
                })
            );
        });
    });
});
