import { test, expect } from "../fixtures/pages";
import { assertThemeCookie } from "../lib/assertions";
import { LEGACY_DOCS } from "../fixtures/test-data";

test.describe("Theme Toggle", () => {
    test("toggles theme from light to dark", async ({ homePage }) => {
        await expect(homePage.page.locator("html")).toHaveAttribute("data-theme", "light");
        await expect(homePage.themeToggle.button).toHaveAttribute("aria-label", "Switch to dark mode");

        await homePage.themeToggle.toggle();

        await expect(homePage.page.locator("html")).toHaveAttribute("data-theme", "dark");
        await expect(homePage.themeToggle.button).toHaveAttribute("aria-label", "Switch to light mode");

        await assertThemeCookie(homePage.page, "dark");
    });

    test("toggles theme from dark to light", async ({ homePage }) => {
        await homePage.page.evaluate(() => {
            document.cookie = "theme-preference=dark; path=/";
            document.documentElement.setAttribute("data-theme", "dark");
        });

        await homePage.page.reload();

        await expect(homePage.page.locator("html")).toHaveAttribute("data-theme", "dark");
        await expect(homePage.themeToggle.button).toHaveAttribute("aria-label", "Switch to light mode");

        await homePage.themeToggle.toggle();

        await expect(homePage.page.locator("html")).toHaveAttribute("data-theme", "light");
        await expect(homePage.themeToggle.button).toHaveAttribute("aria-label", "Switch to dark mode");
    });

    test("theme toggle is visible in footer", async ({ homePage }) => {
        const footer = homePage.page.locator("footer");
        await expect(footer).toBeVisible();

        const toggleInFooter = footer.getByRole("button", { name: /switch to/i });
        await expect(toggleInFooter).toBeVisible();

        await expect(footer.getByText(/Aphiria/i)).toBeVisible();
        await expect(footer.getByText(/David Young/i)).toBeVisible();
    });

    test("theme switches instantly without flicker", async ({ homePage }) => {
        await homePage.themeToggle.toggle();

        await expect(homePage.page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 100 });
    });

    test("keyboard interaction with Enter key", async ({ homePage }) => {
        await homePage.themeToggle.button.focus();
        await expect(homePage.themeToggle.button).toBeFocused();

        const initialTheme = await homePage.page.locator("html").getAttribute("data-theme");
        await homePage.themeToggle.button.press("Enter");

        const updatedTheme = await homePage.page.locator("html").getAttribute("data-theme");
        expect(updatedTheme).not.toBe(initialTheme);
    });

    test("keyboard interaction with Space key", async ({ homePage }) => {
        await homePage.themeToggle.button.focus();
        await expect(homePage.themeToggle.button).toBeFocused();

        const initialTheme = await homePage.page.locator("html").getAttribute("data-theme");
        await homePage.themeToggle.button.press("Space");

        const updatedTheme = await homePage.page.locator("html").getAttribute("data-theme");
        expect(updatedTheme).not.toBe(initialTheme);
    });

    test("theme persists across page navigation", async ({ homePage, docsPage }) => {
        await homePage.themeToggle.toggle();

        await expect(homePage.page.locator("html")).toHaveAttribute("data-theme", "dark");

        await docsPage.goto(LEGACY_DOCS.installation);

        await expect(docsPage.page.locator("html")).toHaveAttribute("data-theme", "dark");
        await expect(docsPage.themeToggle.button).toHaveAttribute("aria-label", "Switch to light mode");
    });

    test("theme persists across page reload", async ({ homePage }) => {
        await homePage.themeToggle.toggle();

        await expect(homePage.page.locator("html")).toHaveAttribute("data-theme", "dark");

        await homePage.page.reload();

        await expect(homePage.page.locator("html")).toHaveAttribute("data-theme", "dark");
        await expect(homePage.themeToggle.button).toHaveAttribute("aria-label", "Switch to light mode");
    });

    test("no FOUC on page load with cookie preference", async ({ page }) => {
        await page.addInitScript(() => {
            document.cookie = "theme-preference=dark; path=/";
        });

        await page.goto(process.env.SITE_BASE_URL!);

        const themeAttr = await page.locator("html").getAttribute("data-theme");
        expect(themeAttr).toBe("dark");

        await expect(page.locator("body")).toBeVisible();
    });

    test("dark theme applies dark background", async ({ homePage }) => {
        await homePage.themeToggle.toggle();

        await expect(homePage.page.locator("html")).toHaveAttribute("data-theme", "dark");

        const bodyBgColor = await homePage.page.locator("body").evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
        });

        const rgbMatch = bodyBgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            const [_, r, g, b] = rgbMatch.map(Number);
            expect(r).toBeLessThan(128);
            expect(g).toBeLessThan(128);
            expect(b).toBeLessThan(128);
        }
    });

    test("aria labels update correctly", async ({ homePage }) => {
        await expect(homePage.themeToggle.button).toHaveAttribute("aria-label", "Switch to dark mode");

        await homePage.themeToggle.toggle();

        await expect(homePage.themeToggle.button).toHaveAttribute("aria-label", "Switch to light mode");
    });
});
