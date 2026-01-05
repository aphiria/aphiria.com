import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/home.page";
import {
    getFirstCopyButton,
    getCodeTextForCopyButton,
    clickCopyButton,
    getClipboardText,
} from "../pages/components/copy-button.component";

test("homepage loads successfully", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
});

test("main navigation structure", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const navItems = homePage.mainNav.navItems;
    await expect(navItems).toHaveCount(4);

    await expect(homePage.mainNav.docsLink).toHaveCount(1);
    await expect(homePage.mainNav.gitHubLink).toHaveCount(1);
    await expect(homePage.mainNav.discussionsLink).toHaveCount(1);
});

test("copy button copies code and changes button text", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const copyButton = getFirstCopyButton(page);
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toHaveText("Copy");

    const codeText = await getCodeTextForCopyButton(copyButton);

    await clickCopyButton(page, copyButton);

    await expect(copyButton).toHaveText("Copied!");

    const clipboardText = await getClipboardText(page);
    expect(clipboardText).toBe(codeText);

    await page.waitForTimeout(5000);

    await expect(copyButton).toHaveText("Copy");
});
