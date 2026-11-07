import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import {
  CONFIG_PATH,
  DB_PATH,
  createMockGithubState,
  deferred,
  installGithubMock,
  signIn,
  type MockGithubState,
} from './githubMock';

const dirtyStatus = '已保存到本机，尚未推送';
const dirtyLocator = (page: Page) => page.getByText(dirtyStatus, { exact: true }).first();
const pushedStatus = 'GitHub 已更新；首页需等待部署后才会显示新数据';

const adminHeading = (page: Page) => page.getByRole('heading', { name: '网站管理控制台' });

async function openAdmin(page: Page): Promise<void> {
  await page.goto('/system/web');
  await expect(adminHeading(page)).toBeVisible({ timeout: 20_000 });
}

/** Edits the site card at `index` and waits for the save flash to clear. */
async function editSite(page: Page, index: number, name: string): Promise<void> {
  await page.locator('[aria-label^="编辑 "]').nth(index).click();
  const nameInput = page.locator('input[name="name"]');
  await expect(nameInput).toBeVisible();
  await nameInput.fill(name);
  await page.getByRole('button', { name: '保存更改' }).click();
  await expect(nameInput).toBeHidden();
  await expect(page.getByText('网站已保存到本机，尚未推送')).toBeHidden({ timeout: 8_000 });
}

async function pushNav(page: Page): Promise<void> {
  await page.getByRole('button', { name: /保存并推送/ }).click();
  await expect(page.getByText(pushedStatus, { exact: true })).toBeVisible();
  await expect(page.getByText(pushedStatus, { exact: true })).toBeHidden({ timeout: 8_000 });
}

const siteNameAt = (state: MockGithubState, index: number): string => {
  const categories = state.read<Array<{ nav: Array<{ name: string }> }>>(DB_PATH);
  for (const category of categories) {
    if (category.nav.length > index) return category.nav[index].name;
  }
  return '';
};

const firstName = (state: MockGithubState): string => siteNameAt(state, 0);

