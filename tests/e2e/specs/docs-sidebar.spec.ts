import { test, expect } from "@playwright/test";
import { DocsPage } from "../pages/docs.page";
import { assertPageOk } from "../lib/navigation";

test("sidebar structure", async ({ page }) => {
    const docsPage = new DocsPage(page);
    await docsPage.goto("/docs/1.x/introduction.html");

    const sections = docsPage.sideNav.sections;
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
    // We're visiting a bunch of pages here, so increase the timeout
    test.setTimeout(60000);

    const docsPage = new DocsPage(page);
    await docsPage.goto("/docs/1.x/introduction.html");

    const internalHrefs = await docsPage.sideNav.getAllInternalLinks();

    console.log(`Testing ${internalHrefs.length} same-origin sidebar links`);

    const baseUrl = new URL(process.env.SITE_BASE_URL!);
    for (const href of internalHrefs) {
        const fullUrl = new URL(href, baseUrl).toString();
        await assertPageOk(page, fullUrl);
    }
});
