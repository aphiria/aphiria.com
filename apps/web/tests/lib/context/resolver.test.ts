import { describe, it, expect } from "vitest";
import { parseContext, DEFAULT_CONTEXT } from "@/lib/context/resolver";

describe("context resolver", () => {
    describe("DEFAULT_CONTEXT", () => {
        it('is set to "framework"', () => {
            expect(DEFAULT_CONTEXT).toBe("framework");
        });
    });

    describe("parseContext", () => {
        it("returns framework when value is framework", () => {
            expect(parseContext("framework")).toBe("framework");
        });

        it("returns library when value is library", () => {
            expect(parseContext("library")).toBe("library");
        });

        it("returns fallback for invalid string value", () => {
            expect(parseContext("invalid")).toBe("framework");
        });

        it("returns fallback for null value", () => {
            expect(parseContext(null)).toBe("framework");
        });

        it("returns fallback for undefined value", () => {
            expect(parseContext(undefined)).toBe("framework");
        });

        it("uses custom fallback when provided", () => {
            expect(parseContext("invalid", "library")).toBe("library");
        });

        it("handles array value (uses first item)", () => {
            expect(parseContext(["framework", "library"])).toBe("framework");
        });

        it("handles array with library as first item", () => {
            expect(parseContext(["library", "framework"])).toBe("library");
        });

        it("handles empty array (returns fallback)", () => {
            expect(parseContext([])).toBe("framework");
        });

        it("handles array with invalid first item (returns fallback)", () => {
            expect(parseContext(["invalid", "framework"])).toBe("framework");
        });

        it("prefers valid value over fallback", () => {
            expect(parseContext("library", "framework")).toBe("library");
        });

        it("handles empty string (returns fallback)", () => {
            expect(parseContext("")).toBe("framework");
        });
    });
});
