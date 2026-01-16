import { describe, it, expect, beforeEach } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import { deepMerge, loadConfig, validateConfig } from "../../../../src/stacks/lib/config/loader";
import { Config } from "../../../../src/stacks/lib/config/loader";

describe("deepMerge", () => {
    describe("primitives", () => {
        it("should override string values", () => {
            const base = { name: "base" };
            const overrides = { name: "override" };
            const result = deepMerge(base, overrides);

            expect(result.name).toBe("override");
        });

        it("should override number values", () => {
            const base = { count: 1 };
            const overrides = { count: 2 };
            const result = deepMerge(base, overrides);

            expect(result.count).toBe(2);
        });

        it("should override boolean values", () => {
            const base = { enabled: false };
            const overrides = { enabled: true };
            const result = deepMerge(base, overrides);

            expect(result.enabled).toBe(true);
        });

        it("should keep base values when override is undefined", () => {
            const base = { name: "base", count: 1 };
            const overrides = { name: undefined };
            const result = deepMerge(base, overrides);

            expect(result.name).toBe("base");
            expect(result.count).toBe(1);
        });
    });

    describe("arrays", () => {
        it("should replace entire array", () => {
            const base = { items: [1, 2, 3] };
            const overrides = { items: [4, 5] };
            const result = deepMerge(base, overrides);

            expect(result.items).toEqual([4, 5]);
            expect(result.items.length).toBe(2);
        });

        it("should replace with empty array", () => {
            const base = { items: [1, 2, 3] };
            const overrides = { items: [] };
            const result = deepMerge(base, overrides);

            expect(result.items).toEqual([]);
            expect(result.items.length).toBe(0);
        });

        it("should replace arrays of objects", () => {
            const base = { items: [{ id: 1 }, { id: 2 }] };
            const overrides = { items: [{ id: 3 }] };
            const result = deepMerge(base, overrides);

            expect(result.items.length).toBe(1);
            expect(result.items[0]).toEqual({ id: 3 });
        });

        it("should replace non-array base with array override", () => {
            const base: any = { items: "not an array" };
            const overrides = { items: [1, 2, 3] };
            const result = deepMerge(base, overrides);

            expect(result.items).toEqual([1, 2, 3]);
            expect(result.items.length).toBe(3);
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

            expect(result.outer.inner.value).toBe(2);
            expect(result.outer.keep).toBe("base");
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

            expect(result.level1.level2.level3.value).toBe("override");
            expect(result.level1.level2.level3.keep).toBe(true);
        });

        it("should add new properties", () => {
            const base = { existing: "base" };
            const overrides = { existing: "override", newProp: "new" };
            const result = deepMerge(base, overrides) as typeof base & typeof overrides;

            expect(result.existing).toBe("override");
            expect(result.newProp).toBe("new");
        });
    });

    describe("undefined handling", () => {
        it("should return base when overrides is undefined", () => {
            const base = { name: "base" };
            const result = deepMerge(base, undefined);

            expect(result).toEqual(base);
            expect(result.name).toBe("base");
        });

        it("should not mutate base object", () => {
            const base = { name: "base", nested: { value: 1 } };
            const overrides = { name: "override", nested: { value: 2 } };
            const result = deepMerge(base, overrides);

            expect(base.name).toBe("base");
            expect(base.nested.value).toBe(1);
            expect(result.name).toBe("override");
            expect(result.nested.value).toBe(2);
        });
    });

    describe("edge cases", () => {
        it("should handle empty base object", () => {
            const base = {};
            const overrides = { name: "override" };
            const result = deepMerge(base, overrides) as typeof overrides;

            expect(result.name).toBe("override");
        });

        it("should handle empty overrides object", () => {
            const base = { name: "base" };
            const overrides = {};
            const result = deepMerge(base, overrides);

            expect(result.name).toBe("base");
        });

        it("should handle both empty", () => {
            const base = {};
            const overrides = {};
            const result = deepMerge(base, overrides);

            expect(result).toEqual({});
            expect(Object.keys(result).length).toBe(0);
        });
    });

    describe("debug logging", () => {
        let originalEnv: string | undefined;

        beforeEach(() => {
            originalEnv = process.env.PULUMI_DEBUG_MERGE;
        });

        afterEach(() => {
            if (originalEnv === undefined) {
                delete process.env.PULUMI_DEBUG_MERGE;
            } else {
                process.env.PULUMI_DEBUG_MERGE = originalEnv;
            }
        });

        it("should log debug info for primitive changes when PULUMI_DEBUG_MERGE is set", async () => {
            process.env.PULUMI_DEBUG_MERGE = "true";
            jest.resetModules();
            const { deepMerge: deepMergeDebug } =
                await import("../../../../src/stacks/lib/config/loader");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();

            const base = { name: "base" };
            const overrides = { name: "override" };
            deepMergeDebug(base, overrides);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[MERGE]"));
            consoleSpy.mockRestore();
        });

        it("should log debug info for array replacements when PULUMI_DEBUG_MERGE is set", async () => {
            process.env.PULUMI_DEBUG_MERGE = "true";
            jest.resetModules();
            const { deepMerge: deepMergeDebug } =
                await import("../../../../src/stacks/lib/config/loader");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();

            const base = { items: [1, 2, 3] };
            const overrides = { items: [4, 5] };
            deepMergeDebug(base, overrides);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[MERGE]"));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("array replaced"));
            consoleSpy.mockRestore();
        });
    });
});

