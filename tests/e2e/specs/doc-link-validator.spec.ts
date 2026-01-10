import { test } from "../fixtures/pages";
import { TEST_DOCS } from "../fixtures/test-data";
import { EditDocLink } from "../pages/components/edit-doc-link.component";

test.describe("documentation link validation", () => {
    let docPageUrls: string[];

    test.beforeEach(async ({ docsPage }) => {
        test.setTimeout(90000);
        await docsPage.goto(TEST_DOCS.introduction);
        docPageUrls = await docsPage.sideNav.getAllInternalLinks();
        console.log(`Found ${docPageUrls.length} documentation pages`);
    });

    test("all internal links have valid targets and anchors", async ({ page }) => {
        const baseUrl = process.env.SITE_BASE_URL!;

        interface ScrapedDocPage {
            url: string;
            ids: Set<string>;
            links: Array<{ href: string; path: string; anchor: string | null }>;
            httpStatus: number | null;
        }

        const scrapedPages = new Map<string, ScrapedDocPage>();

        // Phase 1: Visit each page once and collect all IDs and internal links
        for (const docPageUrl of docPageUrls) {
            const fullDocUrl = `${baseUrl}${docPageUrl}`;
            const response = await page.goto(fullDocUrl, { waitUntil: "load" });

            const scrapedPage: ScrapedDocPage = {
                url: docPageUrl,
                ids: new Set<string>(),
                links: [],
                httpStatus: response?.status() || null,
            };

            if (!response || !response.ok()) {
                scrapedPages.set(docPageUrl, scrapedPage);
                continue;
            }

            // Collect all element IDs on this page
            const elementIds = await page.locator("[id]").evaluateAll((elements) =>
                elements
                    .map((el) => el.getAttribute("id"))
                    .filter((id): id is string => id !== null)
            );
            scrapedPage.ids = new Set(elementIds);

            // Collect all internal documentation links from this page
            const linkHrefs = await page.locator("a[href]").evaluateAll((elements) =>
                elements
                    .map((el) => el.getAttribute("href"))
                    .filter((href): href is string => href !== null)
                    .filter((href) => href.startsWith("/docs/") || href.startsWith("#"))
            );

            for (const href of linkHrefs) {
                const [path, anchor] = href.includes("#") ? href.split("#", 2) : [href, null];
                const targetPath = path || docPageUrl;

                scrapedPage.links.push({ href, path: targetPath, anchor });
            }

            scrapedPages.set(docPageUrl, scrapedPage);
        }

        console.log(`Collected data from ${scrapedPages.size} pages`);

        // Phase 2: Validate all links
        const allErrors: string[] = [];
        const validatedLinks = new Set<string>();

        for (const [sourceUrl, sourceData] of scrapedPages) {
            if (sourceData.httpStatus !== 200) {
                allErrors.push(
                    `${sourceUrl} - Failed to load (HTTP ${sourceData.httpStatus || "unknown"})`
                );
                continue;
            }

            for (const link of sourceData.links) {
                const uniqueKey = `${link.path}${link.anchor ? "#" + link.anchor : ""}`;

                if (validatedLinks.has(uniqueKey)) {
                    continue;
                }

                validatedLinks.add(uniqueKey);

                const targetData = scrapedPages.get(link.path);

                if (!targetData) {
                    allErrors.push(
                        `${uniqueKey} - Target page not found in documentation (linked from ${sourceUrl})`
                    );
                    continue;
                }

                if (targetData.httpStatus !== 200) {
                    allErrors.push(
                        `${uniqueKey} - HTTP ${targetData.httpStatus || "unknown"} (linked from ${
                            sourceUrl
                        })`
                    );
                    continue;
                }

                if (link.anchor && !targetData.ids.has(link.anchor)) {
                    allErrors.push(
                        `${uniqueKey} - Anchor element #${link.anchor} not found (linked from ${
                            sourceUrl
                        })`
                    );
                }
            }
        }

        console.log(`Validated ${validatedLinks.size} unique internal links`);

        if (allErrors.length > 0) {
            throw new Error(
                `\n\nFound ${allErrors.length} broken link(s):\n${allErrors.join("\n")}\n`
            );
        }
    });

    test("all pages have a valid GitHub edit link", async ({ page, docsPage }) => {
        const baseUrl = process.env.SITE_BASE_URL!;
        const errors: string[] = [];

        for (const docPageUrl of docPageUrls) {
            const fullDocUrl = `${baseUrl}${docPageUrl}`;
            await page.goto(fullDocUrl, { waitUntil: "load" });

            const editLink = docsPage.editDocLink;
            const isVisible = await editLink.link.isVisible();

            if (!isVisible) {
                errors.push(`${docPageUrl} - Edit link not visible`);
                continue;
            }

            const actualHref = await editLink.getHref();
            const expectedHref = EditDocLink.getExpectedGitHubUrl(docPageUrl);

            if (actualHref !== expectedHref) {
                errors.push(
                    `${docPageUrl} - Edit link mismatch\n  Expected: ${expectedHref}\n  Actual: ${actualHref}`
                );
            }
        }

        if (errors.length > 0) {
            throw new Error(
                `\n\nFound ${errors.length} page(s) with incorrect edit links:\n${errors.join("\n")}\n`
            );
        }
    });
});
