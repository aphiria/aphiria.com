import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test('search results are invisible by default and when the query is deleted', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();

  await expect(homePage.search.searchResults).not.toBeVisible();

  await homePage.search.query('rout');
  await expect(homePage.search.searchResults).toBeVisible();

  await homePage.search.clear();
  await expect(homePage.search.searchResults).not.toBeVisible();
});

test('search displays results', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();

  await homePage.search.query('rout');

  const results = homePage.search.getResults();
  await expect(results).not.toHaveCount(0);

  const firstResult = results.first().locator('a');
  await expect(firstResult).toBeVisible();
});

test('can use arrow keys to select search results', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();

  await homePage.search.query('rout');

  await page.keyboard.press('ArrowDown');
  let selected = page.locator('ul.search-results li.selected');
  await expect(selected).toHaveCount(1);

  const results = homePage.search.getResults();
  const count = await results.count();

  for (let i = 1; i < count; i++) {
    await page.keyboard.press('ArrowDown');
  }

  await page.keyboard.press('ArrowDown');
  selected = results.first().locator('.selected');
  await expect(selected).toHaveCount(1);

  await page.keyboard.press('ArrowUp');
  selected = results.last().locator('.selected');
  await expect(selected).toHaveCount(1);
});

test('search enter key navigation', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();

  await homePage.search.query('rout');

  await page.keyboard.press('ArrowDown');

  const selectedLink = homePage.search.getSelectedResult();
  const href = await selectedLink.getAttribute('href');

  await page.keyboard.press('Enter');

  await page.waitForLoadState('domcontentloaded');

  const currentUrl = page.url();
  expect(currentUrl).toContain(href || '');
});

test('search no results message', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();

  await homePage.search.query('abcdefg123');

  const noResults = homePage.search.getNoResults();
  await expect(noResults).toHaveCount(1);
  await expect(noResults).toContainText('no results for "abcdefg123"');
});

test('clicking outside search results hides them', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();

  await homePage.search.query('rout');

  await expect(homePage.search.searchResults).toBeVisible();

  await page.click('body');

  await expect(homePage.search.searchResults).not.toBeVisible();
});
