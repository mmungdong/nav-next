import { owner as configOwner, repo as configRepo, branch as configBranch, dbPath } from './config';
import { decodeBase64Utf8, encodeBase64Utf8 } from './codec';
import { SyncErrorCode } from './syncTypes';

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_TIMEOUT_MS = 20_000;

export class GithubApiError extends Error {
  code: SyncErrorCode;
  httpStatus?: number;
  details?: unknown;

  constructor(code: SyncErrorCode, message: string, httpStatus?: number, details?: unknown) {
    super(message);
    this.name = 'GithubApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GitHubFile {
  sha: string;
  content: string;
}

const authHeaders = (token: string): Record<string, string> => ({
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'nav-next-app',
});

const contentsUrl = (owner: string, repo: string, path: string): string => {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/contents/${encodedPath}`;
};

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { message?: unknown };
    return typeof data.message === 'string' ? data.message : '';
  } catch {
    return '';
  }
};

const classifyStatus = (status: number, message: string): SyncErrorCode => {
  if (status === 401) return 'unauthorized';
  if (status === 403) {
    return /rate limit|secondary rate/i.test(message) ? 'rate_limited' : 'forbidden';
  }
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  if (status === 422) {
    // "sha ... does not match" is a concurrent edit; branch protection is a
    // permission problem; anything else is a rejected payload.
    if (/sha.*(does not match|doesn't match|but expected)|not the latest/i.test(message)) {
      return 'conflict';
    }
    if (/protected branch/i.test(message)) return 'forbidden';
    return 'invalid_data';
  }
  if (status >= 500) return 'unknown_error';
  return 'unknown_error';
};

const errorFromResponse = async (
  response: Response,
  action: string
): Promise<GithubApiError> => {
  const detail = await readErrorMessage(response);
  const code = classifyStatus(response.status, detail);
  const message = detail ? `${action}失败：${detail}` : `${action}失败 (HTTP ${response.status})`;
  return new GithubApiError(code, message, response.status);
};

async function request(
  url: string,
  init: RequestInit,
  action: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === 'AbortError') {
      throw new GithubApiError('timeout', `${action}超时（${timeoutMs / 1000}s）`);
    }
    throw new GithubApiError(
      'network_error',
      `${action}网络错误：${(error as Error)?.message ?? '连接失败'}`
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Browser-safe UTF-8 base64 decoding of the contents API payload. */
export function decodeContent(base64: string): string {
  return decodeBase64Utf8(base64);
}

export async function verifyGithubToken(
  token: string,
  options: {
    owner?: string;
    repo?: string;
    branch?: string;
    path?: string;
  } = {}
): Promise<{ valid: boolean; user?: GitHubUser; message?: string; code?: SyncErrorCode }> {
  const expectedOwner = options.owner ?? configOwner;
  const targetRepo = options.repo ?? configRepo;
  const targetBranch = options.branch ?? configBranch;
  const targetPath = options.path ?? dbPath;

  let userResponse: Response;
  try {
    userResponse = await request(
      `${GITHUB_API_BASE}/user`,
      { headers: authHeaders(token) },
      '读取 GitHub 身份'
    );
  } catch (error) {
    return {
      valid: false,
      message: (error as Error).message,
      code: (error as GithubApiError).code,
    };
  }

  if (!userResponse.ok) {
    const detail = await readErrorMessage(userResponse);
    if (userResponse.status === 401) {
      return { valid: false, message: 'Token 无效或已过期', code: 'unauthorized' };
    }
    if (userResponse.status === 403) {
      return {
        valid: false,
        message: 'Token 被拒绝或触发限流，请稍后重试',
        code: classifyStatus(403, detail),
      };
    }
    return {
      valid: false,
      message: detail || `验证失败 (HTTP ${userResponse.status})`,
      code: classifyStatus(userResponse.status, detail),
    };
  }

  const user = (await userResponse.json()) as GitHubUser;
  // Public repositories are readable by any account; only the configured owner
  // is treated as the site owner.
  if (user.login.toLowerCase() !== expectedOwner.toLowerCase()) {
    return {
      valid: false,
      code: 'forbidden',
      message: `当前账号 ${user.login} 不是配置的仓库所有者 ${expectedOwner}`,
    };
  }

  // Reading the actual target file proves repository/branch/file access, not
  // just a valid token. It says nothing about write permission.
  try {
    await getFileContent(token, expectedOwner, targetRepo, targetPath, targetBranch);
  } catch (error) {
    const apiError = error as GithubApiError;
    if (apiError.code === 'not_found') {
      return {
        valid: false,
        code: 'not_found',
        message: `账号匹配，但无法读取 ${targetBranch}:${targetPath}，请检查仓库/分支/文件配置`,
      };
    }
    return { valid: false, code: apiError.code, message: apiError.message };
  }

  return { valid: true, user };
}

export async function getUserInfo(token: string): Promise<GitHubUser> {
  const response = await request(
    `${GITHUB_API_BASE}/user`,
    { headers: authHeaders(token) },
    '获取用户信息'
  );
  if (!response.ok) throw await errorFromResponse(response, '获取用户信息');
  return (await response.json()) as GitHubUser;
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<GitHubFile> {
  const response = await request(
    `${contentsUrl(owner, repo, path)}?ref=${encodeURIComponent(branch)}`,
    { headers: authHeaders(token) },
    '读取远程文件'
  );
  if (!response.ok) throw await errorFromResponse(response, '读取远程文件');

  const data = (await response.json()) as {
    sha?: unknown;
    content?: unknown;
    encoding?: unknown;
  };
  if (typeof data.sha !== 'string' || typeof data.content !== 'string') {
    throw new GithubApiError('invalid_data', 'GitHub 返回的文件格式不正确');
  }
  // Large-file responses omit content; an empty payload must never be treated
  // as an empty document.
  return { sha: data.sha, content: decodeBase64Utf8(data.content) };
}

export async function updateFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
): Promise<{ sha: string; commitSha?: string }> {
  if (!sha) {
    throw new GithubApiError(
      'invalid_data',
      '缺少远程基线 SHA，拒绝创建或覆盖文件'
    );
  }

  const response = await request(
    contentsUrl(owner, repo, path),
    {
      method: 'PUT',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: encodeBase64Utf8(content),
        branch,
        sha,
      }),
    },
    '写入远程文件'
  );
  if (!response.ok) throw await errorFromResponse(response, '写入远程文件');

  const data = (await response.json()) as {
    content?: { sha?: unknown };
    commit?: { sha?: unknown };
  };
  const newSha = data.content?.sha;
  if (typeof newSha !== 'string') {
    throw new GithubApiError('invalid_data', 'GitHub 未返回新文件 SHA');
  }
  return {
    sha: newSha,
    commitSha: typeof data.commit?.sha === 'string' ? data.commit.sha : undefined,
  };
}

export async function getRepoInfo(token: string, owner: string, repo: string) {
  const response = await request(
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: authHeaders(token) },
    '获取仓库信息'
  );
  if (!response.ok) throw await errorFromResponse(response, '获取仓库信息');
  return response.json();
}
