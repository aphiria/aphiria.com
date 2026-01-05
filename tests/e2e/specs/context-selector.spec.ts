import { test, expect } from "@playwright/test";
import { DocsPage } from "../pages/DocsPage";

test("changing context updates URL and sets cookie", async ({ page }) => {
    const docsPage = new DocsPage(page);
    await docsPage.goto("/docs/1.x/installation.html");

    // Default should be framework
    await expect(docsPage.contextSelector.contextSelector).toHaveValue("framework");
    expect(page.url()).toContain("?context=framework");

    // Change to library
    await docsPage.contextSelector.selectContext("library");

    // URL should update
    await expect(page).toHaveURL(/\?context=library/);

    // Cookie should be set
    const cookies = await page.context().cookies();
    const contextCookie = cookies.find((c) => c.name === "context");
    expect(contextCookie).toBeDefined();
    expect(contextCookie?.value).toBe("library");
    expect(contextCookie?.domain).toBe(process.env.COOKIE_DOMAIN);
    expect(contextCookie?.secure).toBe(true);
    expect(contextCookie?.httpOnly).toBe(false);

    // Change back to framework
    await docsPage.contextSelector.selectContext("framework");

    // URL should update
    await expect(page).toHaveURL(/\?context=framework/);

    // Cookie should be updated
    const updatedCookies = await page.context().cookies();
    const updatedContextCookie = updatedCookies.find((c) => c.name === "context");
    expect(updatedContextCookie?.value).toBe("framework");
});

test("context cookie persists across navigation", async ({ page }) => {
    const docsPage = new DocsPage(page);
    await docsPage.goto("/docs/1.x/installation.html");

    // Change to library
    await docsPage.contextSelector.selectContext("library");
    await expect(page).toHaveURL(/\?context=library/);

    // Navigate to installation page again
    await docsPage.goto("/docs/1.x/installation.html");

    // URL should contain context=library from cookie
    expect(page.url()).toContain("?context=library");

    // Select should have library selected
    await expect(docsPage.contextSelector.contextSelector).toHaveValue("library");
});
