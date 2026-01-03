import { Page, Locator } from "@playwright/test";

export class SearchBar {
    readonly page: Page;
    readonly searchInput: Locator;
    readonly searchResults: Locator;

    constructor(page: Page) {
        this.page = page;
        this.searchInput = page.locator("#search-query");
        this.searchResults = page.locator("ul.search-results");
    }

    async query(searchQuery: string): Promise<void> {
        const responsePromise = this.page.waitForResponse(
            (response) =>
                response.url().includes("/docs/search") && response.status() === 200
        );

        await this.searchInput.fill(searchQuery);
        await this.searchInput.dispatchEvent("keyup");
        await responsePromise;
    }

    async clear(): Promise<void> {
        await this.searchInput.clear();
        await this.searchInput.press("Backspace");
    }

    getResults() {
        return this.page.locator("ul.search-results li:not(.no-results)");
    }

    getNoResults() {
        return this.page.locator("li.no-results");
    }

    async selectResultByIndex(index: number): Promise<void> {
        for (let i = 0; i <= index; i++) {
            await this.page.keyboard.press("ArrowDown");
        }
    }

    getSelectedResult() {
        return this.page.locator("ul.search-results li.selected a");
    }
}
