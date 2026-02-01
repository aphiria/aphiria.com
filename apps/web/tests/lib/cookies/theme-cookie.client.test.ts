import { describe, it, expect, vi, beforeEach } from "vitest";
import { getThemeCookie, setThemeCookie } from "@/lib/cookies/theme-cookie.client";
import { getCookie, setCookie } from "cookies-next";
import { getRuntimeConfig } from "@/lib/runtime-config";

// Mock cookies-next
vi.mock("cookies-next", () => ({
    getCookie: vi.fn(),
    setCookie: vi.fn(),
}));

// Mock runtime config
vi.mock("@/lib/runtime-config", () => ({
    getRuntimeConfig: vi.fn(),
}));

describe("theme-cookie.client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to default localhost config
        vi.mocked(getRuntimeConfig).mockReturnValue({
            apiUri: "http://localhost:8080",
            cookieDomain: "localhost",
        });
    });

    describe("getThemeCookie", () => {
        it("returns 'light' when cookie value is 'light'", () => {
            vi.mocked(getCookie).mockReturnValue("light");

            const result = getThemeCookie();

            expect(result).toBe("light");
            expect(getCookie).toHaveBeenCalledWith("theme-preference");
        });

        it("returns 'dark' when cookie value is 'dark'", () => {
            vi.mocked(getCookie).mockReturnValue("dark");

            const result = getThemeCookie();

            expect(result).toBe("dark");
            expect(getCookie).toHaveBeenCalledWith("theme-preference");
        });

        it("returns null when cookie value is invalid", () => {
            vi.mocked(getCookie).mockReturnValue("invalid-theme");

            const result = getThemeCookie();

            expect(result).toBeNull();
        });

        it("returns null when cookie is not set", () => {
            vi.mocked(getCookie).mockReturnValue(undefined);

            const result = getThemeCookie();

            expect(result).toBeNull();
        });
    });

    describe("setThemeCookie", () => {
        it("sets cookie with correct configuration for light theme", () => {
            setThemeCookie("light");

            expect(setCookie).toHaveBeenCalledWith("theme-preference", "light", {
                maxAge: 365 * 24 * 60 * 60,
                path: "/",
                domain: "localhost",
                secure: false, // localhost is not secure
                sameSite: "lax",
            });
        });

        it("sets cookie with correct configuration for dark theme", () => {
            setThemeCookie("dark");

            expect(setCookie).toHaveBeenCalledWith("theme-preference", "dark", {
                maxAge: 365 * 24 * 60 * 60,
                path: "/",
                domain: "localhost",
                secure: false,
                sameSite: "lax",
            });
        });

        it("sets secure flag for non-localhost domains", () => {
            // Override runtime config with production domain
            vi.mocked(getRuntimeConfig).mockReturnValueOnce({
                apiUri: "https://api.aphiria.com",
                cookieDomain: ".aphiria.com",
            });

            setThemeCookie("dark");

            expect(setCookie).toHaveBeenCalledWith("theme-preference", "dark", {
                maxAge: 365 * 24 * 60 * 60,
                path: "/",
                domain: ".aphiria.com",
                secure: true, // production domain is secure
                sameSite: "lax",
            });
        });
    });
});
