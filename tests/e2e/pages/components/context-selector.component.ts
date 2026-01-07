import { Page, Locator } from "@playwright/test";

/**
 * Context selector dropdown component
 */
export class ContextSelector {
    readonly page: Page;
    readonly select: Locator;

    constructor(page: Page) {
        this.page = page;
        this.select = page.locator("#context-selector");
    }

    async selectContext(context: string): Promise<void> {
        await this.select.selectOption(context);
    }
}
