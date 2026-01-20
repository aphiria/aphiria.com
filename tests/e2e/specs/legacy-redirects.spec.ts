import { test, expect } from "@playwright/test";
import { LEGACY_DOCS, TEST_DOCS } from "../fixtures/test-data";

test.describe("legacy .html URL redirects", () => {
    test("redirects /docs/1.x/introduction.html to /docs/1.x/introduction with 301 status", async ({
        page,
    }) => {
        // Capture the redirect response by listening to response events
        let redirectStatus: number | undefined;
        page.on("response", (response) => {
            if (response.url().includes(".html") && response.status() >= 300 && response.status() < 400) {
                redirectStatus = response.status();
            }
        });

        await page.goto(LEGACY_DOCS.introduction);

        // Verify 301 permanent redirect occurred
        expect(redirectStatus).toBe(301);

        // Verify final URL has no .html extension
        expect(page.url()).toContain(TEST_DOCS.introduction);
        expect(page.url()).not.toContain(".html");
    });

    test("redirects /docs/1.x/installation.html to /docs/1.x/installation with 301 status", async ({
        page,
    }) => {
        let redirectStatus: number | undefined;
        page.on("response", (response) => {
            if (response.url().includes(".html") && response.status() >= 300 && response.status() < 400) {
                redirectStatus = response.status();
            }
        });

        await page.goto(LEGACY_DOCS.installation);

        // Verify 301 permanent redirect occurred
        expect(redirectStatus).toBe(301);

        // Verify final URL has no .html extension
        expect(page.url()).toContain(TEST_DOCS.installation);
        expect(page.url()).not.toContain(".html");
    });

    test("preserves query parameters during redirect", async ({ page }) => {
        let redirectStatus: number | undefined;
        page.on("response", (response) => {
            if (response.url().includes(".html") && response.status() >= 300 && response.status() < 400) {
                redirectStatus = response.status();
            }
        });

        const urlWithQuery = `${LEGACY_DOCS.introduction}?context=library`;
        await page.goto(urlWithQuery);

        // Verify 301 redirect occurred
        expect(redirectStatus).toBe(301);

        // Wait for client-side JS to finish executing before checking URL
        await page.waitForLoadState("networkidle");

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
        let redirectStatus: number | undefined;
        page.on("response", (response) => {
            if (response.url().includes(".html") && response.status() >= 300 && response.status() < 400) {
                redirectStatus = response.status();
            }
        });

        const complexUrl = `${LEGACY_DOCS.introduction}?context=library#routing`;
        await page.goto(complexUrl);

        // Verify 301 redirect occurred
        expect(redirectStatus).toBe(301);

        // Wait for client-side JS to finish executing before checking URL
        await page.waitForLoadState("networkidle");

        // Verify both preserved
        expect(page.url()).toContain("context=library");
        expect(page.url()).toContain("#routing");
        expect(page.url()).not.toContain(".html");
    });
});

test.describe("/docs root redirect", () => {
    test("redirects /docs to /docs/1.x/introduction with 302 status", async ({ page }) => {
        let redirectStatus: number | undefined;
        page.on("response", (response) => {
            if (response.url().endsWith("/docs") && response.status() >= 300 && response.status() < 400) {
                redirectStatus = response.status();
            }
        });

        await page.goto("/docs");

        // Verify 302 temporary redirect occurred
        expect(redirectStatus).toBe(302);

        // Verify redirected to introduction page
        expect(page.url()).toContain("/docs/1.x/introduction");
    });
});
