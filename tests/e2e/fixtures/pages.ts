import { test as base } from "@playwright/test";
import { HomePage } from "../pages/home.page";
import { DocsPage } from "../pages/docs.page";
import { GrafanaHomePage } from "../pages/grafana-home.page";

type PageFixtures = {
    homePage: HomePage;
    docsPage: DocsPage;
    grafanaPage: GrafanaHomePage;
};

/**
 * Custom fixtures for page objects
 * - homePage: Auto-navigates to homepage
 * - docsPage: No auto-navigation (tests must explicitly call goto())
 * - grafanaPage: Auto-navigates to Grafana homepage
 */
export const test = base.extend<PageFixtures>({
    homePage: async ({ page }, use) => {
        const homePage = new HomePage(page);
        await homePage.goto();
        await use(homePage);
    },

    docsPage: async ({ page }, use) => {
        const docsPage = new DocsPage(page);
        await use(docsPage);
    },

    grafanaPage: async ({ page }, use) => {
        const grafanaPage = new GrafanaHomePage(page);
        await grafanaPage.goto();
        await use(grafanaPage);
    },
});

export { expect } from "@playwright/test";
