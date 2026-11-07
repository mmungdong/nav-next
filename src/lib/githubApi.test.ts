import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeContent,
  getFileContent,
  GithubApiError,
  updateFileContent,
} from '@/lib/githubApi';
import { encodeBase64Utf8 } from '@/lib/codec';

const originalFetch = globalThis.fetch;
let lastRequest: { url: string; init?: RequestInit } | null = null;

const mockResponse = (
  status: number,
  body: unknown,
  handler?: (url: string, init?: RequestInit) => void
) => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    lastRequest = { url: String(input), init };
    handler?.(String(input), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as unknown as Response;
  }) as typeof fetch;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  lastRequest = null;
});

test('Chinese content round-trips through the contents API', async () => {
  const Chinese = JSON.stringify([{ id: 1, title: '中文分类', nav: [] }]);
  mockResponse(200, { sha: 'sha-1', content: encodeBase64Utf8(Chinese) });

  const file = await getFileContent('token', 'owner', 'repo', 'public/data/db.json', 'main');
  assert.equal(file.content, Chinese);
  assert.equal(decodeContent(encodeBase64Utf8('中文')), '中文');
});

test('writing Chinese content encodes UTF-8 bytes, not latin1', async () => {
  mockResponse(201, { content: { sha: 'sha-2' } }, (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { content: string; sha?: string };
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(body.content), (char) => char.charCodeAt(0))
    );
    assert.equal(decoded, '{"title":"中文"}');
    assert.equal(body.sha, 'sha-1');
  });

  const result = await updateFileContent(
    'token',
    'owner',
    'repo',
    'public/data/db.json',
    '{"title":"中文"}',
    'message',
    'main',
    'sha-1'
  );
  assert.equal(result.sha, 'sha-2');
});

test('writing without a baseline SHA is refused before any request', async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error('should not run');
  }) as typeof fetch;

  await assert.rejects(
    () =>
      updateFileContent(
        'token',
        'owner',
        'repo',
        'public/data/db.json',
        '{}',
        'message',
        'main'
      ),
    (error: unknown) =>
      error instanceof GithubApiError && error.code === 'invalid_data'
  );
  assert.equal(called, false);
});

test('paths and branch names are URL-encoded', async () => {
  mockResponse(200, { sha: 's', content: encodeBase64Utf8('[]') });
  await getFileContent('token', 'own er', 're po', 'data/中文 file.json', 'feature/#1');

  assert.ok(lastRequest);
  assert.ok(lastRequest?.url.includes('own%20er'));
  assert.ok(lastRequest?.url.includes('re%20po'));
  assert.ok(lastRequest?.url.includes('data/%E4%B8%AD%E6%96%87%20file.json'));
  assert.ok(lastRequest?.url.includes('ref=feature%2F%231'));
  // Authorization is present on the request but never logged by the client.
  const headers = lastRequest?.init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'token token');
});

const statusCases: Array<{
  status: number;
  body: unknown;
  expected: string;
}> = [
  { status: 401, body: { message: 'Bad credentials' }, expected: 'unauthorized' },
  { status: 403, body: { message: 'API rate limit exceeded' }, expected: 'rate_limited' },
  { status: 403, body: { message: 'Resource not accessible by integration' }, expected: 'forbidden' },
  { status: 404, body: { message: 'Not Found' }, expected: 'not_found' },
  { status: 409, body: { message: 'Conflict' }, expected: 'conflict' },
  {
    status: 422,
    body: { message: 'sha abc does not match the latest commit def' },
    expected: 'conflict',
  },
  {
    status: 422,
    body: { message: 'protected branch hook declined' },
    expected: 'forbidden',
  },
  { status: 429, body: { message: 'Too Many Requests' }, expected: 'rate_limited' },
];

for (const scenario of statusCases) {
  test(`HTTP ${scenario.status} ${scenario.expected} is mapped from the response facts`, async () => {
    mockResponse(scenario.status, scenario.body);
    await assert.rejects(
      () => getFileContent('token', 'owner', 'repo', 'path.json', 'main'),
      (error: unknown) => {
        assert.ok(error instanceof GithubApiError);
        assert.equal(error.code, scenario.expected);
        assert.equal(error.httpStatus, scenario.status);
        return true;
      }
    );
  });
}

test('a network rejection is reported as network_error, not an empty file', async () => {
  globalThis.fetch = (async () => {
    throw new TypeError('fetch failed');
  }) as typeof fetch;

  await assert.rejects(
    () => getFileContent('token', 'owner', 'repo', 'path.json', 'main'),
    (error: unknown) => error instanceof GithubApiError && error.code === 'network_error'
  );
});
