import { test, expect } from "../fixtures/pages";

test("homepage loads successfully", async ({ homePage }) => {
    await expect(homePage.mainNav.navItems.first()).toBeVisible();
});

test("main navigation structure is visible", async ({ homePage }) => {
    const navItems = homePage.mainNav.navItems;
    await expect(navItems).toHaveCount(4);

    await expect(homePage.mainNav.docsLink).toBeVisible();
    await expect(homePage.mainNav.gitHubLink).toBeVisible();
    await expect(homePage.mainNav.discussionsLink).toBeVisible();
});

test("copy button copies code and changes button text", async ({ homePage, browserName }) => {
    test.skip(browserName === "webkit", "WebKit does not support reading from clipboard in tests");

    await expect(homePage.copyButton.button).toBeVisible();
    await expect(homePage.copyButton.button).toHaveText("Copy");

    const codeText = await homePage.copyButton.getCodeText();

    await homePage.copyButton.click();

    await expect(homePage.copyButton.button).toHaveText("Copied!");

    const clipboardText = await homePage.copyButton.getClipboardText();
    expect(clipboardText).toBe(codeText);

    // Wait for button text to revert back to "Copy" (uses Playwright's smart retry)
    await expect(homePage.copyButton.button).toHaveText("Copy", { timeout: 6000 });
});
