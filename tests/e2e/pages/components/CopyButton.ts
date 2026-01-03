import { Page, Locator } from "@playwright/test";

export function getFirstCopyButton(page: Page): Locator {
    return page.locator("button.copy-button").first();
}

export async function getCodeTextForCopyButton(button: Locator): Promise<string> {
    const codeElement = button.locator("..").locator("..").locator("code");
    return await codeElement.innerText();
}

export async function clickCopyButton(page: Page, button: Locator): Promise<void> {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await button.click();
}

export async function getClipboardText(page: Page): Promise<string> {
    return await page.evaluate(() => navigator.clipboard.readText());
}
