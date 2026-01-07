import { Page } from "@playwright/test";
import { assertPageOk } from "../lib/assertions";
import { Navigable } from "./navigable.interface";

/**
 * Page object for Grafana homepage
 */
export class GrafanaHomePage implements Navigable {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto(): Promise<void> {
        await assertPageOk(this.page, process.env.GRAFANA_BASE_URL!);
    }
}
