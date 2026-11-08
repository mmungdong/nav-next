import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { useAuthStore } from '@/stores/authStore';
import { dbPath } from '@/lib/config';
import {
  createMockGithubServer,
  installFetchMock,
  installMemoryStorage,
  MemoryStorage,
} from '@/test/mocks';

let storage: { local: MemoryStorage; session: MemoryStorage };
let restoreFetch: (() => void) | null = null;

beforeEach(() => {
  storage = installMemoryStorage();
  useAuthStore.setState({
    isAuthenticated: false,
    authStatus: 'unknown',
    githubToken: null,
    githubUser: null,
    rememberDevice: false,
    authError: null,
  });
});

afterEach(() => {
  restoreFetch?.();
  restoreFetch = null;
});

const fetchWithStatus = (status: number, body: unknown) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as unknown as Response) as typeof fetch;
  restoreFetch = () => {
    globalThis.fetch = original;
  };
};

test('A14 a forged local user/role does not restore an editing session', async () => {
  storage.local.setItem('authToken', 'fake-jwt-token');
  storage.local.setItem('user', JSON.stringify({ id: 1, username: 'admin', role: 'admin' }));

  await useAuthStore.getState().checkAuth();

  const state = useAuthStore.getState();
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.authStatus, 'signed_out');
  assert.equal(storage.local.getItem('authToken'), null);
  assert.equal(storage.local.getItem('user'), null);
});

test('A legacy localStorage token is verified once and moved to sessionStorage', async () => {
  storage.local.setItem('githubToken', 'legacy-token');
  restoreFetch = installFetchMock(
    createMockGithubServer({ [dbPath]: { sha: 'sha-1', data: [] } })
  );

  await useAuthStore.getState().checkAuth();

  const state = useAuthStore.getState();
  assert.equal(state.isAuthenticated, true);
  assert.equal(state.authStatus, 'authenticated');
  assert.equal(storage.session.getItem('navnext:auth:token'), 'legacy-token');
  assert.equal(storage.local.getItem('navnext:auth:rememberedToken'), null);
  assert.equal(storage.local.getItem('githubToken'), null);
});

test('A14 an expired token clears credentials and asks for re-authorization', async () => {
  storage.session.setItem('navnext:auth:token', 'expired');
  fetchWithStatus(401, { message: 'Bad credentials' });

  await useAuthStore.getState().checkAuth();

  const state = useAuthStore.getState();
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.authStatus, 'signed_out');
  assert.ok(state.authError);
  assert.equal(storage.session.getItem('navnext:auth:token'), null);
});

test('a network failure keeps credentials and drafts usable offline', async () => {
  storage.session.setItem('navnext:auth:token', 'token');
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError('fetch failed');
  }) as typeof fetch;
  restoreFetch = () => {
    globalThis.fetch = original;
  };

  await useAuthStore.getState().checkAuth();

  const state = useAuthStore.getState();
  assert.equal(state.isAuthenticated, true);
  assert.equal(state.authStatus, 'offline');
  assert.equal(state.githubToken, 'token');
  assert.ok(state.authError?.includes('离线'));
});

test('A14 a rate-limited check keeps the token for a later retry', async () => {
  storage.session.setItem('navnext:auth:token', 'token');
  fetchWithStatus(429, { message: 'API rate limit exceeded' });

  await useAuthStore.getState().checkAuth();

  const state = useAuthStore.getState();
  assert.equal(state.authStatus, 'offline');
  assert.equal(state.isAuthenticated, true);
  assert.equal(state.githubToken, 'token');
  assert.equal(storage.session.getItem('navnext:auth:token'), 'token');
  assert.match(state.authError ?? '', /限流/);
});

test('A14 a 403 rate limit is treated as throttling, not bad credentials', async () => {
  storage.session.setItem('navnext:auth:token', 'token');
  fetchWithStatus(403, { message: 'API rate limit exceeded for 1.2.3.4' });

  await useAuthStore.getState().checkAuth();

  const state = useAuthStore.getState();
  assert.equal(state.authStatus, 'offline');
  assert.equal(storage.session.getItem('navnext:auth:token'), 'token');
  assert.match(state.authError ?? '', /限流/);
});

test('A14 a missing data file keeps the token and points at the repo config', async () => {
  storage.session.setItem('navnext:auth:token', 'token');
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/user')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ login: 'mmungdong', id: 1 }),
      } as unknown as Response;
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    } as unknown as Response;
  }) as typeof fetch;
  restoreFetch = () => {
    globalThis.fetch = original;
  };

  await useAuthStore.getState().checkAuth();

  const state = useAuthStore.getState();
  assert.equal(state.authStatus, 'offline');
  assert.equal(storage.session.getItem('navnext:auth:token'), 'token');
  assert.match(state.authError ?? '', /仓库|分支|配置/);
});

test('A14 a GitHub 5xx keeps the token instead of signing the user out', async () => {
  storage.session.setItem('navnext:auth:token', 'token');
  fetchWithStatus(500, { message: 'Server Error' });

  await useAuthStore.getState().checkAuth();

  const state = useAuthStore.getState();
  assert.equal(state.authStatus, 'offline');
  assert.equal(storage.session.getItem('navnext:auth:token'), 'token');
  assert.match(state.authError ?? '', /稍后重试|暂时无法验证/);
});

test('A14 an owner mismatch keeps the token so another account can re-authorize', async () => {
  storage.session.setItem('navnext:auth:token', 'token');
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/user')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ login: 'someone-else', id: 2 }),
      } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ sha: 's', content: btoa('[]') }),
    } as unknown as Response;
  }) as typeof fetch;
  restoreFetch = () => {
    globalThis.fetch = original;
  };

  await useAuthStore.getState().checkAuth();

  const state = useAuthStore.getState();
  assert.equal(state.authStatus, 'offline');
  assert.equal(storage.session.getItem('navnext:auth:token'), 'token');
  assert.match(state.authError ?? '', /不是配置的仓库所有者/);
});

test('remember on this device is an explicit opt-in', async () => {
  restoreFetch = installFetchMock(
    createMockGithubServer({ [dbPath]: { sha: 'sha-1', data: [] } })
  );

  const withoutRemember = await useAuthStore.getState().validateGithubToken('token-a');
  assert.equal(withoutRemember.valid, true);
  assert.equal(storage.local.getItem('navnext:auth:rememberedToken'), null);

  const withRemember = await useAuthStore
    .getState()
    .validateGithubToken('token-b', { remember: true });
  assert.equal(withRemember.valid, true);
  assert.equal(storage.local.getItem('navnext:auth:rememberedToken'), 'token-b');
  assert.equal(useAuthStore.getState().rememberDevice, true);

  useAuthStore.getState().logout();
  assert.equal(storage.local.getItem('navnext:auth:rememberedToken'), null);
  assert.equal(storage.session.getItem('navnext:auth:token'), null);
});

test('a non-owner account cannot become the site owner', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/user')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ login: 'someone-else', id: 2, avatar_url: '' }),
      } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ sha: 's', content: btoa('[]') }),
    } as unknown as Response;
  }) as typeof fetch;
  restoreFetch = () => {
    globalThis.fetch = original;
  };

  const result = await useAuthStore.getState().validateGithubToken('token');
  assert.equal(result.valid, false);
  assert.ok(result.message?.includes('不是配置的仓库所有者'));
  assert.equal(useAuthStore.getState().isAuthenticated, false);
});
