import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';

interface Category {
  title: string;
  nav: Array<{ name: string; url: string }>;
}

const categories = JSON.parse(
  readFileSync(resolve(process.cwd(), 'out/data/db.json'), 'utf8')
) as Category[];

// The busiest category exercises the "show remaining N" path.
const busiest = categories.reduce((best, category) =>
  category.nav.length > best.nav.length ? category : best
);

test.describe('public site search on the exported build', () => {
  test('home search filters, and Enter never navigates to a keyword path', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('#home-search');
    await expect(search).toBeVisible();

    await search.fill(busiest.title);
    await expect(page.getByRole('heading', { name: busiest.title, level: 2 }).first()).toBeVisible();

    const before = page.url();
    await search.press('Enter');
    expect(page.url()).toBe(before);
  });

  test('the modal lists every result and expands past five', async ({ page }) => {
    await page.goto('/');
    await page.locator('#home-search').click();
    await page.keyboard.press('Control+k');

    const dialog = page.getByRole('dialog', { name: '搜索' });
    await expect(dialog).toBeVisible();

    const input = page.locator('#global-search-input');
    await input.fill(busiest.title);

    const more = dialog.getByRole('button', { name: /显示剩余 \d+ 条/ });
    await expect(more).toBeVisible();
    await more.click();
    await expect(dialog.getByRole('button', { name: '收起' }).first()).toBeVisible();

    // Enter with no highlighted result keeps the results on screen.
    await input.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: new RegExp(busiest.nav[0].name || '.') }).first()).toBeVisible();

    await input.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('ArrowDown reaches the "show remaining" button and Enter expands it', async ({ page }) => {
    await page.goto('/');
    await page.locator('#home-search').click();
    await page.keyboard.press('Control+k');

    const dialog = page.getByRole('dialog', { name: '搜索' });
    const input = page.locator('#global-search-input');
    await input.fill(busiest.title);

    const more = dialog.getByRole('button', { name: /显示剩余 \d+ 条/ });
    await expect(more).toBeVisible();

    let reached = false;
    for (let step = 0; step < 60; step += 1) {
      await input.press('ArrowDown');
      if (await more.evaluate((element) => element.classList.contains('is-active'))) {
        reached = true;
        break;
      }
    }
    expect(reached, 'the more button joins the keyboard sequence').toBe(true);

    await input.press('Enter');
    await expect(dialog.getByRole('button', { name: '收起' }).first()).toBeVisible();

    await input.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Enter during IME composition does not run the search', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('#home-search');
    await search.fill(busiest.title);

    const before = page.url();
    await search.evaluate((element) => {
      element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })
      );
    });
    expect(page.url()).toBe(before);
    await expect(search).toBeVisible();
  });
});

test('the close button returns focus to the search input', async ({ page }) => {
  await page.goto('/');
  await page.locator('#home-search').click();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: '搜索' })).toBeVisible();
  await page.getByRole('button', { name: '关闭搜索' }).click();
  await expect(page.locator('#home-search')).toBeFocused();
});
