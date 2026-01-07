import { test, expect } from "../fixtures/pages";
import { testDocs, testContexts } from "../fixtures/test-data";
import { assertContextCookie, assertUrlContainsContext } from "../lib/assertions";

test("changing context updates URL and sets cookie", async ({ page, docsPage }) => {
    await docsPage.goto(testDocs.installation);

    // Default should be framework
    await expect(docsPage.contextSelector.select).toHaveValue(testContexts.framework);
    expect(page.url()).toContain(`?context=${testContexts.framework}`);

    // Change to library
    await docsPage.contextSelector.selectContext(testContexts.library);

    // URL should update and cookie should be set
    await assertUrlContainsContext(page, testContexts.library);
    await assertContextCookie(page, testContexts.library);

    // Change back to framework
    await docsPage.contextSelector.selectContext(testContexts.framework);

    // URL should update and cookie should be updated
    await assertUrlContainsContext(page, testContexts.framework);
    await assertContextCookie(page, testContexts.framework);
});

test("context cookie persists across navigation", async ({ page, docsPage }) => {
    await docsPage.goto(testDocs.installation);

    // Change to library
    await docsPage.contextSelector.selectContext(testContexts.library);
    await assertUrlContainsContext(page, testContexts.library);

    // Navigate to installation page again
    await docsPage.goto(testDocs.installation);

    // URL should contain context=library from cookie
    expect(page.url()).toContain(`?context=${testContexts.library}`);

    // Select should have library selected
    await expect(docsPage.contextSelector.select).toHaveValue(testContexts.library);
});
