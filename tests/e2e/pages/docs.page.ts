import { Page } from "@playwright/test";
import { SearchBar } from "./components/search-bar.component";
import { DocsSideNav } from "./components/docs-side-nav.component";
import { ContextSelector } from "./components/context-selector.component";
import { EditDocLink } from "./components/edit-doc-link.component";
import { assertPageOk } from "../lib/assertions";
import { Navigable } from "./navigable.interface";

/**
 * Page object for documentation pages
 */
export class DocsPage implements Navigable {
    readonly page: Page;
    readonly search: SearchBar;
    readonly sideNav: DocsSideNav;
    readonly contextSelector: ContextSelector;
    readonly editDocLink: EditDocLink;

    constructor(page: Page) {
        this.page = page;
        this.search = new SearchBar(page);
        this.sideNav = new DocsSideNav(page);
        this.contextSelector = new ContextSelector(page);
        this.editDocLink = new EditDocLink(page);
    }

    async goto(docPath?: string): Promise<void> {
        const url = docPath ? `${process.env.SITE_BASE_URL}${docPath}` : process.env.SITE_BASE_URL!;
        await assertPageOk(this.page, url);
    }
}
