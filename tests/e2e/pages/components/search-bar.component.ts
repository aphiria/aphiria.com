import { Page, Locator } from "@playwright/test";

/**
 * Search bar component
 */
export class SearchBar {
    readonly page: Page;
    readonly searchInput: Locator;
    readonly searchResults: Locator;
    readonly results: Locator;
    readonly noResults: Locator;
    readonly selectedResult: Locator;

    constructor(page: Page) {
        this.page = page;
        this.searchInput = page.locator("#search-query");
        this.searchResults = page.locator("ul.search-results");
        this.results = page.locator("ul.search-results li:not(.no-results)");
        this.noResults = page.locator("li.no-results");
        this.selectedResult = page.locator("ul.search-results li.selected");
    }

    getResultLink(result: Locator): Locator {
        return result.locator("a");
    }

    async query(searchQuery: string): Promise<void> {
        // Click to focus, then type to trigger keyup events
        await this.searchInput.click();
        await this.searchInput.pressSequentially(searchQuery, { delay: 50 });

        // Wait for search results container to become visible (250ms debounce + API call)
        await this.searchResults.waitFor({ state: "visible", timeout: 5000 });
    }

    async clear(): Promise<void> {
        await this.searchInput.clear();
        await this.searchInput.press("Backspace");
    }
}
