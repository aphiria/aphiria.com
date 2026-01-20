import { test, expect } from "../fixtures/pages";

test("404 page displays for non-existent route", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");

    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toContainText("404");
});
