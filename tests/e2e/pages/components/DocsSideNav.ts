import { Page, Locator } from "@playwright/test";

export class DocsSideNav {
    readonly page: Page;
    readonly sideNav: Locator;

    constructor(page: Page) {
        this.page = page;
        this.sideNav = page.locator("nav.side-nav");
    }

    getVersions() {
        return this.sideNav.locator("ul.versions li");
    }

    getCategories() {
        return this.sideNav.locator("ul.categories > li");
    }

    async traverseAllLinks(): Promise<void> {
        const links = this.sideNav.locator("a");
        const count = await links.count();
        const hrefs: string[] = [];

        for (let i = 0; i < count; i++) {
            const href = await links.nth(i).getAttribute("href");
            if (href) {
                hrefs.push(href);
            }
        }

        for (const href of hrefs) {
            await this.page.goto(href);
        }
    }
}
