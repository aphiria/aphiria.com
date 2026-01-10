import { Page, Locator } from "@playwright/test";
import { grantClipboardPermissions, readClipboard } from "../../lib/clipboard";

/**
 * Copy button with clipboard functionality
 */
export class CopyButton {
    readonly page: Page;
    readonly button: Locator;

    constructor(page: Page, button?: Locator) {
        this.page = page;
        this.button = button || page.locator("button.copy-button").first();
    }

    async getCodeText(): Promise<string> {
        const codeElement = this.button.locator("..").locator("..").locator("code");
        return await codeElement.innerText();
    }

    async click(): Promise<void> {
        await grantClipboardPermissions(this.page);
        await this.button.click();
    }

    async getClipboardText(): Promise<string> {
        return await readClipboard(this.page);
    }
}
