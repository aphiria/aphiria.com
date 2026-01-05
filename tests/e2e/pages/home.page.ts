import { Page } from "@playwright/test";
import { MainNavBar } from "./components/main-nav-bar.component";
import { SearchBar } from "./components/search-bar.component";
import { assertPageOk } from "../lib/navigation";

export class HomePage {
    readonly page: Page;
    readonly mainNav: MainNavBar;
    readonly search: SearchBar;

    constructor(page: Page) {
        this.page = page;
        this.mainNav = new MainNavBar(page);
        this.search = new SearchBar(page);
    }

    async goto(): Promise<void> {
        await assertPageOk(this.page, process.env.SITE_BASE_URL!);
    }
}
