import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers
const mockGet = vi.fn();
const mockCookies = vi.fn().mockResolvedValue({
    get: mockGet,
});
vi.mock("next/headers", () => ({
    cookies: mockCookies,
}));

// Import after mocks
const { getContextCookie } = await import("./context-cookie.server");

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
});
