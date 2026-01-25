import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getServerConfig } from "@/lib/config/server-config";

describe("server-config", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("getServerConfig", () => {
        it("returns config from environment variables", () => {
            process.env.API_URI = "https://api.example.com";
            process.env.COOKIE_DOMAIN = "example.com";
            process.env.APP_ENV = "production";

            const config = getServerConfig();

            expect(config).toEqual({
                apiUri: "https://api.example.com",
                cookieDomain: "example.com",
                appEnv: "production",
            });
        });

        it("uses default for API_URI when not set", () => {
            delete process.env.API_URI;
            process.env.COOKIE_DOMAIN = "example.com";
            process.env.APP_ENV = "local";

            const config = getServerConfig();

            expect(config.apiUri).toBe("http://localhost:8080");
            expect(config.cookieDomain).toBe("example.com");
            expect(config.appEnv).toBe("local");
        });

        it("uses default for COOKIE_DOMAIN when not set", () => {
            process.env.API_URI = "https://api.example.com";
            delete process.env.COOKIE_DOMAIN;
            process.env.APP_ENV = "preview";

            const config = getServerConfig();

            expect(config.apiUri).toBe("https://api.example.com");
            expect(config.cookieDomain).toBe("localhost");
            expect(config.appEnv).toBe("preview");
        });

        it("uses defaults when all environment variables not set", () => {
            delete process.env.API_URI;
            delete process.env.COOKIE_DOMAIN;
            delete process.env.APP_ENV;

            const config = getServerConfig();

            expect(config).toEqual({
                apiUri: "http://localhost:8080",
                cookieDomain: "localhost",
                appEnv: "development",
            });
        });

        it("returns config with production values", () => {
            process.env.API_URI = "https://api.aphiria.com";
            process.env.COOKIE_DOMAIN = "aphiria.com";
            process.env.APP_ENV = "production";

            const config = getServerConfig();

            expect(config).toEqual({
                apiUri: "https://api.aphiria.com",
                cookieDomain: "aphiria.com",
                appEnv: "production",
            });
        });

        it("returns config with preview values", () => {
            process.env.API_URI = "https://api-pr-123.aphiria-preview.com";
            process.env.COOKIE_DOMAIN = "aphiria-preview.com";
            process.env.APP_ENV = "preview";

            const config = getServerConfig();

            expect(config).toEqual({
                apiUri: "https://api-pr-123.aphiria-preview.com",
                cookieDomain: "aphiria-preview.com",
                appEnv: "preview",
            });
        });
    });
});
