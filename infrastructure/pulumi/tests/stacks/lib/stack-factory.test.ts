import { describe, it, expect, beforeEach } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createStack } from "../../../src/stacks/lib/stack-factory";

// Mock all the dependencies
jest.mock("../../../src/stacks/lib/config/loader");
jest.mock("../../../src/stacks/lib/factories/base-infrastructure");
jest.mock("../../../src/stacks/lib/factories/provider");
jest.mock("../../../src/stacks/lib/factories/gateway");
jest.mock("../../../src/stacks/lib/factories/database");
jest.mock("../../../src/stacks/lib/factories/applications");
jest.mock("../../../src/stacks/lib/factories/monitoring");
jest.mock("../../../src/components");

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
        jest.clearAllMocks();
        k8sProvider = new k8s.Provider("test", {});

        // Default mock implementations
        (createProvider as jest.Mock).mockReturnValue({
            provider: k8sProvider,
            cluster: {},
            clusterId: "test-cluster-id",
            kubeconfig: "test-kubeconfig",
        });
        (createBaseInfrastructureResources as jest.Mock).mockReturnValue({
            certManager: {},
            nginxGateway: {},
        });
        (createGatewayResources as jest.Mock).mockReturnValue({ gateway: {} });
        (createDatabaseResources as jest.Mock).mockReturnValue({ deployment: {} });
        (createApplicationResources as jest.Mock).mockReturnValue({ api: {}, web: {} });
        (createMonitoringResources as jest.Mock).mockReturnValue({
            prometheus: {},
            grafana: {},
        });
        (createNamespace as jest.Mock).mockReturnValue({
            namespace: { metadata: { name: pulumi.output("test-ns") } },
            resourceQuota: {},
        });
        (createImagePullSecret as jest.Mock).mockReturnValue({ secret: {} });
        (createHTTPSRedirectRoute as jest.Mock).mockReturnValue({});
        (createWWWRedirectRoute as jest.Mock).mockReturnValue({});
    });

    describe("local environment", () => {
        it("should create base infrastructure for local", () => {
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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

        it("should pass isPreviewPR=true to applications when namespace config exists", () => {
            (loadConfig as jest.Mock).mockReturnValue({
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

        it("should NOT create WWW redirect for preview", () => {
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
        it("should not create applications when app config is missing web.url", () => {
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
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
            (loadConfig as jest.Mock).mockReturnValue({
                skipBaseInfrastructure: false,
                gateway: { tlsMode: "self-signed", domains: ["*.aphiria.com"] },
                postgresql: { user: "postgres", password: pulumi.output("password") },
            });

            const stack = createStack("local");

            expect(createMonitoringResources).not.toHaveBeenCalled();
            expect(stack.monitoring).toBeUndefined();
        });

        it("should not create imagePullSecret when namespace was already created", () => {
            (loadConfig as jest.Mock).mockReturnValue({
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

    describe("namespace handling", () => {
        it("should use created namespace name for database and applications", () => {
            (loadConfig as jest.Mock).mockReturnValue({
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
            (createNamespace as jest.Mock).mockReturnValue({
                namespace: { metadata: { name: pulumi.output("preview-pr-456") } },
                resourceQuota: {},
            });

            createStack("preview");

            // Verify namespace was passed to factories
            const dbCall = (createDatabaseResources as jest.Mock).mock.calls[0][0];
            expect(dbCall.namespace).toBeDefined();

            const appCall = (createApplicationResources as jest.Mock).mock.calls[0][0];
            expect(appCall.namespace).toBeDefined();
        });

        it("should use default namespace when no namespace config exists", () => {
            (loadConfig as jest.Mock).mockReturnValue({
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
