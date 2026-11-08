import { test, expect, type Page } from '@playwright/test';
import { createMockGithubState, installGithubMock, signIn } from './githubMock';

const adminHeading = (page: Page) => page.getByRole('heading', { name: '网站管理控制台' });

async function openAdmin(page: Page): Promise<void> {
  await signIn(page);
  await installGithubMock(page, createMockGithubState());
  await page.goto('/system/web');
  await expect(adminHeading(page)).toBeVisible({ timeout: 20_000 });
}

const bodyOverflow = (page: Page) => page.evaluate(() => document.body.style.overflow);

test('T8 a delete confirmation traps focus, closes on Escape and restores focus', async ({ page }) => {
  await openAdmin(page);

  const deleteButton = page.locator('[aria-label^="删除 "]').first();
  await deleteButton.click();

  const dialog = page.getByRole('dialog', { name: '确认删除' });
  await expect(dialog).toBeVisible();

  // Destructive prompts start on the safe choice.
  const cancel = dialog.getByRole('button', { name: '取消' });
  await expect(cancel).toBeFocused();
  await expect.poll(() => bodyOverflow(page)).toBe('hidden');

  // Tab stays inside the dialog and wraps around.
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '删除' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '关闭' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.poll(() => bodyOverflow(page)).toBe('');
  await expect(deleteButton).toBeFocused();
});

test('T8 the edit dialog focuses the URL field and restores focus on Escape', async ({ page }) => {
  await openAdmin(page);

  const editButton = page.locator('[aria-label^="编辑 "]').first();
  await editButton.click();

  const dialog = page.getByRole('dialog', { name: '编辑网站' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('input[name="url"]')).toBeFocused();
  await expect.poll(() => bodyOverflow(page)).toBe('hidden');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.poll(() => bodyOverflow(page)).toBe('');
  await expect(editButton).toBeFocused();
});

test('T8 a sort dialog closes on Escape and never leaves focus on the page behind', async ({
  page,
}) => {
  await openAdmin(page);

  const sortButton = page.getByTitle('排序').first();
  await sortButton.click();

  const dialog = page.getByRole('dialog', { name: /网站排序/ });
  await expect(dialog).toBeVisible();
  await expect.poll(() => bodyOverflow(page)).toBe('hidden');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(sortButton).toBeFocused();
});

test('T8 the mobile drawer closes on Escape and returns focus to the menu button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await openAdmin(page);

  const menuButton = page.getByRole('button', { name: '菜单' });
  await menuButton.click();

  const drawer = page.getByRole('dialog', { name: '后台导航' });
  await expect(drawer).toBeVisible();
  await expect(page.locator('#admin-sidebar a').first()).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menuButton).toBeFocused();
});
