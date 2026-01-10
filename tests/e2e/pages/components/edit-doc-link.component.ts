import { Page, Locator } from "@playwright/test";

/**
 * Edit documentation link component in article footer
 */
export class EditDocLink {
    readonly page: Page;
    readonly link: Locator;

    constructor(page: Page) {
        this.page = page;
        this.link = page.locator("article footer a[href*='github.com/aphiria/aphiria.com']");
    }

    async getHref(): Promise<string | null> {
        return this.link.getAttribute("href");
    }

    /**
     * Converts a documentation page path to expected GitHub edit URL
     * Example: /docs/1.x/introduction.html -> https://github.com/aphiria/aphiria.com/blob/master/docs/introduction.md
     */
    static getExpectedGitHubUrl(docPath: string): string {
        const pathWithoutDocsPrefix = docPath.replace(/^\/docs\//, "");
        const pathWithoutVersion = pathWithoutDocsPrefix.replace(/^[^/]+\//, "");
        const mdPath = pathWithoutVersion.replace(/\.html$/, ".md");
        return `https://github.com/aphiria/aphiria.com/blob/master/docs/${mdPath}`;
    }
}
