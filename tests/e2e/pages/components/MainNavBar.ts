import { Page, Locator } from "@playwright/test";

export class MainNavBar {
    readonly page: Page;
    readonly mainNav: Locator;

    constructor(page: Page) {
        this.page = page;
        this.mainNav = page.locator("ul.main-nav");
    }

    getNavItems() {
        return this.mainNav.locator("li:visible");
    }

    getDocsLink() {
        return this.mainNav.locator('a[href="/docs/1.x/introduction.html"]');
    }

    getGitHubLink() {
        return this.mainNav.locator('a[href="https://github.com/aphiria/aphiria"]');
    }

    getDiscussionsLink() {
        return this.mainNav.locator('a[href="https://github.com/aphiria/aphiria/discussions"]');
    }
}
