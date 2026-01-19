import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server-side cookie module
const mockGetContextCookie = vi.fn();
vi.mock("@/lib/cookies/context-cookie.server", () => ({
    getContextCookie: mockGetContextCookie,
}));

// Import after mocks
const { resolveContext } = await import("./resolver");

describe("context resolver", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetContextCookie.mockResolvedValue(null);
    });

    describe("resolveContext", () => {
        it("returns query param context when set to framework", async () => {
            const searchParams = new URLSearchParams("context=framework");

            const result = await resolveContext(searchParams);

            expect(result).toBe("framework");
            expect(mockGetContextCookie).not.toHaveBeenCalled();
        });

        it("returns query param context when set to library", async () => {
            const searchParams = new URLSearchParams("context=library");

            const result = await resolveContext(searchParams);

            expect(result).toBe("library");
            expect(mockGetContextCookie).not.toHaveBeenCalled();
        });

        it("ignores invalid query param and falls back to cookie", async () => {
            const searchParams = new URLSearchParams("context=invalid");
            mockGetContextCookie.mockResolvedValue("library");

            const result = await resolveContext(searchParams);

            expect(result).toBe("library");
            expect(mockGetContextCookie).toHaveBeenCalled();
        });

        it("returns cookie value when query param not set", async () => {
            const searchParams = new URLSearchParams();
            mockGetContextCookie.mockResolvedValue("framework");

            const result = await resolveContext(searchParams);

            expect(result).toBe("framework");
            expect(mockGetContextCookie).toHaveBeenCalled();
        });

        it("defaults to framework when neither query nor cookie set", async () => {
            const searchParams = new URLSearchParams();
            mockGetContextCookie.mockResolvedValue(null);

            const result = await resolveContext(searchParams);

            expect(result).toBe("framework");
        });

        it("handles Record-style search params (Next.js page props)", async () => {
            const searchParams = { context: "library" };

            const result = await resolveContext(searchParams);

            expect(result).toBe("library");
        });

        it("handles Record-style with array value (uses first item)", async () => {
            const searchParams = { context: ["framework", "library"] };

            // Array value is truthy but not "framework" or "library" string
            // So it falls back to cookie
            mockGetContextCookie.mockResolvedValue("library");
            const result = await resolveContext(searchParams);

            expect(result).toBe("library");
        });

        it("handles Record-style with undefined value", async () => {
            const searchParams = { context: undefined };
            mockGetContextCookie.mockResolvedValue("framework");

            const result = await resolveContext(searchParams);

            expect(result).toBe("framework");
        });

        it("query param takes precedence over cookie", async () => {
            const searchParams = new URLSearchParams("context=library");
            mockGetContextCookie.mockResolvedValue("framework");

            const result = await resolveContext(searchParams);

            expect(result).toBe("library");
            expect(mockGetContextCookie).not.toHaveBeenCalled();
        });

        it("cookie takes precedence over default", async () => {
            const searchParams = new URLSearchParams();
            mockGetContextCookie.mockResolvedValue("library");

            const result = await resolveContext(searchParams);

            expect(result).toBe("library");
        });

        it("ignores invalid cookie value and uses default", async () => {
            const searchParams = new URLSearchParams();
            // TypeScript prevents this, but test runtime behavior
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockGetContextCookie.mockResolvedValue("invalid" as any);

            const result = await resolveContext(searchParams);

            expect(result).toBe("framework");
        });
    });
});
