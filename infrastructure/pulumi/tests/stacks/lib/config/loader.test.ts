import { describe, it, expect, beforeEach } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import { deepMerge, loadConfig, validateConfig } from "../../../../src/stacks/lib/config/loader";
import { Config } from "../../../../src/stacks/lib/config/loader";

/**
 * Helper to create a partial Config object for testing validateConfig
 * Automatically adds the required stackName field based on the test context
 */
function createTestConfig(stackName: string, partialConfig: Partial<Config>): Config {
    return {
        stackName,
        ...partialConfig,
    } as Config;
}

describe("deepMerge", () => {
    describe("primitives", () => {
        it("should override string values", () => {
            const base = { name: "base" };
            const overrides = { name: "override" };
            const result = deepMerge(base, overrides);

            expect(result!.name).toBe("override");
        });

        it("should override number values", () => {
            const base = { count: 1 };
            const overrides = { count: 2 };
            const result = deepMerge(base, overrides);

            expect(result!.count).toBe(2);
        });

        it("should override boolean values", () => {
            const base = { enabled: false };
            const overrides = { enabled: true };
            const result = deepMerge(base, overrides);

            expect(result!.enabled).toBe(true);
        });

        it("should keep base values when override is undefined", () => {
            const base = { name: "base", count: 1 };
            const overrides = { name: undefined };
            const result = deepMerge(base, overrides);

            expect(result!.name).toBe("base");
            expect(result!.count).toBe(1);
        });
    });

    describe("arrays", () => {
        it("should replace entire array", () => {
            const base = { items: [1, 2, 3] };
            const overrides = { items: [4, 5] };
            const result = deepMerge(base, overrides);

            expect(result!.items).toEqual([4, 5]);
            expect(result!.items.length).toBe(2);
        });

        it("should replace with empty array", () => {
            const base = { items: [1, 2, 3] };
            const overrides = { items: [] };
            const result = deepMerge(base, overrides);

            expect(result!.items).toEqual([]);
            expect(result!.items.length).toBe(0);
        });

        it("should replace arrays of objects", () => {
            const base = { items: [{ id: 1 }, { id: 2 }] };
            const overrides = { items: [{ id: 3 }] };
            const result = deepMerge(base, overrides);

            expect(result!.items.length).toBe(1);
            expect(result!.items[0]).toEqual({ id: 3 });
        });

        it("should replace non-array base with array override", () => {
            const base: any = { items: "not an array" };
            const overrides = { items: [1, 2, 3] };
            const result = deepMerge(base, overrides);

            expect(result!.items).toEqual([1, 2, 3]);
            expect(result!.items.length).toBe(3);
        });
    });

    describe("objects", () => {
        it("should recursively merge nested objects", () => {
            const base = {
                outer: {
                    inner: { value: 1 },
                    keep: "base",
                },
            };
            const overrides = {
                outer: {
                    inner: { value: 2 },
                },
            };
            const result = deepMerge(base, overrides);

            expect(result!.outer.inner.value).toBe(2);
            expect(result!.outer.keep).toBe("base");
        });

        it("should merge deeply nested objects", () => {
            const base = {
                level1: {
                    level2: {
                        level3: { value: "base", keep: true },
                    },
                },
            };
            const overrides = {
                level1: {
                    level2: {
                        level3: { value: "override" },
                    },
                },
            };
            const result = deepMerge(base, overrides);

            expect(result!.level1.level2.level3.value).toBe("override");
            expect(result!.level1.level2.level3.keep).toBe(true);
        });

        it("should add new properties", () => {
            const base = { existing: "base" };
            const overrides = { existing: "override", newProp: "new" };
            const result = deepMerge(base, overrides) as typeof base & typeof overrides;

            expect(result!.existing).toBe("override");
            expect(result!.newProp).toBe("new");
        });
    });

    describe("undefined handling", () => {
        it("should return base when overrides is undefined", () => {
            const base = { name: "base" };
            const result = deepMerge(base, undefined);

            expect(result).toEqual(base);
            expect(result?.name).toBe("base");
        });

        it("should return overrides when base is undefined", () => {
            const overrides = { name: "override", value: 123 };
            const result = deepMerge<{ name: string; value: number }>(undefined, overrides);

            expect(result).toEqual(overrides);
            expect(result?.name).toBe("override");
            expect(result?.value).toBe(123);
        });

        it("should return undefined when both base and overrides are undefined", () => {
            const result = deepMerge(undefined, undefined);

            expect(result).toBeUndefined();
        });

        it("should handle undefined base with nested overrides", () => {
            const overrides = {
                imagePullSecret: {
                    username: "user",
                    token: "secret",
                },
            };
            const result = deepMerge<typeof overrides>(undefined, overrides);

            expect(result).toEqual(overrides);
            expect(result?.imagePullSecret?.username).toBe("user");
        });

        it("should not mutate base object", () => {
            const base = { name: "base", nested: { value: 1 } };
            const overrides = { name: "override", nested: { value: 2 } };
            const result = deepMerge(base, overrides);

            expect(base.name).toBe("base");
            expect(base.nested.value).toBe(1);
            expect(result?.name).toBe("override");
            expect(result?.nested?.value).toBe(2);
        });
    });

    describe("edge cases", () => {
        it("should handle empty base object", () => {
            const base = {};
            const overrides = { name: "override" };
            const result = deepMerge(base, overrides) as typeof overrides;

            expect(result!.name).toBe("override");
        });

        it("should handle empty overrides object", () => {
            const base = { name: "base" };
            const overrides = {};
            const result = deepMerge(base, overrides);

            expect(result!.name).toBe("base");
        });

        it("should handle both empty", () => {
            const base = {};
            const overrides = {};
            const result = deepMerge(base, overrides);

            expect(result).toEqual({});
            expect(Object.keys(result!).length).toBe(0);
        });

        it("should add nested properties that do not exist in base", () => {
            const base = {
                gateway: {
                    tlsMode: "letsencrypt",
                    domains: ["example.com"],
                },
            };
            const overrides = {
                gateway: {
                    dns: {
                        domain: "example.com",
                        records: [{ name: "www" }],
                    },
                },
            };
            const result = deepMerge(base, overrides as any);

            // Base properties preserved
            expect(result!.gateway.tlsMode).toBe("letsencrypt");
            expect(result!.gateway.domains).toEqual(["example.com"]);
            // New nested properties added
            expect((result!.gateway as any).dns.domain).toBe("example.com");
            expect((result!.gateway as any).dns.records).toEqual([{ name: "www" }]);
        });

        it("should add deeply nested properties when intermediate objects missing", () => {
            const base = {
                app: { web: { replicas: 3 } },
            };
            const overrides = {
                app: {
                    api: {
                        resources: {
                            limits: { cpu: "500m" },
                        },
                    },
                },
            };
            const result = deepMerge(base, overrides as any);

            // Base preserved
            expect(result!.app.web.replicas).toBe(3);
            // New deeply nested structure added
            expect((result!.app as any).api.resources.limits.cpu).toBe("500m");
        });
    });
});

