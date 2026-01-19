import { describe, it, expect } from "vitest";
import { createRedirectUrl } from "./redirects";

describe("redirects", () => {
    describe("createRedirectUrl", () => {
        it("removes .html extension from pathname", () => {
            const url = new URL("https://example.com/docs/1.x/introduction.html");

            const result = createRedirectUrl(url);

            expect(result).toBe("/docs/1.x/introduction");
        });

        it("preserves query parameters", () => {
            const url = new URL("https://example.com/docs/1.x/routing.html?context=library");

            const result = createRedirectUrl(url);

            expect(result).toBe("/docs/1.x/routing?context=library");
        });

        it("preserves anchor/hash", () => {
            const url = new URL("https://example.com/docs/1.x/routing.html#basic-routing");

            const result = createRedirectUrl(url);

            expect(result).toBe("/docs/1.x/routing#basic-routing");
        });

        it("preserves both query and anchor", () => {
            const url = new URL(
                "https://example.com/docs/1.x/routing.html?context=library#basic-routing"
            );

            const result = createRedirectUrl(url);

            expect(result).toBe("/docs/1.x/routing?context=library#basic-routing");
        });

        it("handles URL without .html extension (no change)", () => {
            const url = new URL("https://example.com/docs/1.x/routing");

            const result = createRedirectUrl(url);

            expect(result).toBe("/docs/1.x/routing");
        });

        it("handles root path", () => {
            const url = new URL("https://example.com/");

            const result = createRedirectUrl(url);

            expect(result).toBe("/");
        });

        it("handles multiple query parameters", () => {
            const url = new URL("https://example.com/docs/1.x/routing.html?foo=bar&baz=qux");

            const result = createRedirectUrl(url);

            expect(result).toBe("/docs/1.x/routing?foo=bar&baz=qux");
        });

        it("only removes trailing .html", () => {
            const url = new URL("https://example.com/html.file/test.html");

            const result = createRedirectUrl(url);

            expect(result).toBe("/html.file/test");
        });
    });
});