test.describe('admin sync against the exported static build', () => {
  test('A02: a local draft survives a reload and the remote is not overwritten', async ({
    page,
  }) => {
    const state = createMockGithubState();
    await signIn(page);
    await installGithubMock(page, state);
    await openAdmin(page);

    const remoteBefore = JSON.stringify(state.read(DB_PATH));
    await editSite(page, 0, '草稿恢复-中文站点');
    await expect(dirtyLocator(page)).toBeVisible();

    await page.reload();
    await expect(adminHeading(page)).toBeVisible();
    await expect(page.getByText('草稿恢复-中文站点').first()).toBeVisible();
    await expect(dirtyLocator(page)).toBeVisible();
    // Remote was never written while the draft was local.
    expect(JSON.stringify(state.read(DB_PATH))).toBe(remoteBefore);
  });

  test('A03: a second device conflicts instead of silently overwriting', async ({ browser }) => {
    const state = createMockGithubState();
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    await signIn(pageA);
    await signIn(pageB);
    await installGithubMock(pageA, state);
    await installGithubMock(pageB, state);

    await openAdmin(pageA);
    await openAdmin(pageB);

    await editSite(pageA, 0, '来自 A 设备');
    await pushNav(pageA);
    expect(firstName(state)).toBe('来自 A 设备');

    await editSite(pageB, 0, '来自 B 设备');
    await pageB.getByRole('button', { name: '检查更新' }).click();

    await expect(pageB.getByText('检测到远程冲突，已停止自动覆盖')).toBeVisible();
    await expect(pageB.getByText('来自 B 设备').first()).toBeVisible();
    await expect(pageB.getByRole('button', { name: /保存并推送/ })).toBeDisabled();
    expect(firstName(state)).toBe('来自 A 设备');

    await contextA.close();
    await contextB.close();
  });

  test('A04: overwriting after review conflicts again when the remote moved', async ({
    page,
  }) => {
    const state = createMockGithubState();
    await signIn(page);
    await installGithubMock(page, state);
    await openAdmin(page);

    await editSite(page, 0, '本机待覆盖');
    await expect(dirtyLocator(page)).toBeVisible();

    // Another device commits, then commits again after the conflict is shown.
    const firstRemote = structuredClone(state.read<unknown[]>(DB_PATH));
    state.update(DB_PATH, firstRemote);
    await page.getByRole('button', { name: '检查更新' }).click();
    await expect(page.getByText('检测到远程冲突，已停止自动覆盖')).toBeVisible();

    const secondRemote = structuredClone(state.read<unknown[]>(DB_PATH));
    state.update(DB_PATH, secondRemote);

    await page.getByRole('button', { name: '用本机版本覆盖' }).click();
    await page.getByRole('button', { name: '确认覆盖' }).click();

    await expect(page.getByText('检测到远程冲突，已停止自动覆盖')).toBeVisible();
    expect(JSON.stringify(state.read(DB_PATH))).toBe(JSON.stringify(secondRemote));
    expect(firstName(state)).not.toBe('本机待覆盖');
  });

  test('A05: edits made during a push stay dirty against the new baseline', async ({ page }) => {
    const state = createMockGithubState();
    const gate = deferred();
    const putStarted = deferred();
    state.putGate = gate.promise;
    state.onPutStart = () => putStarted.resolve();

    await signIn(page);
    await installGithubMock(page, state);
    await openAdmin(page);

    await editSite(page, 0, '推送前修改');
    await page.getByRole('button', { name: /保存并推送/ }).click();
    await putStarted.promise;

    await editSite(page, 1, '推送期间的新修改');
    await expect(page.getByText('推送中…').first()).toBeVisible();

    gate.resolve();
    await expect(page.getByText(pushedStatus, { exact: true })).toBeVisible();
    await expect(page.getByText(pushedStatus, { exact: true })).toBeHidden({ timeout: 8_000 });

    // The submitted content landed; the newer edit did not.
    expect(siteNameAt(state, 0)).toBe('推送前修改');
    expect(siteNameAt(state, 1)).not.toBe('推送期间的新修改');
    expect(state.putCount).toBe(1);
    await expect(dirtyLocator(page)).toBeVisible();

    // The edit made mid-push is still a persisted draft against the new baseline.
    await page.reload();
    await expect(adminHeading(page)).toBeVisible();
    await expect(page.getByText('推送期间的新修改').first()).toBeVisible();
    await expect(dirtyLocator(page)).toBeVisible();
    expect(siteNameAt(state, 1)).not.toBe('推送期间的新修改');
  });

  test('A08: one file succeeding and one failing is reported per file', async ({ page }) => {
    const state = createMockGithubState();
    await signIn(page);
    await installGithubMock(page, state);
    await openAdmin(page);

    await editSite(page, 0, '部分成功-网站');
    await expect(dirtyLocator(page)).toBeVisible();

    await page.getByRole('link', { name: '系统设置' }).click();
    await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible();
    await page.locator('#siteName').fill('部分成功-配置');
    await expect(page.getByText('● 已保存到本机，尚未推送')).toBeVisible();

    state.putFailure = { path: CONFIG_PATH, status: 500, message: 'temporary server error' };
    await page.getByRole('button', { name: '返回主页' }).click();
    await expect(page.getByRole('dialog', { name: '未推送的改动' })).toBeVisible();
    await page.getByRole('button', { name: '保存并离开' }).click();

    await expect(page.getByText(/未完全成功：站点配置/)).toBeVisible();
    await expect(page).toHaveURL(/\/system\/setting$/);
    expect(firstName(state)).toBe('部分成功-网站');
    const config = state.read<{ site: { name: string } }>(CONFIG_PATH);
    expect(config.site.name).not.toBe('部分成功-配置');

    // Retrying only the failed file completes the leave.
    state.putFailure = null;
    await page.getByRole('button', { name: '保存并离开' }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    expect(state.read<{ site: { name: string } }>(CONFIG_PATH).site.name).toBe('部分成功-配置');
    expect(state.putCount).toBe(3);
  });
});

test.describe('mobile admin layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('A17 the drawer is the only navigation and nothing overflows sideways', async ({ page }) => {
    const state = createMockGithubState();
    await signIn(page);
    await installGithubMock(page, state);
    await openAdmin(page);

    const menuButton = page.getByRole('button', { name: '菜单' });
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    const closedBox = await page.locator('#admin-sidebar').boundingBox();
    expect(closedBox?.x ?? 0).toBeLessThan(0);

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect
      .poll(async () => (await page.locator('#admin-sidebar').boundingBox())?.x)
      .toBe(0);

    await page.getByRole('link', { name: '系统设置' }).click();
    await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test('A10 exporting drafts downloads JSON without credentials', async ({ page }) => {
  const state = createMockGithubState();
  await signIn(page);
  await installGithubMock(page, state);
  await openAdmin(page);

  await editSite(page, 0, '草稿导出-中文');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出草稿' }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  const text = readFileSync(filePath as string, 'utf8');

  expect(text).toContain('草稿导出-中文');
  expect(text).not.toContain('test-token');
  expect(text).not.toContain('auth:token');
});

test('A02b a draft from an earlier browser session is offered for recovery', async ({ page }) => {
  const state = createMockGithubState();
  await signIn(page);
  await installGithubMock(page, state);
  await openAdmin(page);

  await editSite(page, 0, '重启会话草稿');
  await expect(dirtyLocator(page)).toBeVisible();

  // A new browser session loses the tab draft id but keeps the persisted draft.
  await page.evaluate(() => {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.includes('tabDraftId')) window.sessionStorage.removeItem(key);
    }
  });
  await page.reload();
  await expect(adminHeading(page)).toBeVisible();

  await expect(page.getByText(/发现未恢复的本机草稿/)).toBeVisible();
  await page.getByRole('button', { name: /恢复网站数据/ }).first().click();
  await expect(page.getByText('重启会话草稿').first()).toBeVisible();
  await expect(dirtyLocator(page)).toBeVisible();
  expect(firstName(state)).not.toBe('重启会话草稿');
});

test('A12 the search detail follows edits immediately', async ({ page }) => {
  const state = createMockGithubState();
  await signIn(page);
  await installGithubMock(page, state);
  await openAdmin(page);

  const categories = state.read<Array<{ title: string; nav: Array<{ name: string }> }>>(DB_PATH);
  const category = categories.find((item) => item.nav.length > 0);
  if (!category) throw new Error('db.json has no categories');

  await page.getByPlaceholder('搜索网站名称、描述或 URL...').fill(category.title);
  await page.getByRole('heading', { name: category.title, level: 3 }).first().click();
  await expect(page.getByText(`分类: ${category.title}`)).toBeVisible();

  await page.locator('[aria-label^="编辑 "]').first().click();
  await page.locator('input[name="name"]').fill('详情视图已更新');
  await page.getByRole('button', { name: '保存更改' }).click();
  await expect(page.getByText('网站已保存到本机，尚未推送')).toBeHidden({ timeout: 8_000 });

  await expect(page.getByText('详情视图已更新').first()).toBeVisible();
  await expect(page.getByText(`分类: ${category.title}`)).toBeVisible();
  expect(state.putCount).toBe(0);
});
