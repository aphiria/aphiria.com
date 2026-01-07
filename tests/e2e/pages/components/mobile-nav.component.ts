import { Page, Locator } from "@playwright/test";

/**
 * Mobile navigation component
 */
export class MobileNav {
    readonly page: Page;
    readonly mobileMenu: Locator;
    readonly mobileMenuLink: Locator;
    readonly mainNavLinks: Locator;
    readonly sideNav: Locator;
    readonly grayOut: Locator;
    readonly body: Locator;

    constructor(page: Page) {
        this.page = page;
        this.mobileMenu = page.locator("li#mobile-menu");
        this.mobileMenuLink = page.locator("li#mobile-menu a");
        this.mainNavLinks = page.locator("li.main-nav-link");
        this.sideNav = page.locator("nav.side-nav");
        this.grayOut = page.locator("div#gray-out");
        this.body = page.locator("body");
    }
}
