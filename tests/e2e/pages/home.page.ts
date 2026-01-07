import { Page } from "@playwright/test";
import { MainNavBar } from "./components/main-nav-bar.component";
import { SearchBar } from "./components/search-bar.component";
import { CopyButton } from "./components/copy-button.component";
import { assertPageOk } from "../lib/assertions";
import { Navigable } from "./navigable.interface";

/**
 * Page object for the homepage
 */
export class HomePage implements Navigable {
    readonly page: Page;
    readonly mainNav: MainNavBar;
    readonly search: SearchBar;
    readonly copyButton: CopyButton;

    constructor(page: Page) {
        this.page = page;
        this.mainNav = new MainNavBar(page);
        this.search = new SearchBar(page);
        this.copyButton = new CopyButton(page);
    }

    async goto(): Promise<void> {
        await assertPageOk(this.page, process.env.SITE_BASE_URL!);
    }
}
