import { Page } from "@playwright/test";

/**
 * Grants clipboard permissions for browsers that require it
 * WebKit doesn't support clipboard-write permission and allows clipboard access during user gestures
 */
export async function grantClipboardPermissions(page: Page): Promise<void> {
    const browserName = page.context().browser()?.browserType().name();

    if (browserName === "chromium") {
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    }
}

/**
 * Reads text from the clipboard
 * Requires prior user gesture (like button click) or granted permissions
 */
export async function readClipboard(page: Page): Promise<string> {
    return await page.evaluate(() => navigator.clipboard.readText());
}
