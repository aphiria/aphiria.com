import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setCookie } from "cookies-next";

// Mock cookies-next
vi.mock("cookies-next");

// Import after mocks
const { setContextCookie } = await import("./context-cookie.client");

describe("context-cookie (client)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
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

        it("uses NEXT_PUBLIC_COOKIE_DOMAIN from env when set", () => {
            process.env.NEXT_PUBLIC_COOKIE_DOMAIN = ".example.com";

            setContextCookie("framework");

            expect(setCookie).toHaveBeenCalledWith(
                "context",
                "framework",
                expect.objectContaining({
                    domain: ".example.com",
                    secure: true,
                })
            );
        });

        it("disables secure flag for localhost", () => {
            process.env.NEXT_PUBLIC_COOKIE_DOMAIN = "localhost";

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
