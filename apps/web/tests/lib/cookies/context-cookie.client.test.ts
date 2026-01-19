import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setCookie } from "cookies-next";
import type { RuntimeConfig } from "@/lib/runtime-config";

// Mock runtime config
const mockGetRuntimeConfig = vi.fn<[], RuntimeConfig>();

vi.mock("cookies-next");
vi.mock("@/lib/runtime-config", () => ({
    getRuntimeConfig: () => mockGetRuntimeConfig(),
}));

// Import after mocks
const { setContextCookie } = await import("@/lib/cookies/context-cookie.client");

describe("context-cookie (client)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default runtime config
        mockGetRuntimeConfig.mockReturnValue({
            apiUri: "https://api.aphiria.com",
            cookieDomain: ".aphiria.com",
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("setContextCookie", () => {
        it("sets cookie with framework context", () => {
            setContextCookie("framework");

            expect(setCookie).toHaveBeenCalledWith("context", "framework", {
                maxAge: 365 * 24 * 60 * 60,
                path: "/",
                domain: ".aphiria.com",
                secure: true,
                sameSite: "lax",
            });
        });

        it("sets cookie with library context", () => {
            setContextCookie("library");

            expect(setCookie).toHaveBeenCalledWith("context", "library", {
                maxAge: 365 * 24 * 60 * 60,
                path: "/",
                domain: ".aphiria.com",
                secure: true,
                sameSite: "lax",
            });
        });

        it("uses cookieDomain from runtime config", () => {
            mockGetRuntimeConfig.mockReturnValue({
                apiUri: "https://pr-123.pr-api.aphiria.com",
                cookieDomain: ".pr.aphiria.com",
            });

            setContextCookie("framework");

            expect(setCookie).toHaveBeenCalledWith(
                "context",
                "framework",
                expect.objectContaining({
                    domain: ".pr.aphiria.com",
                    secure: true,
                })
            );
        });

        it("disables secure flag for localhost", () => {
            mockGetRuntimeConfig.mockReturnValue({
                apiUri: "http://localhost:8080",
                cookieDomain: "localhost",
            });

            setContextCookie("framework");

            expect(setCookie).toHaveBeenCalledWith(
                "context",
                "framework",
                expect.objectContaining({
                    domain: "localhost",
                    secure: false,
                })
            );
        });

        it("sets cookie max age to 1 year", () => {
            setContextCookie("framework");

            expect(setCookie).toHaveBeenCalledWith(
                "context",
                "framework",
                expect.objectContaining({
                    maxAge: 31536000, // 365 * 24 * 60 * 60
                })
            );
        });

        it("sets cookie with sameSite lax", () => {
            setContextCookie("framework");

            expect(setCookie).toHaveBeenCalledWith(
                "context",
                "framework",
                expect.objectContaining({
                    sameSite: "lax",
                })
            );
        });

        it("sets cookie path to /", () => {
            setContextCookie("framework");

            expect(setCookie).toHaveBeenCalledWith(
                "context",
                "framework",
                expect.objectContaining({
                    path: "/",
                })
            );
        });
    });
});
