import { test, expect } from "@playwright/test";
import { assertPageOk } from "../lib/navigation";

test("sidebar structure", async ({ page }) => {
    await assertPageOk(page, `${process.env.SITE_BASE_URL}/docs/1.x/introduction.html`);

    const sections = page.locator("nav.side-nav section");
    await expect(sections).not.toHaveCount(0);

    const sectionCount = await sections.count();

    for (let i = 0; i < sectionCount; i++) {
        const section = sections.nth(i);

        const heading = section.locator("h5");
        await expect(heading).toBeVisible();
        const headingText = await heading.textContent();
        expect(headingText?.trim()).not.toBe("");

        const nav = section.locator("ul.doc-sidebar-nav");
        await expect(nav).toBeVisible();
    }
});

test("sidebar link traversal", async ({ page }) => {
    await assertPageOk(page, `${process.env.SITE_BASE_URL}/docs/1.x/introduction.html`);

    const sections = page.locator("nav.side-nav section");
    const hrefs: string[] = [];

    const sectionCount = await sections.count();
    for (let i = 0; i < sectionCount; i++) {
        const links = sections.nth(i).locator("ul.doc-sidebar-nav li a");
        const linkCount = await links.count();

        for (let j = 0; j < linkCount; j++) {
            const href = await links.nth(j).getAttribute("href");
            if (href) hrefs.push(href);
        }
    }

    const uniqueHrefs = [...new Set(hrefs)];

    const baseUrl = new URL(process.env.SITE_BASE_URL!);
    const internalHrefs = uniqueHrefs.filter((href) => {
        try {
            const url = new URL(href, baseUrl);
            return url.origin === baseUrl.origin;
        } catch {
            return false;
        }
    });

    console.log(`Testing ${internalHrefs.length} same-origin sidebar links`);

    for (const href of internalHrefs) {
        const fullUrl = new URL(href, baseUrl).toString();
        await assertPageOk(page, fullUrl);
    }
});
