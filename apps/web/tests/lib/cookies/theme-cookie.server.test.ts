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
const { getThemeCookie, setThemeCookie, resolveTheme } =
    await import("@/lib/cookies/theme-cookie.server");

describe("theme-cookie.server", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getThemeCookie", () => {
        it("returns 'light' when cookie is set to light", async () => {
            mockGet.mockReturnValue({ value: "light" });

            const result = await getThemeCookie();

            expect(result).toBe("light");
            expect(mockCookies).toHaveBeenCalled();
            expect(mockGet).toHaveBeenCalledWith("theme-preference");
        });

        it("returns 'dark' when cookie is set to dark", async () => {
            mockGet.mockReturnValue({ value: "dark" });

            const result = await getThemeCookie();

            expect(result).toBe("dark");
        });

        it("returns null when cookie is not set", async () => {
            mockGet.mockReturnValue(undefined);

            const result = await getThemeCookie();

            expect(result).toBeNull();
        });

        it("returns null when cookie has invalid value", async () => {
            mockGet.mockReturnValue({ value: "invalid" });

            const result = await getThemeCookie();

            expect(result).toBeNull();
        });

        it("returns null when cookie value is empty string", async () => {
            mockGet.mockReturnValue({ value: "" });

            const result = await getThemeCookie();

            expect(result).toBeNull();
        });
    });

    describe("resolveTheme", () => {
        it("returns cookie value when set to light", async () => {
            mockGet.mockReturnValue({ value: "light" });

            const result = await resolveTheme();

            expect(result).toBe("light");
        });

        it("returns cookie value when set to dark", async () => {
            mockGet.mockReturnValue({ value: "dark" });

            const result = await resolveTheme();

            expect(result).toBe("dark");
        });

        it("returns default theme when cookie is not set", async () => {
            mockGet.mockReturnValue(undefined);

            const result = await resolveTheme();

            expect(result).toBe("light");
        });

        it("returns default theme when cookie has invalid value", async () => {
            mockGet.mockReturnValue({ value: "invalid" });

            const result = await resolveTheme();

            expect(result).toBe("light");
        });
    });

    describe("setThemeCookie", () => {
        it("sets cookie with correct options for light theme", async () => {
            process.env.COOKIE_DOMAIN = "example.com";
            process.env.NODE_ENV = "production";

            await setThemeCookie("light");

            expect(mockSet).toHaveBeenCalledWith(
                "theme-preference",
                "light",
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

        it("sets cookie with correct options for dark theme", async () => {
            process.env.COOKIE_DOMAIN = "example.com";
            process.env.NODE_ENV = "production";

            await setThemeCookie("dark");

            expect(mockSet).toHaveBeenCalledWith(
                "theme-preference",
                "dark",
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

            await setThemeCookie("light");

            expect(mockSet).toHaveBeenCalledWith(
                "theme-preference",
                "light",
                expect.objectContaining({
                    domain: "localhost",
                })
            );
        });

        it("uses secure: false in development", async () => {
            process.env.NODE_ENV = "development";

            await setThemeCookie("dark");

            expect(mockSet).toHaveBeenCalledWith(
                "theme-preference",
                "dark",
                expect.objectContaining({
                    secure: false,
                })
            );
        });
    });
});