describe("loadConfig", () => {
    beforeEach(() => {
        pulumi.runtime.setAllConfig({});
    });

    it("should load and merge config with overrides for valid local stack", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:app",
            JSON.stringify({ web: { replicas: 3, image: "prod" } })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:postgresql",
            JSON.stringify({ host: "db.svc" })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:prometheus",
            JSON.stringify({ authToken: "token" })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:grafana",
            JSON.stringify({ hostname: "grafana.local" })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:gateway",
            JSON.stringify({ tlsMode: "self-signed" })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:monitoring",
            JSON.stringify({ namespace: { resourceQuota: { cpu: "4" } } })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:overrides",
            JSON.stringify({ app: { web: { replicas: 1 } }, postgresql: { host: "db" } })
        );

        const config = loadConfig();

        // Verify merge happened correctly
        expect(config.app?.web?.replicas).toBe(1); // Overridden
        expect(config.app?.web?.image).toBe("prod"); // From base
        expect(config.postgresql?.host).toBe("db"); // Overridden
    });

    it("should throw validation error for missing required local configuration", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:app",
            JSON.stringify({ web: { replicas: 1 } })
        );
        // Missing other required config for local

        expect(() => loadConfig()).toThrow(/Configuration validation failed for stack "local"/);
        expect(() => loadConfig()).toThrow(/postgresql configuration is required for local/);
    });
});

