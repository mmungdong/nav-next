// GitHub API stand-in for the exported static build. All browser contexts in a
// spec share one `MockGithubState`, so two contexts behave like two devices
// writing to the same repository.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

export const OWNER = 'mmungdong';
export const DB_PATH = 'public/data/db.json';
export const CONFIG_PATH = 'public/data/site-config.json';
export const TOKEN_KEY = 'navnext:auth:token';
export const TEST_TOKEN = 'test-token';

interface MockFile {
  sha: string;
  data: unknown;
}

export interface MockGithubState {
  files: Record<string, MockFile>;
  putCount: number;
  getCount: number;
  /** Blocks the next PUT until resolved; used to edit while a push is in flight. */
  putGate: Promise<void> | null;
  /** Resolves as soon as a PUT request arrives, before the gate is released. */
  onPutStart: (() => void) | null;
  /** Fails PUTs for one path so partial success can be exercised. */
  putFailure: { path: string; status: number; message: string } | null;
  /** Simulates another device writing to the repository. */
  update(path: string, data: unknown): void;
  read<T>(path: string): T;
}

const readOutJson = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'out', path), 'utf8'));

const base64 = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64');

let shaCounter = 0;

export function createMockGithubState(): MockGithubState {
  const files: Record<string, MockFile> = {
    [DB_PATH]: { sha: 'sha-initial-db', data: readOutJson('data/db.json') },
    [CONFIG_PATH]: {
      sha: 'sha-initial-config',
      data: readOutJson('data/site-config.json'),
    },
  };

  return {
    files,
    putCount: 0,
    getCount: 0,
    putGate: null,
    onPutStart: null,
    putFailure: null,
    read<T>(path: string): T {
      return files[path].data as T;
    },
    update(path: string, data: unknown): void {
      files[path] = { sha: `sha-remote-${++shaCounter}`, data };
    },
  };
}

export async function installGithubMock(
  page: Page,
  state: MockGithubState
): Promise<MockGithubState> {
  await page.route('https://api.github.com/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/user') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          login: OWNER,
          id: 1,
          name: 'Owner',
          email: null,
          avatar_url: '',
        }),
      });
    }

    const match = url.pathname.match(/^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
    const filePath = match ? decodeURIComponent(match[1]) : '';
    const file = state.files[filePath];
    if (!file) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not Found' }),
      });
    }

    if (request.method() === 'GET') {
      state.getCount += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: filePath.split('/').pop(),
          path: filePath,
          sha: file.sha,
          content: base64(file.data),
          encoding: 'base64',
        }),
      });
    }

    if (request.method() === 'PUT') {
      state.putCount += 1;
      state.onPutStart?.();
      if (state.putGate) await state.putGate;
      if (state.putFailure && state.putFailure.path === filePath) {
        return route.fulfill({
          status: state.putFailure.status,
          contentType: 'application/json',
          body: JSON.stringify({ message: state.putFailure.message }),
        });
      }
      const body = request.postDataJSON() as { sha?: string; content?: string };
      if (body.sha !== file.sha) {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            message: `sha ${body.sha} does not match the latest commit ${file.sha}`,
          }),
        });
      }
      const nextSha = `sha-pushed-${++shaCounter}`;
      state.files[filePath] = {
        sha: nextSha,
        data: JSON.parse(Buffer.from(String(body.content), 'base64').toString('utf8')),
      };
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          content: { sha: nextSha },
          commit: { sha: `commit-${shaCounter}` },
        }),
      });
    }

    return route.fulfill({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    });
  });

  return state;
}

/** Injects a tab-scoped token so the real auth check still runs through the mock. */
export async function signIn(page: Page, token = TEST_TOKEN): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.sessionStorage.setItem(key, value);
    },
    [TOKEN_KEY, token]
  );
}

export function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
