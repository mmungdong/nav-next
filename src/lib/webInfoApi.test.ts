import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getWebInfo } from '@/lib/webInfoApi';

const originalFetch = globalThis.fetch;
let lastInit: RequestInit | undefined;

const jsonFetch = (status: number, body: unknown) => {
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    lastInit = init;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as unknown as Response;
  }) as typeof fetch;
};

const hangingFetch = () => {
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('Aborted', 'AbortError'))
      );
    })) as typeof fetch;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  lastInit = undefined;
});

test('a successful lookup returns the service metadata', async () => {
  jsonFetch(200, {
    title: '示例站点',
    description: '示例描述',
    url: 'https://cdn.example.com/icon.png',
  });

  const lookup = await getWebInfo('https://example.com/page');

  assert.equal(lookup.error, null);
  assert.equal(lookup.info.title, '示例站点');
  assert.equal(lookup.info.description, '示例描述');
  assert.equal(lookup.info.url, 'https://cdn.example.com/icon.png');
  assert.ok(lastInit?.signal, 'the request carries an abort signal');
});

test('a rejected service call falls back to the domain and says why', async () => {
  jsonFetch(503, {});

  const lookup = await getWebInfo('https://www.example.com/page');

  assert.equal(lookup.info.title, 'example.com');
  assert.equal(lookup.info.url, 'https://www.google.com/s2/favicons?domain=www.example.com');
  assert.match(lookup.error ?? '', /HTTP 503/);
});

test('a network failure is reported instead of being swallowed', async () => {
  globalThis.fetch = (async () => {
    throw new TypeError('fetch failed');
  }) as typeof fetch;

  const lookup = await getWebInfo('https://example.com');

  assert.equal(lookup.info.title, 'example.com');
  assert.match(lookup.error ?? '', /自动识别失败/);
});

test('an empty service response is reported as no usable info', async () => {
  jsonFetch(200, {});

  const lookup = await getWebInfo('https://example.com');

  assert.equal(lookup.info.title, 'example.com');
  assert.match(lookup.error ?? '', /未返回可用信息/);
});

test('a hanging service times out and still fills the fallback', async () => {
  hangingFetch();

  const lookup = await getWebInfo('https://example.com', { timeoutMs: 20 });

  assert.match(lookup.error ?? '', /超时/);
  assert.equal(lookup.info.title, 'example.com');
});

test('a caller abort rejects and never reports a result', async () => {
  hangingFetch();
  const controller = new AbortController();

  const pending = getWebInfo('https://example.com', { signal: controller.signal });
  controller.abort();

  await assert.rejects(pending);
});