describe("validateConfig", () => {
    describe("production stack", () => {
        it("should pass validation with valid config", () => {
            const config = createTestConfig("production", {
                cluster: {} as any,
                app: {} as any,
                postgresql: {} as any,
                prometheus: {} as any,
                grafana: {} as any,
                gateway: { dns: {} as any } as any,
                monitoring: {} as any,
            });

            expect(() => validateConfig("production", config)).not.toThrow();
        });

        it("should fail validation with invalid config and list all errors", () => {
            const config = createTestConfig("production", {
                namespace: { name: "test" } as any,
                skipBaseInfrastructure: true,
            });

            expect(() => validateConfig("production", config)).toThrow(
                /Configuration validation failed for stack "production"/
            );
            expect(() => validateConfig("production", config)).toThrow(
                /cluster configuration is required for production/
            );
            expect(() => validateConfig("production", config)).toThrow(
                /app configuration is required for production/
            );
            expect(() => validateConfig("production", config)).toThrow(
                /postgresql configuration is required for production/
            );
            expect(() => validateConfig("production", config)).toThrow(
                /prometheus configuration is required for production/
            );
            expect(() => validateConfig("production", config)).toThrow(
                /grafana configuration is required for production/
            );
            expect(() => validateConfig("production", config)).toThrow(
                /gateway configuration is required for production/
            );
            expect(() => validateConfig("production", config)).toThrow(
                /monitoring configuration is required for production/
            );
            // Note: namespace validation removed - production can have namespace config for imagePullSecret
            expect(() => validateConfig("production", config)).toThrow(
                /skipBaseInfrastructure should not be set in production/
            );
        });

        it("should fail when gateway exists but dns is missing", () => {
            const config = createTestConfig("production", {
                cluster: {} as any,
                app: {} as any,
                postgresql: {} as any,
                prometheus: {} as any,
                grafana: {} as any,
                gateway: {} as any,
                monitoring: {} as any,
            });

            expect(() => validateConfig("production", config)).toThrow(
                /gateway\.dns configuration is required for production/
            );
        });
    });

    describe("preview-base stack", () => {
        it("should pass validation with valid config", () => {
            const config = createTestConfig("preview-base", {
                cluster: {} as any,
                postgresql: {} as any,
                prometheus: {} as any,
                grafana: {} as any,
                gateway: { dns: {} as any } as any,
                monitoring: {} as any,
            });

            expect(() => validateConfig("preview-base", config)).not.toThrow();
        });

        it("should pass validation with namespace config present (inherited from base)", () => {
            const config = createTestConfig("preview-base", {
                cluster: {} as any,
                postgresql: {} as any,
                prometheus: {} as any,
                grafana: {} as any,
                gateway: { dns: {} as any } as any,
                monitoring: {} as any,
                namespace: { name: "test" } as any,
            });

            expect(() => validateConfig("preview-base", config)).not.toThrow();
        });

        it("should fail validation with invalid config and list all errors", () => {
            const config = createTestConfig("preview-base", {
                skipBaseInfrastructure: true,
            });

            expect(() => validateConfig("preview-base", config)).toThrow(
                /Configuration validation failed for stack "preview-base"/
            );
            expect(() => validateConfig("preview-base", config)).toThrow(
                /cluster configuration is required for preview-base/
            );
            expect(() => validateConfig("preview-base", config)).toThrow(
                /postgresql configuration is required for preview-base/
            );
            expect(() => validateConfig("preview-base", config)).toThrow(
                /prometheus configuration is required for preview-base/
            );
            expect(() => validateConfig("preview-base", config)).toThrow(
                /grafana configuration is required for preview-base/
            );
            expect(() => validateConfig("preview-base", config)).toThrow(
                /gateway configuration is required for preview-base/
            );
            expect(() => validateConfig("preview-base", config)).toThrow(
                /monitoring configuration is required for preview-base/
            );
            expect(() => validateConfig("preview-base", config)).toThrow(
                /skipBaseInfrastructure should not be set in preview-base/
            );
        });

        it("should fail when gateway exists but dns is missing", () => {
            const config = createTestConfig("preview-base", {
                cluster: {} as any,
                postgresql: {} as any,
                prometheus: {} as any,
                grafana: {} as any,
                gateway: {} as any,
                monitoring: {} as any,
            });

            expect(() => validateConfig("preview-base", config)).toThrow(
                /gateway\.dns configuration is required for preview-base/
            );
        });
    });

    describe("preview-pr stack", () => {
        it("should pass validation with valid config", () => {
            const config = createTestConfig("preview-pr-123", {
                namespace: { name: "pr-123" } as any,
                app: {} as any,
                postgresql: { createDatabase: true, databaseName: "aphiria_pr_123" } as any,
                prometheus: {} as any,
                skipBaseInfrastructure: true,
            });

            expect(() => validateConfig("preview-pr-123", config)).not.toThrow();
        });

        it("should fail validation with invalid config and list all errors", () => {
            const config = createTestConfig("preview-pr-123", {
                cluster: {} as any,
                gateway: {} as any,
                grafana: {} as any,
                monitoring: {} as any,
            });

            expect(() => validateConfig("preview-pr-456", config)).toThrow(
                /Configuration validation failed for stack "preview-pr-456"/
            );
            expect(() => validateConfig("preview-pr-456", config)).toThrow(
                /namespace configuration is required for preview-pr/
            );
            expect(() => validateConfig("preview-pr-456", config)).toThrow(
                /app configuration is required for preview-pr/
            );
            expect(() => validateConfig("preview-pr-456", config)).toThrow(
                /postgresql configuration is required for preview-pr/
            );
            expect(() => validateConfig("preview-pr-456", config)).toThrow(
                /prometheus configuration is required for preview-pr/
            );
            expect(() => validateConfig("preview-pr-456", config)).toThrow(
                /skipBaseInfrastructure must be true for preview-pr/
            );
            // Note: cluster, gateway, grafana, monitoring can be present (inherited) but won't be used
        });

        it("should fail when namespace exists but name is missing", () => {
            const config = createTestConfig("preview-pr-123", {
                namespace: {} as any,
                app: {} as any,
                postgresql: { createDatabase: true, databaseName: "aphiria_pr_123" } as any,
                prometheus: {} as any,
                skipBaseInfrastructure: true,
            });

            expect(() => validateConfig("preview-pr-123", config)).toThrow(
                /namespace\.name is required for preview-pr/
            );
        });

        it("should fail when postgresql exists but createDatabase is false", () => {
            const config = createTestConfig("preview-pr-123", {
                namespace: { name: "pr-123" } as any,
                app: {} as any,
                postgresql: { createDatabase: false, databaseName: "aphiria_pr_123" } as any,
                prometheus: {} as any,
                skipBaseInfrastructure: true,
            });

            expect(() => validateConfig("preview-pr-123", config)).toThrow(
                /postgresql\.createDatabase must be true for preview-pr/
            );
        });

        it("should fail when postgresql exists but databaseName is missing", () => {
            const config = createTestConfig("preview-pr-123", {
                namespace: { name: "pr-123" } as any,
                app: {} as any,
                postgresql: { createDatabase: true } as any,
                prometheus: {} as any,
                skipBaseInfrastructure: true,
            });

            expect(() => validateConfig("preview-pr-123", config)).toThrow(
                /postgresql\.databaseName is required for preview-pr/
            );
        });
    });

    describe("local stack", () => {
        it("should pass validation with valid config", () => {
            const config = createTestConfig("local", {
                app: {} as any,
                postgresql: {} as any,
                prometheus: {} as any,
                grafana: {} as any,
                gateway: {} as any,
                monitoring: {} as any,
            });

            expect(() => validateConfig("local", config)).not.toThrow();
        });

        it("should fail validation with invalid config and list all errors", () => {
            const config = createTestConfig("local", {
                namespace: { name: "test" } as any,
            });

            expect(() => validateConfig("local", config)).toThrow(
                /Configuration validation failed for stack "local"/
            );
            expect(() => validateConfig("local", config)).toThrow(
                /app configuration is required for local/
            );
            expect(() => validateConfig("local", config)).toThrow(
                /postgresql configuration is required for local/
            );
            expect(() => validateConfig("local", config)).toThrow(
                /prometheus configuration is required for local/
            );
            expect(() => validateConfig("local", config)).toThrow(
                /grafana configuration is required for local/
            );
            expect(() => validateConfig("local", config)).toThrow(
                /gateway configuration is required for local/
            );
            expect(() => validateConfig("local", config)).toThrow(
                /monitoring configuration is required for local/
            );
            expect(() => validateConfig("local", config)).toThrow(
                /namespace configuration should not be present in local/
            );
        });
    });

    describe("unknown stack", () => {
        it("should fail for unknown stack name", () => {
            const config = createTestConfig("unknown", {});

            expect(() => validateConfig("unknown-stack", config)).toThrow(
                /Unknown stack: unknown-stack/
            );
        });
    });
});
