import { describe, it, expect } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";
import { StackConfig } from "../../../src/stacks/lib/stack-config";

// Mock Pulumi Config
pulumi.runtime.setMocks({
    newResource: function (args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
        return {
            id: args.name + "_id",
            state: args.inputs,
        };
    },
    call: function (args: pulumi.runtime.MockCallArgs) {
        return args.inputs;
    },
});

describe("StackConfig", () => {
    describe("urls", () => {
        it("should store and return web and API URLs", () => {
            const config = new StackConfig("https://www.example.com", "https://api.example.com");
            const urls = config.urls;

            expect(urls.web).toBe("https://www.example.com");
            expect(urls.api).toBe("https://api.example.com");
        });

        it("should handle preview PR URLs with PR number", () => {
            const prNumber = 123;
            const config = new StackConfig(
                `https://${prNumber}.pr.aphiria.com`,
                `https://${prNumber}.pr-api.aphiria.com`
            );
            const urls = config.urls;

            expect(urls.web).toBe("https://123.pr.aphiria.com");
            expect(urls.api).toBe("https://123.pr-api.aphiria.com");
        });
    });

    describe("postgresql", () => {
        it("should load PostgreSQL configuration", () => {
            pulumi.runtime.setConfig("postgresql:user", "testuser");
            pulumi.runtime.setConfig("postgresql:password", "testpass");

            const config = new StackConfig("https://example.com", "https://api.example.com");
            const postgresql = config.postgresql;

            expect(postgresql.user).toBe("testuser");
            expect(postgresql.password).toBeDefined();
        });
    });

    describe("ghcr", () => {
        it("should load GHCR configuration", () => {
            pulumi.runtime.setConfig("ghcr:username", "testuser");
            pulumi.runtime.setConfig("ghcr:token", "testtoken");

            const config = new StackConfig("https://example.com", "https://api.example.com");
            const ghcr = config.ghcr;

            expect(ghcr.username).toBe("testuser");
            expect(ghcr.token).toBeDefined();
        });
    });

    describe("certManager", () => {
        it("should load cert-manager configuration", () => {
            pulumi.runtime.setConfig("certmanager:digitaloceanDnsToken", "dop_v1_testtoken");

            const config = new StackConfig("https://example.com", "https://api.example.com");
            const certmanager = config.certManager;

            expect(certmanager.dnsToken).toBeDefined();
        });
    });

    describe("images", () => {
        it("should build image references with SHA256 digests", () => {
            pulumi.runtime.setConfig(
                "project:webImageDigest",
                "sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1"
            );
            pulumi.runtime.setConfig(
                "project:apiImageDigest",
                "sha256:def456abc123def456abc123def456abc123def456abc123def456abc123def4"
            );

            const config = new StackConfig("https://example.com", "https://api.example.com");
            const images = config.images;

            expect(images.web).toBe(
                "ghcr.io/aphiria/aphiria.com-web@sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1"
            );
            expect(images.api).toBe(
                "ghcr.io/aphiria/aphiria.com-api@sha256:def456abc123def456abc123def456abc123def456abc123def456abc123def4"
            );
        });
    });

    describe("prNumber", () => {
        it("should load PR number as integer", () => {
            pulumi.runtime.setConfig("project:prNumber", "123");

            const config = new StackConfig("https://example.com", "https://api.example.com");
            const prNumber = config.prNumber;

            expect(prNumber).toBe(123);
        });
    });

    describe("baseStackReference", () => {
        it("should load base stack reference string", () => {
            pulumi.runtime.setConfig(
                "project:baseStackReference",
                "organization/project/preview-base"
            );

            const config = new StackConfig("https://example.com", "https://api.example.com");
            const ref = config.baseStackReference;

            expect(ref).toBe("organization/project/preview-base");
        });
    });
});
