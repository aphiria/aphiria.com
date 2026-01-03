import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";
import { DocsPage } from "../pages/DocsPage";

test.describe("Desktop navigation (>=1024px)", () => {
    test.use({ viewport: { width: 1024, height: 768 } });

    test("side nav is hidden on homepage", async ({ page }) => {
        const homePage = new HomePage(page);
        await homePage.goto();

        const sideNav = page.locator("nav.side-nav");
        const mobileMenu = page.locator("li#mobile-menu");

        await expect(sideNav).not.toBeVisible();
        await expect(mobileMenu).not.toBeVisible();
    });

    test("side nav is visible on docs pages", async ({ page }) => {
        const docsPage = new DocsPage(page);
        await docsPage.goto("/docs/1.x/installation.html");

        const sideNav = page.locator("nav.side-nav");
        const mobileMenu = page.locator("li#mobile-menu");

        await expect(sideNav).toBeVisible();
        await expect(mobileMenu).not.toBeVisible();
    });
});

test.describe("Mobile navigation (<1024px)", () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test("mobile menu is visible and main nav links are hidden", async ({ page }) => {
        const docsPage = new DocsPage(page);
        await docsPage.goto("/docs/1.x/installation.html");

        const mobileMenu = page.locator("li#mobile-menu");
        const mainNavLinks = page.locator("li.main-nav-link");

        await expect(mobileMenu).toBeVisible();
        await expect(mainNavLinks.first()).not.toBeVisible();
    });

    test("toggling mobile menu shows/hides side nav with overlay", async ({ page }) => {
        const docsPage = new DocsPage(page);
        await docsPage.goto("/docs/1.x/installation.html");

        const mobileMenuLink = page.locator("li#mobile-menu a");
        const sideNav = page.locator("nav.side-nav");
        const grayOut = page.locator("div#gray-out");
        const body = page.locator("body");

        // Initially, side nav should be visible but positioned off-screen
        await expect(sideNav).toBeVisible();
        await expect(grayOut).toHaveCSS("visibility", "hidden");
        await expect(body).not.toHaveClass(/nav-open/);

        // Click mobile menu to open
        await mobileMenuLink.click();

        // Verify nav-open class is added and gray-out becomes visible
        await expect(body).toHaveClass(/nav-open/);
        await expect(grayOut).toHaveCSS("visibility", "visible");

        // Click mobile menu again to close
        await mobileMenuLink.click();

        // Verify nav-open class is removed and gray-out is hidden
        await expect(body).not.toHaveClass(/nav-open/);
        await expect(grayOut).toHaveCSS("visibility", "hidden");
    });

    test("clicking gray-out closes mobile nav", async ({ page }) => {
        const docsPage = new DocsPage(page);
        await docsPage.goto("/docs/1.x/installation.html");

        const mobileMenuLink = page.locator("li#mobile-menu a");
        const grayOut = page.locator("div#gray-out");
        const body = page.locator("body");

        // Open mobile nav
        await mobileMenuLink.click();
        await expect(body).toHaveClass(/nav-open/);
        await expect(grayOut).toHaveCSS("visibility", "visible");

        // Click gray-out to close
        await grayOut.click();

        // Verify nav-open class is removed and gray-out is hidden
        await expect(body).not.toHaveClass(/nav-open/);
        await expect(grayOut).toHaveCSS("visibility", "hidden");
    });
});
