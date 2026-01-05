import { Page } from "@playwright/test";
import { assertPageOk } from "../lib/navigation";

export class GrafanaHomePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto(): Promise<void> {
        await assertPageOk(this.page, process.env.GRAFANA_BASE_URL!);
    }
}
