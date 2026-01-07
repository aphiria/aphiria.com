import { test, expect } from "../fixtures/pages";
import { testDocs } from "../fixtures/test-data";
import { assertPageOk } from "../lib/assertions";

test("sidebar sections contain visible headings with text and navigation lists", async ({ docsPage }) => {
    await docsPage.goto(testDocs.introduction);

    const sections = docsPage.sideNav.sections;
    await expect(sections).not.toHaveCount(0);

    const sectionCount = await sections.count();

    for (let i = 0; i < sectionCount; i++) {
        const section = sections.nth(i);

        const heading = docsPage.sideNav.sectionHeading(section);
        await expect(heading).toBeVisible();
        const headingText = await heading.textContent();
        expect(headingText?.trim(), "Expected section heading to have text").not.toBe("");

        const nav = docsPage.sideNav.sectionNav(section);
        await expect(nav).toBeVisible();
    }
});

test("all sidebar links return successful HTTP responses", async ({ page, docsPage }) => {
    // We're visiting a bunch of pages here, so increase the timeout
    test.setTimeout(60000);

    await docsPage.goto(testDocs.introduction);

    const internalHrefs = await docsPage.sideNav.getAllInternalLinks();

    console.log(`Testing ${internalHrefs.length} same-origin sidebar links`);

    const baseUrl = new URL(process.env.SITE_BASE_URL!);
    for (const href of internalHrefs) {
        const fullUrl = new URL(href, baseUrl).toString();
        await assertPageOk(page, fullUrl);
    }
});