describe("loadConfig", () => {
    beforeEach(() => {
        pulumi.runtime.setAllConfig({});
    });

    it("should load app config with overrides", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:app",
            JSON.stringify({ web: { replicas: 3, image: "prod" } })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:overrides",
            JSON.stringify({ app: { web: { replicas: 1 } } })
        );

        const config = loadConfig();

        expect(config.app?.web?.replicas).toBe(1);
        expect(config.app?.web?.image).toBe("prod");
    });

    it("should load postgresql config with overrides", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:postgresql",
            JSON.stringify({ user: "postgres", host: "db.svc" })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:overrides",
            JSON.stringify({ postgresql: { host: "db" } })
        );

        const config = loadConfig();

        expect(config.postgresql?.user).toBe("postgres");
        expect(config.postgresql?.host).toBe("db");
    });

    it("should load prometheus config with overrides", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:prometheus",
            JSON.stringify({ authToken: "token", scrapeInterval: "15s" })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:overrides",
            JSON.stringify({ prometheus: { scrapeInterval: "30s" } })
        );

        const config = loadConfig();

        expect(config.prometheus?.authToken).toBe("token");
        expect(config.prometheus?.scrapeInterval).toBe("30s");
    });

    it("should load grafana config with overrides", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:grafana",
            JSON.stringify({ hostname: "grafana.prod", version: "11.0.0" })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:overrides",
            JSON.stringify({ grafana: { hostname: "grafana.local" } })
        );

        const config = loadConfig();

        expect(config.grafana?.hostname).toBe("grafana.local");
        expect(config.grafana?.version).toBe("11.0.0");
    });

    it("should load gateway config with overrides", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:gateway",
            JSON.stringify({ tlsMode: "letsencrypt", domains: ["example.com"] })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:overrides",
            JSON.stringify({ gateway: { tlsMode: "self-signed" } })
        );

        const config = loadConfig();

        expect(config.gateway?.tlsMode).toBe("self-signed");
        expect(config.gateway?.domains).toEqual(["example.com"]);
    });

    it("should load namespace config with overrides", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:namespace",
            JSON.stringify({ name: "prod" })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:overrides",
            JSON.stringify({ namespace: { name: "local" } })
        );

        const config = loadConfig();

        expect(config.namespace?.name).toBe("local");
    });

    it("should load monitoring config with overrides", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:monitoring",
            JSON.stringify({ namespace: { resourceQuota: { cpu: "4", memory: "16Gi" } } })
        );
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:overrides",
            JSON.stringify({ monitoring: { namespace: { resourceQuota: { cpu: "2" } } } })
        );

        const config = loadConfig();

        expect(config.monitoring?.namespace?.resourceQuota?.cpu).toBe("2");
        expect(config.monitoring?.namespace?.resourceQuota?.memory).toBe("16Gi");
    });

    it("should load skipBaseInfrastructure flag", () => {
        pulumi.runtime.setConfig("aphiria-com-infrastructure:skipBaseInfrastructure", "true");

        const config = loadConfig();

        expect(config.skipBaseInfrastructure).toBe(true);
    });

    it("should return undefined when skipBaseInfrastructure not set", () => {
        const config = loadConfig();

        expect(config.skipBaseInfrastructure).toBeUndefined();
    });

    it("should handle missing overrides", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:app",
            JSON.stringify({ web: { replicas: 3 } })
        );

        const config = loadConfig();

        expect(config.app?.web?.replicas).toBe(3);
    });

    it("should handle empty overrides", () => {
        pulumi.runtime.setConfig(
            "aphiria-com-infrastructure:app",
            JSON.stringify({ web: { replicas: 3 } })
        );
        pulumi.runtime.setConfig("aphiria-com-infrastructure:overrides", JSON.stringify({}));

        const config = loadConfig();

        expect(config.app?.web?.replicas).toBe(3);
    });
});
