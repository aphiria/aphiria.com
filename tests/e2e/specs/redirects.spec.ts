import { test, expect } from "@playwright/test";

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
