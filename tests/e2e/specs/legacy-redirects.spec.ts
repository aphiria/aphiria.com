import { test, expect } from "@playwright/test";
import { LEGACY_DOCS, TEST_DOCS } from "../fixtures/test-data";

test.describe("legacy .html URL redirects", () => {
    test("redirects /docs/1.x/introduction.html to /docs/1.x/introduction with 301 status", async ({
        page,
    }) => {
        const response = await page.goto(LEGACY_DOCS.introduction);

        // Verify 301 permanent redirect
        expect(response?.status()).toBe(301);

        // Verify final URL has no .html extension
        expect(page.url()).toContain(TEST_DOCS.introduction);
        expect(page.url()).not.toContain(".html");
    });

    test("redirects /docs/1.x/installation.html to /docs/1.x/installation with 301 status", async ({
        page,
    }) => {
        const response = await page.goto(LEGACY_DOCS.installation);

        // Verify 301 permanent redirect
        expect(response?.status()).toBe(301);

        // Verify final URL has no .html extension
        expect(page.url()).toContain(TEST_DOCS.installation);
        expect(page.url()).not.toContain(".html");
    });

    test("preserves query parameters during redirect", async ({ page }) => {
        const urlWithQuery = `${LEGACY_DOCS.introduction}?context=library`;
        const response = await page.goto(urlWithQuery);

        // Verify 301 redirect
        expect(response?.status()).toBe(301);

        // Verify query parameter preserved
        expect(page.url()).toContain("context=library");
        expect(page.url()).not.toContain(".html");
    });

    test("preserves anchor fragments during redirect", async ({ page }) => {
        const urlWithAnchor = `${LEGACY_DOCS.introduction}#routing`;
        await page.goto(urlWithAnchor);

        // Verify anchor preserved in final URL
        expect(page.url()).toContain("#routing");
        expect(page.url()).not.toContain(".html");
    });

    test("preserves both query parameters and anchors during redirect", async ({ page }) => {
        const complexUrl = `${LEGACY_DOCS.introduction}?context=library#routing`;
        const response = await page.goto(complexUrl);

        // Verify 301 redirect
        expect(response?.status()).toBe(301);

        // Verify both preserved
        expect(page.url()).toContain("context=library");
        expect(page.url()).toContain("#routing");
        expect(page.url()).not.toContain(".html");
    });
});

test.describe("/docs root redirect", () => {
    test("redirects /docs to /docs/1.x/introduction with 302 status", async ({ page }) => {
        const response = await page.goto("/docs");

        // Verify 302 temporary redirect
        expect(response?.status()).toBe(302);

        // Verify redirected to introduction page
        expect(page.url()).toContain("/docs/1.x/introduction");
    });
});
