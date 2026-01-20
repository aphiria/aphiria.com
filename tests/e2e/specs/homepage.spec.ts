import { test, expect } from "../fixtures/pages";

test("homepage loads successfully", async ({ homePage }) => {
    await expect(homePage.mainNav.navItems.first()).toBeVisible();
});

test("main navigation structure is visible", async ({ homePage }) => {
    const navItems = homePage.mainNav.navItems;
    await expect(navItems).toHaveCount(3);

    await expect(homePage.mainNav.docsLink).toBeVisible();
    await expect(homePage.mainNav.gitHubLink).toBeVisible();
    await expect(homePage.mainNav.discussionsLink).toBeVisible();
});

test("copy button copies code and swaps SVG icons", async ({ homePage, browserName }) => {
    test.skip(browserName === "webkit", "WebKit does not support reading from clipboard in tests");

    await expect(homePage.copyButton.button).toBeVisible();
    await expect(homePage.copyButton.copySvg).toBeVisible();

    const codeText = await homePage.copyButton.getCodeText();

    await homePage.copyButton.click();

    await expect(homePage.copyButton.checkSvg).toBeVisible();
    await expect(homePage.copyButton.copySvg).not.toBeVisible();

    const clipboardText = await homePage.copyButton.getClipboardText();
    expect(clipboardText).toBe(codeText);

    // Wait for SVG to revert back to copy icon
    await expect(homePage.copyButton.copySvg).toBeVisible({ timeout: 6000 });
    await expect(homePage.copyButton.checkSvg).not.toBeVisible();
});
