import { test, expect } from "../fixtures/pages";
import { TEST_DOCS, TEST_CONTEXTS } from "../fixtures/test-data";
import { assertContextCookie, assertUrlContainsContext } from "../lib/assertions";

test("changing context updates URL and sets cookie", async ({ page, docsPage }) => {
    await docsPage.goto(TEST_DOCS.installation);

    // Default should be framework
    await expect(docsPage.contextSelector.select).toHaveValue(TEST_CONTEXTS.framework);
    await assertUrlContainsContext(page, TEST_CONTEXTS.framework);

    // Change to library
    await docsPage.contextSelector.selectContext(TEST_CONTEXTS.library);

    // URL should update and cookie should be set
    await assertUrlContainsContext(page, TEST_CONTEXTS.library);
    await assertContextCookie(page, TEST_CONTEXTS.library);

    // Change back to framework
    await docsPage.contextSelector.selectContext(TEST_CONTEXTS.framework);

    // URL should update and cookie should be updated
    await assertUrlContainsContext(page, TEST_CONTEXTS.framework);
    await assertContextCookie(page, TEST_CONTEXTS.framework);
});

test("context cookie persists across navigation", async ({ page, docsPage }) => {
    await docsPage.goto(TEST_DOCS.installation);

    // Change to library
    await docsPage.contextSelector.selectContext(TEST_CONTEXTS.library);
    await assertUrlContainsContext(page, TEST_CONTEXTS.library);

    // Navigate to installation page again
    await docsPage.goto(TEST_DOCS.installation);

    // URL should contain context=library from cookie (wait for useEffect to update URL)
    await assertUrlContainsContext(page, TEST_CONTEXTS.library);

    // Select should have library selected
    await expect(docsPage.contextSelector.select).toHaveValue(TEST_CONTEXTS.library);
});
