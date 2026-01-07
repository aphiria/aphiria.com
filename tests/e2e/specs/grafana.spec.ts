import { test, expect } from "../fixtures/pages";

test("Grafana redirects unauthenticated users to login", async ({ grafanaPage }) => {
    await expect(grafanaPage.page).toHaveURL(/\/login/);
});
