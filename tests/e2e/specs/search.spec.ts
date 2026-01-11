import { test, expect } from "../fixtures/pages";
import { TEST_QUERIES } from "../fixtures/test-data";

test("search results are invisible by default and when the query is deleted", async ({ homePage }) => {
    await expect(homePage.search.searchResults).not.toBeVisible();

    await homePage.search.query(TEST_QUERIES.valid);
    await expect(homePage.search.searchResults).toBeVisible();

    await homePage.search.clear();
    await expect(homePage.search.searchResults).not.toBeVisible();
});

test("search displays results with a query that should return results", async ({ homePage }) => {
    await homePage.search.query(TEST_QUERIES.valid);

    const results = homePage.search.results;
    await expect(results).toHaveCount(5);

    const firstResult = homePage.search.getResultLink(results.first());
    await expect(firstResult).toBeVisible();
});

test("can use arrow keys to select search results", async ({ page, homePage }) => {
    await homePage.search.query(TEST_QUERIES.valid);

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
    await homePage.search.query(TEST_QUERIES.valid);

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
    await homePage.search.query(TEST_QUERIES.valid);

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
    await homePage.search.query(TEST_QUERIES.noResults);

    const noResults = homePage.search.noResults;
    await expect(noResults).toHaveCount(1);
    await expect(noResults).toContainText(`No results for "${TEST_QUERIES.noResults}"`);
});

test("clicking outside search results hides them", async ({ page, homePage }) => {
    await homePage.search.query(TEST_QUERIES.valid);

    await expect(homePage.search.searchResults).toBeVisible();

    await page.click("body");

    await expect(homePage.search.searchResults).not.toBeVisible();
});

test("searching again after hiding results displays results", async ({ page, homePage }) => {
    await homePage.search.query(TEST_QUERIES.valid);

    const results = homePage.search.results;
    await expect(results).toHaveCount(5);

    await page.click("body");
    await expect(homePage.search.searchResults).not.toBeVisible();

    await homePage.search.searchInput.clear();
    await homePage.search.query(TEST_QUERIES.valid);
    await expect(results).toHaveCount(5);
    await expect(homePage.search.searchResults).toBeVisible();
});

test("search results highlight the root word with emphasis", async ({ homePage }) => {
    await homePage.search.query(TEST_QUERIES.valid);

    const results = homePage.search.results;
    await expect(results).toHaveCount(5);

    const resultCount = await results.count();

    for (let i = 0; i < resultCount; i++) {
        const hasHighlight = await homePage.search.hasHighlightedTermMatching(
            i,
            TEST_QUERIES.validHighlightPattern
        );
        expect(hasHighlight, `Expected result ${i + 1} to highlight a word matching root "rout"`).toBe(
            true
        );
    }
});

test("re-focusing search input re-displays results if query exists", async ({ page, homePage }) => {
    await homePage.search.query(TEST_QUERIES.valid);

    const results = homePage.search.results;
    await expect(results).toHaveCount(5);
    await expect(homePage.search.searchResults).toBeVisible();

    // Click body to hide results
    await page.click("body");
    await expect(homePage.search.searchResults).not.toBeVisible();

    // Focus the search input again (query still in input)
    await homePage.search.searchInput.focus();

    // Wait for API call to complete and results to be visible
    await expect(homePage.search.searchResults).toBeVisible();
    await expect(results).toHaveCount(5);
});

test("re-focusing empty search input does not show results", async ({ page, homePage }) => {
    // Ensure search input is empty
    await expect(homePage.search.searchInput).toHaveValue("");

    // Click body then focus input
    await page.click("body");
    await homePage.search.searchInput.focus();

    // Results should remain hidden
    await expect(homePage.search.searchResults).not.toBeVisible();
});
