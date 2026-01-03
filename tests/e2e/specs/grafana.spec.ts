import { test } from '@playwright/test';
import { assertPageOk } from '../lib/navigation';

test('Grafana accessibility', async ({ page }) => {
  await assertPageOk(page, process.env.GRAFANA_BASE_URL!);
});
