import { test } from "@playwright/test";
import { GrafanaHomePage } from "../pages/grafana-home.page";

test("Grafana accessibility", async ({ page }) => {
    const grafanaPage = new GrafanaHomePage(page);
    await grafanaPage.goto();
});
