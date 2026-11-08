import { decodeBase64Utf8, encodeBase64Utf8 } from '@/lib/codec';

export interface MockFile {
  sha: string;
  data: unknown;
}

export interface MockGithubServer {
  files: Record<string, MockFile>;
  /** Static assets served by the deployed site, keyed by pathname. */
  publicFiles: Record<string, unknown>;
  putCount: number;
  getCount: number;
  shaCounter: number;
  /** Resolved when the next PUT is allowed to complete. */
  putGate: Promise<void> | null;
  getGate: Promise<void> | null;
  /** Simulates a connection drop after the server already committed the write. */
  networkErrorAfterPut: boolean;
  /** Simulates a connection drop before the write is applied. */
  networkErrorBeforeWrite: boolean;
  /** Runs after the request body is read, before the SHA comparison. */
  beforePut: ((path: string) => void) | null;
  lastPutBody: { sha?: string; content?: string; message?: string; branch?: string } | null;
  /** Called as soon as a PUT request is received, before the gate releases it. */
  onPutStart: (() => void) | null;
  onGetStart: (() => void) | null;
}

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

export const createMockGithubServer = (
  files: Record<string, MockFile>,
  publicFiles: Record<string, unknown> = {}
): MockGithubServer => ({
  files,
  publicFiles,
  putCount: 0,
  getCount: 0,
  shaCounter: 100,
  putGate: null,
  getGate: null,
  networkErrorAfterPut: false,
  networkErrorBeforeWrite: false,
  beforePut: null,
  lastPutBody: null,
  onPutStart: null,
  onGetStart: null,
});

export const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

export function installFetchMock(server: MockGithubServer): () => void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === 'string' ? input : input.toString();
    const url = new URL(rawUrl, 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.endsWith('/user')) {
      return jsonResponse(200, {
        login: 'mmungdong',
        id: 1,
        name: 'Owner',
        email: null,
        avatar_url: '',
      });
    }

    // Deployed static assets (home page / config revalidation).
    if (pathname in server.publicFiles) {
      return jsonResponse(200, server.publicFiles[pathname]);
    }

    const contents = pathname.match(/\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
    if (!contents) return jsonResponse(404, { message: 'Not Found' });

    const filePath = contents[1];
    const file = server.files[filePath];
    if (!file) return jsonResponse(404, { message: 'Not Found' });

    if (method === 'GET') {
      server.getCount += 1;
      server.onGetStart?.();
      if (server.getGate) await server.getGate;
      return jsonResponse(200, {
        sha: file.sha,
        content: encodeBase64Utf8(JSON.stringify(file.data)),
        encoding: 'base64',
      });
    }

    if (method === 'PUT') {
      server.putCount += 1;
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        sha?: string;
        content?: string;
        message?: string;
        branch?: string;
      };
      server.lastPutBody = body;

      server.onPutStart?.();
      if (server.putGate) await server.putGate;
      server.beforePut?.(filePath);

      if (server.networkErrorBeforeWrite) {
        server.networkErrorBeforeWrite = false;
        throw new TypeError('fetch failed');
      }

      const current = server.files[filePath];
      if (body.sha !== current.sha) {
        return jsonResponse(409, {
          message: `sha ${body.sha} does not match the latest commit ${current.sha}`,
        });
      }
      if (typeof body.content !== 'string') {
        return jsonResponse(422, { message: 'content is required' });
      }

      const nextSha = `sha-${++server.shaCounter}`;
      server.files[filePath] = {
        sha: nextSha,
        data: JSON.parse(decodeBase64Utf8(body.content)),
      };

      if (server.networkErrorAfterPut) {
        server.networkErrorAfterPut = false;
        throw new TypeError('fetch failed');
      }

      return jsonResponse(201, {
        content: { sha: nextSha },
        commit: { sha: `commit-${server.shaCounter}` },
      });
    }

    return jsonResponse(405, { message: 'Method Not Allowed' });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

export class MemoryStorage {
  private data = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      const error = new Error('quota exceeded');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  keys(): string[] {
    return Array.from(this.data.keys());
  }
}

export function installMemoryStorage(): {
  local: MemoryStorage;
  session: MemoryStorage;
} {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = local;
  (globalThis as unknown as { sessionStorage: MemoryStorage }).sessionStorage = session;
  return { local, session };
}
