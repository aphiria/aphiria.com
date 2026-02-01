import { Page, Locator } from "@playwright/test";

/**
 * Theme toggle button component
 */
export class ThemeToggle {
    readonly page: Page;
    readonly button: Locator;

    constructor(page: Page) {
        this.page = page;
        this.button = page.getByRole("button", { name: /switch to/i });
    }

    async toggle(): Promise<void> {
        await this.button.click();
    }
}
