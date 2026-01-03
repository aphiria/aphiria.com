import { Page, Locator } from "@playwright/test";

export class MainNavBar {
    readonly page: Page;
    readonly mainNav: Locator;
    readonly navItems: Locator;
    readonly docsLink: Locator;
    readonly gitHubLink: Locator;
    readonly discussionsLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.mainNav = page.locator("ul.main-nav");
        this.navItems = this.mainNav.locator("li:visible");
        this.docsLink = this.mainNav.locator('a[href="/docs/1.x/introduction.html"]');
        this.gitHubLink = this.mainNav.locator('a[href="https://github.com/aphiria/aphiria"]');
        this.discussionsLink = this.mainNav.locator(
            'a[href="https://github.com/aphiria/aphiria/discussions"]'
        );
    }
}
