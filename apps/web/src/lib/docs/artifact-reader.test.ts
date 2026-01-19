import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fs module
const mockReadFileSync = vi.fn();
vi.mock("fs", () => ({
    default: {
        readFileSync: mockReadFileSync,
    },
    readFileSync: mockReadFileSync,
}));

// Mock path module
const mockJoin = vi.fn((...args: string[]) => args.join("/"));
vi.mock("path", () => ({
    default: {
        join: mockJoin,
    },
    join: mockJoin,
}));

// Import after mocks are set up
const { readDocMeta, readDocHtml, getDocsForVersion } = await import("./artifact-reader");

describe("artifact-reader", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mocks to default behavior
        mockJoin.mockImplementation((...args: string[]) => args.join("/"));
        // Mock process.cwd()
        vi.spyOn(process, "cwd").mockReturnValue("/fake/apps/web");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("readDocMeta", () => {
        it("returns parsed doc metadata from meta.json", () => {
            const mockMetaData = [
                { version: "1.x", slug: "installation", title: "Installation" },
                { version: "1.x", slug: "routing", title: "Routing" },
            ];

            mockReadFileSync.mockReturnValue(JSON.stringify(mockMetaData));

            const result = readDocMeta();

            expect(result).toEqual(mockMetaData);
            expect(mockReadFileSync).toHaveBeenCalledWith(
                "/fake/apps/web/../../dist/docs/meta.json",
                "utf8"
            );
        });

        it("returns empty array on read error", () => {
            mockReadFileSync.mockImplementation(() => {
                throw new Error("File not found");
            });

            // Suppress console.error during test
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = readDocMeta();

            expect(result).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Failed to read doc metadata:",
                expect.any(Error)
            );
        });

        it("returns empty array on JSON parse error", () => {
            mockReadFileSync.mockReturnValue("invalid json");

            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = readDocMeta();

            expect(result).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe("readDocHtml", () => {
        it("returns HTML content for valid slug", () => {
            const mockHtml = "<h1>Installation</h1><p>Content</p>";

            mockReadFileSync.mockReturnValue(mockHtml);

            const result = readDocHtml("installation");

            expect(result).toBe(mockHtml);
            expect(mockReadFileSync).toHaveBeenCalledWith(
                "/fake/apps/web/../../dist/docs/rendered/installation.html",
                "utf8"
            );
        });

        it("returns null on read error", () => {
            mockReadFileSync.mockImplementation(() => {
                throw new Error("File not found");
            });

            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = readDocHtml("nonexistent");

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Failed to read doc HTML for nonexistent:",
                expect.any(Error)
            );
        });
    });

    describe("getDocsForVersion", () => {
        it("filters docs by version", () => {
            const mockMetaData = [
                { version: "1.x", slug: "installation", title: "Installation" },
                { version: "1.x", slug: "routing", title: "Routing" },
                { version: "2.x", slug: "installation", title: "Installation" },
            ];

            mockReadFileSync.mockReturnValue(JSON.stringify(mockMetaData));

            const result = getDocsForVersion("1.x");

            expect(result).toHaveLength(2);
            expect(result).toEqual([
                { version: "1.x", slug: "installation", title: "Installation" },
                { version: "1.x", slug: "routing", title: "Routing" },
            ]);
        });

        it("returns empty array when no docs match version", () => {
            const mockMetaData = [{ version: "1.x", slug: "installation", title: "Installation" }];

            mockReadFileSync.mockReturnValue(JSON.stringify(mockMetaData));

            const result = getDocsForVersion("3.x");

            expect(result).toEqual([]);
        });
    });

    describe("getRepoRoot", () => {
        it("goes up two levels when cwd ends with apps/web", () => {
            vi.spyOn(process, "cwd").mockReturnValue("/home/user/project/apps/web");
            mockReadFileSync.mockReturnValue("[]");

            readDocMeta();

            // Verify that the path construction used ../../
            expect(mockReadFileSync).toHaveBeenCalledWith(
                "/home/user/project/apps/web/../../dist/docs/meta.json",
                "utf8"
            );
        });

        it("uses cwd as root when not in apps/web", () => {
            vi.spyOn(process, "cwd").mockReturnValue("/app");
            mockReadFileSync.mockReturnValue("[]");

            readDocMeta();

            // Verify that the path construction uses cwd directly
            expect(mockReadFileSync).toHaveBeenCalledWith("/app/dist/docs/meta.json", "utf8");
        });
    });
});
