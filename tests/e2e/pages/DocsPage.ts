import { Page } from "@playwright/test";
import { SearchBar } from "./components/SearchBar";
import { DocsSideNav } from "./components/DocsSideNav";
import { assertPageOk } from "../lib/navigation";

export class DocsPage {
    readonly page: Page;
    readonly search: SearchBar;
    readonly sideNav: DocsSideNav;

    constructor(page: Page) {
        this.page = page;
        this.search = new SearchBar(page);
        this.sideNav = new DocsSideNav(page);
    }

    async goto(): Promise<void> {
        await assertPageOk(this.page, process.env.SITE_BASE_URL!);
    }
}
