import { test, expect } from "../fixtures/pages";
import { testDocs } from "../fixtures/test-data";
import { MobileNav } from "../pages/components/mobile-nav.component";

test.describe("desktop navigation (>=1024px)", () => {
    test.use({ viewport: { width: 1024, height: 768 } });

    test("side nav is hidden on homepage", async ({ page, homePage: _homePage }) => {
        const mobileNav = new MobileNav(page);

        await expect(mobileNav.sideNav).not.toBeVisible();
        await expect(mobileNav.mobileMenu).not.toBeVisible();
    });

    test("side nav is visible on docs pages", async ({ page, docsPage }) => {
        await docsPage.goto(testDocs.installation);

        const mobileNav = new MobileNav(page);

        await expect(mobileNav.sideNav).toBeVisible();
        await expect(mobileNav.mobileMenu).not.toBeVisible();
    });
});

test.describe("mobile navigation (<1024px)", () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test("mobile menu is visible and main nav links are hidden", async ({ page, docsPage }) => {
        await docsPage.goto(testDocs.installation);

        const mobileNav = new MobileNav(page);

        await expect(mobileNav.mobileMenu).toBeVisible();
        await expect(mobileNav.mainNavLinks.first()).not.toBeVisible();
    });

    test.describe("mobile menu interactions", () => {
        test.beforeEach(async ({ page, docsPage }) => {
            await docsPage.goto(testDocs.installation);

            const mobileNav = new MobileNav(page);

            // Verify initial state
            await expect(mobileNav.sideNav).toBeVisible();
            await expect(mobileNav.grayOut).toHaveCSS("visibility", "hidden");
            await expect(mobileNav.body).not.toHaveClass(/nav-open/);
        });

        test("toggling mobile menu shows/hides side nav with overlay", async ({ page }) => {
            const mobileNav = new MobileNav(page);

            // Click mobile menu to open
            await mobileNav.mobileMenuLink.click();

            // Verify nav-open class is added and gray-out becomes visible
            await expect(mobileNav.body).toHaveClass(/nav-open/);
            await expect(mobileNav.grayOut).toHaveCSS("visibility", "visible");

            // Click mobile menu again to close
            await mobileNav.mobileMenuLink.click();

            // Verify nav-open class is removed and gray-out is hidden
            await expect(mobileNav.body).not.toHaveClass(/nav-open/);
            await expect(mobileNav.grayOut).toHaveCSS("visibility", "hidden");
        });

        test("clicking gray-out closes mobile nav", async ({ page }) => {
            const mobileNav = new MobileNav(page);

            // Open mobile nav
            await mobileNav.mobileMenuLink.click();
            await expect(mobileNav.body).toHaveClass(/nav-open/);
            await expect(mobileNav.grayOut).toHaveCSS("visibility", "visible");

            // Click gray-out to close
            await mobileNav.grayOut.click();

            // Verify nav-open class is removed and gray-out is hidden
            await expect(mobileNav.body).not.toHaveClass(/nav-open/);
            await expect(mobileNav.grayOut).toHaveCSS("visibility", "hidden");
        });
    });
});
