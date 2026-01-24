import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockCookies = vi.fn().mockResolvedValue({
    get: mockGet,
    set: mockSet,
});
vi.mock("next/headers", () => ({
    cookies: mockCookies,
}));

// Import after mocks
const { getContextCookie, resolveContext, setContextCookie } =
    await import("@/lib/cookies/context-cookie.server");

describe("context-cookie.server", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getContextCookie", () => {
        it("returns framework when cookie is set to framework", async () => {
            mockGet.mockReturnValue({ value: "framework" });

            const result = await getContextCookie();

            expect(result).toBe("framework");
            expect(mockCookies).toHaveBeenCalled();
            expect(mockGet).toHaveBeenCalledWith("context");
        });

        it("returns library when cookie is set to library", async () => {
            mockGet.mockReturnValue({ value: "library" });

            const result = await getContextCookie();

            expect(result).toBe("library");
        });

        it("returns null when cookie is not set", async () => {
            mockGet.mockReturnValue(undefined);

            const result = await getContextCookie();

            expect(result).toBeNull();
        });

        it("returns null when cookie has invalid value", async () => {
            mockGet.mockReturnValue({ value: "invalid" });

            const result = await getContextCookie();

            expect(result).toBeNull();
        });

        it("returns null when cookie value is empty string", async () => {
            mockGet.mockReturnValue({ value: "" });

            const result = await getContextCookie();

            expect(result).toBeNull();
        });
    });

    describe("resolveContext", () => {
        const mockCookieStore = {
            get: mockGet,
            getAll: vi.fn(),
            has: vi.fn(),
            size: 0,
        };

        it("returns URL parameter when valid context provided", async () => {
            const searchParams = new URLSearchParams("context=library");

            const result = await resolveContext(mockCookieStore, searchParams);

            expect(result).toBe("library");
            // Note: cookies are NOT set during SSR (resolveContext only reads)
            // Cookies are set client-side when user changes context
            expect(mockSet).not.toHaveBeenCalled();
        });

        it("returns cookie value when no URL parameter", async () => {
            mockGet.mockReturnValue({ value: "library" });
            const searchParams = new URLSearchParams();

            const result = await resolveContext(mockCookieStore, searchParams);

            expect(result).toBe("library");
            expect(mockSet).not.toHaveBeenCalled();
        });

        it("returns default when no URL parameter and no cookie", async () => {
            mockGet.mockReturnValue(undefined);
            const searchParams = new URLSearchParams();

            const result = await resolveContext(mockCookieStore, searchParams);

            expect(result).toBe("framework");
        });

        it("ignores invalid URL parameter and uses cookie", async () => {
            mockGet.mockReturnValue({ value: "library" });
            const searchParams = new URLSearchParams("context=invalid");

            const result = await resolveContext(mockCookieStore, searchParams);

            expect(result).toBe("library");
            expect(mockSet).not.toHaveBeenCalled();
        });

        it("ignores invalid cookie and returns default", async () => {
            mockGet.mockReturnValue({ value: "invalid" });
            const searchParams = new URLSearchParams();

            const result = await resolveContext(mockCookieStore, searchParams);

            expect(result).toBe("framework");
        });
    });

    describe("setContextCookie", () => {
        it("sets cookie with correct options", async () => {
            process.env.COOKIE_DOMAIN = "example.com";
            process.env.NODE_ENV = "production";

            await setContextCookie("library");

            expect(mockSet).toHaveBeenCalledWith(
                "context",
                "library",
                expect.objectContaining({
                    maxAge: 365 * 24 * 60 * 60,
                    path: "/",
                    domain: "example.com",
                    sameSite: "lax",
                    secure: true,
                    httpOnly: false,
                })
            );
        });

        it("uses localhost as default domain", async () => {
            delete process.env.COOKIE_DOMAIN;

            await setContextCookie("framework");

            expect(mockSet).toHaveBeenCalledWith(
                "context",
                "framework",
                expect.objectContaining({
                    domain: "localhost",
                })
            );
        });

        it("uses secure: false in development", async () => {
            process.env.NODE_ENV = "development";

            await setContextCookie("framework");

            expect(mockSet).toHaveBeenCalledWith(
                "context",
                "framework",
                expect.objectContaining({
                    secure: false,
                })
            );
        });
    });
});
