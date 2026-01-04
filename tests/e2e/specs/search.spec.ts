import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";

test("search results are invisible by default and when the query is deleted", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.search.searchResults).not.toBeVisible();

    await homePage.search.query("rout");
    await expect(homePage.search.searchResults).toBeVisible();

    await homePage.search.clear();
    await expect(homePage.search.searchResults).not.toBeVisible();
});

test("search displays results", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.search.query("rout");

    const results = homePage.search.results;
    await expect(results).not.toHaveCount(0);

    const firstResult = results.first().locator("a");
    await expect(firstResult).toBeVisible();
});

test("can use arrow keys to select search results", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.search.query("rout");

    await page.keyboard.press("ArrowDown");
    const selected = page.locator("ul.search-results li.selected");
    await expect(selected).toHaveCount(1);

    const results = homePage.search.results;
    const count = await results.count();

    for (let i = 1; i < count; i++) {
        await page.keyboard.press("ArrowDown");
    }

    await page.keyboard.press("ArrowDown");
    await expect(results.first()).toHaveClass(/selected/);

    await page.keyboard.press("ArrowUp");
    await expect(results.last()).toHaveClass(/selected/);
});

test("pressing enter navigates to first search result by default", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.search.query("rout");

    const results = homePage.search.results;
    const firstResultLink = results.first().locator("a");
    const href = await firstResultLink.getAttribute("href");

    expect(href).toBeTruthy();

    // Press Enter and wait for navigation to complete
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.toString().includes(href || ""), { waitUntil: "domcontentloaded" });

    // We've already asserted that href should not be empty, so it should never fall back to ""
    expect(page.url()).toContain(href || "");
});

test("can click on search result to navigate", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.search.query("rout");

    const results = homePage.search.results;

    // Get second result and click it
    const secondResult = results.nth(1);
    const secondResultLink = secondResult.locator("a");
    const href = await secondResultLink.getAttribute("href");

    expect(href).toBeTruthy(); // Fail if href is null/undefined

    await secondResultLink.click();

    await page.waitForLoadState("domcontentloaded");

    // Build expected URL with context parameter
    // We've already asserted that href should not be empty, so it should never fall back to ""
    const url = new URL(href || "", process.env.SITE_BASE_URL!);
    url.searchParams.set("context", "framework");

    await expect(page).toHaveURL(url.toString());
});

test("search no results message", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.search.query("abcdefg123");

    const noResults = homePage.search.noResults;
    await expect(noResults).toHaveCount(1);
    await expect(noResults).toContainText('No results for "abcdefg123"');
});

test("clicking outside search results hides them", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.search.query("rout");

    await expect(homePage.search.searchResults).toBeVisible();

    await page.click("body");

    await expect(homePage.search.searchResults).not.toBeVisible();
});
