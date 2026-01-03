import { Page, Locator } from "@playwright/test";

export class ContextSelector {
    readonly page: Page;
    readonly contextSelector: Locator;

    constructor(page: Page) {
        this.page = page;
        this.contextSelector = page.locator("#context-selector");
    }

    async selectContext(context: string): Promise<void> {
        await this.contextSelector.selectOption(context);
    }

    async getSelectedContext(): Promise<string | null> {
        return await this.contextSelector.inputValue();
    }
}
