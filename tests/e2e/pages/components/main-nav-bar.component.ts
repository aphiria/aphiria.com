import { Page, Locator } from "@playwright/test";

/**
 * Main navigation bar component
 */
export class MainNavBar {
    readonly page: Page;
    readonly nav: Locator;
    readonly navItems: Locator;
    readonly docsLink: Locator;
    readonly gitHubLink: Locator;
    readonly discussionsLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.nav = page.locator("ul.main-nav");
        this.navItems = this.nav.locator("li.main-nav-link:visible");
        this.docsLink = this.nav.locator('a[href="/docs"]');
        this.gitHubLink = this.nav.locator('a[href="https://github.com/aphiria/aphiria"]');
        this.discussionsLink = this.nav.locator(
            'a[href="https://github.com/aphiria/aphiria/discussions"]'
        );
    }
}
