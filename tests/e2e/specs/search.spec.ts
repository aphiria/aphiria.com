import { test, expect } from "../fixtures/pages";
import { testQueries } from "../fixtures/test-data";

test("search results are invisible by default and when the query is deleted", async ({ homePage }) => {
    await expect(homePage.search.searchResults).not.toBeVisible();

    await homePage.search.query(testQueries.valid);
    await expect(homePage.search.searchResults).toBeVisible();

    await homePage.search.clear();
    await expect(homePage.search.searchResults).not.toBeVisible();
});

test("search displays results with a query that should return results", async ({ homePage }) => {
    await homePage.search.query(testQueries.valid);

    const results = homePage.search.results;
    await expect(results).not.toHaveCount(0);

    const firstResult = homePage.search.getResultLink(results.first());
    await expect(firstResult).toBeVisible();
});

test("can use arrow keys to select search results", async ({ page, homePage }) => {
    await homePage.search.query(testQueries.valid);

    await page.keyboard.press("ArrowDown");
    await expect(homePage.search.selectedResult).toHaveCount(1);

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

test("pressing enter navigates to first search result by default", async ({ page, homePage }) => {
    await homePage.search.query(testQueries.valid);

    const results = homePage.search.results;
    const firstResultLink = homePage.search.getResultLink(results.first());
    const href = await firstResultLink.getAttribute("href");

    expect(href, "Expected first search result to have href attribute").toBeTruthy();

    // Press Enter and wait for navigation to complete
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.toString().includes(href || ""), { waitUntil: "load" });

    expect(page.url()).toContain(href || "");
});

test("can click on search result to navigate", async ({ page, homePage }) => {
    await homePage.search.query(testQueries.valid);

    const results = homePage.search.results;

    // Get second result and click it
    const secondResult = results.nth(1);
    const secondResultLink = homePage.search.getResultLink(secondResult);
    const href = await secondResultLink.getAttribute("href");

    expect(href, "Expected second search result to have href attribute").toBeTruthy();

    await secondResultLink.click();

    await page.waitForLoadState("load");

    // Build expected URL with context parameter
    const url = new URL(href || "", process.env.SITE_BASE_URL!);
    url.searchParams.set("context", "framework");

    await expect(page).toHaveURL(url.toString());
});

test("searching with a query with no results shows a no results message", async ({ homePage }) => {
    await homePage.search.query(testQueries.noResults);

    const noResults = homePage.search.noResults;
    await expect(noResults).toHaveCount(1);
    await expect(noResults).toContainText(`No results for "${testQueries.noResults}"`);
});

test("clicking outside search results hides them", async ({ page, homePage }) => {
    await homePage.search.query(testQueries.valid);

    await expect(homePage.search.searchResults).toBeVisible();

    await page.click("body");

    await expect(homePage.search.searchResults).not.toBeVisible();
});
