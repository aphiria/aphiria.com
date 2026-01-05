import { test } from "@playwright/test";
import { GrafanaHomePage } from "../pages/GrafanaHomePage";

test("Grafana accessibility", async ({ page }) => {
    const grafanaPage = new GrafanaHomePage(page);
    await grafanaPage.goto();
});
