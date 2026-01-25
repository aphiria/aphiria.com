import { describe, it, expect, beforeEach } from "vitest";
import { getRuntimeConfig } from "@/lib/runtime-config";

describe("runtime-config", () => {
    beforeEach(() => {
        // Clear any existing runtime config
        if (typeof window !== "undefined") {
            delete window.__RUNTIME_CONFIG__;
        }
    });

    describe("getRuntimeConfig", () => {
        it("returns runtime config from window when available", () => {
            // Set up window.__RUNTIME_CONFIG__
            window.__RUNTIME_CONFIG__ = {
                apiUri: "https://api.aphiria.com",
                cookieDomain: ".aphiria.com",
                appEnv: "production",
            };

            const config = getRuntimeConfig();

            expect(config.apiUri).toBe("https://api.aphiria.com");
            expect(config.cookieDomain).toBe(".aphiria.com");
            expect(config.appEnv).toBe("production");
        });

        it("returns development defaults when window.__RUNTIME_CONFIG__ not set", () => {
            const config = getRuntimeConfig();

            expect(config.apiUri).toBe("http://localhost:8080");
            expect(config.cookieDomain).toBe("localhost");
            expect(config.appEnv).toBe("development");
        });

        it("returns preview environment config", () => {
            window.__RUNTIME_CONFIG__ = {
                apiUri: "https://pr-123.pr-api.aphiria.com",
                cookieDomain: ".pr.aphiria.com",
                appEnv: "preview",
            };

            const config = getRuntimeConfig();

            expect(config.apiUri).toBe("https://pr-123.pr-api.aphiria.com");
            expect(config.cookieDomain).toBe(".pr.aphiria.com");
            expect(config.appEnv).toBe("preview");
        });

        it("returns production environment config", () => {
            window.__RUNTIME_CONFIG__ = {
                apiUri: "https://api.aphiria.com",
                cookieDomain: ".aphiria.com",
                appEnv: "production",
            };

            const config = getRuntimeConfig();

            expect(config.apiUri).toBe("https://api.aphiria.com");
            expect(config.cookieDomain).toBe(".aphiria.com");
            expect(config.appEnv).toBe("production");
        });
    });
});
