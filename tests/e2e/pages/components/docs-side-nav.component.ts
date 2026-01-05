import { Page, Locator } from "@playwright/test";

export class DocsSideNav {
    readonly page: Page;
    readonly sideNav: Locator;
    readonly sections: Locator;

    constructor(page: Page) {
        this.page = page;
        this.sideNav = page.locator("nav.side-nav");
        this.sections = this.sideNav.locator("section");
    }

    async getAllInternalLinks(): Promise<string[]> {
        const hrefs: string[] = [];

        const sectionCount = await this.sections.count();
        for (let i = 0; i < sectionCount; i++) {
            const links = this.sections.nth(i).locator("ul.doc-sidebar-nav li a");
            const linkCount = await links.count();

            for (let j = 0; j < linkCount; j++) {
                const href = await links.nth(j).getAttribute("href");
                if (href) hrefs.push(href);
            }
        }

        const uniqueHrefs = [...new Set(hrefs)];

        const baseUrl = new URL(process.env.SITE_BASE_URL!);
        return uniqueHrefs.filter((href) => {
            try {
                const url = new URL(href, baseUrl);
                return url.origin === baseUrl.origin;
            } catch {
                return false;
            }
        });
    }
}
