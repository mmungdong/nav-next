// Shared contract between the two stores so the GitHub sync rules cannot fork.

export type SyncErrorCode =
  | 'conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'not_found'
  | 'invalid_data'
  | 'network_error'
  | 'timeout'
  | 'busy'
  | 'unknown_error';

export interface SyncSuccess {
  status: 'success';
  sha: string;
  /** True when a failed write was re-read and the remote already matched. */
  verifiedAfterFailure?: boolean;
}

export interface SyncFailure {
  status: SyncErrorCode;
  message: string;
  httpStatus?: number;
  /** Remote content read during conflict resolution or post-failure check. */
  remoteData?: unknown;
  remoteSha?: string;
}

export type SyncResult = SyncSuccess | SyncFailure;

export const isSyncSuccess = (result: SyncResult): result is SyncSuccess =>
  result.status === 'success';

/** One local draft against one remote file. `baseData` is the content the SHA belongs to. */
export interface DraftEnvelope<T> {
  schemaVersion: 2;
  resourceKey: string;
  draftId: string;
  baseSha: string;
  baseData: T;
  draftData: T;
  revision: number;
  updatedAt: string;
}

export interface SyncConflict<T> {
  remoteSha: string;
  remoteData: T;
  detectedAt: string;
}

/** Metadata for drafts this tab did not create (other tabs or earlier sessions). */
export interface DraftSummary {
  draftId: string;
  revision: number;
  updatedAt: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  issues: ValidationIssue[];
}

export interface RemoteCheckOutcome {
  checked: boolean;
  remoteChanged: boolean;
  result: SyncResult;
}

export type SyncStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'offline'
  | 'conflict'
  | 'error';

export type PushStatus = 'idle' | 'pushing';

/** Builds the identity of the remote file plus the GitHub account that owns the draft. */
export function buildResourceKey(args: {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  userId: string | number;
}): string {
  return `${args.owner}/${args.repo}@${args.branch}:${args.path}#${args.userId}`;
}

export const SYNC_ERROR_MESSAGES: Record<SyncErrorCode, string> = {
  conflict: '远程文件已被其他设备修改，请先处理冲突',
  unauthorized: 'GitHub 授权无效或已过期，请重新授权',
  forbidden: 'Token 没有写入该文件/仓库的权限',
  rate_limited: 'GitHub API 请求过于频繁，请稍后手动重试',
  not_found: '远程文件或仓库不存在，请检查配置（不会自动创建）',
  invalid_data: '数据校验未通过，未提交到 GitHub',
  network_error: '网络错误，草稿已保留，可稍后重试',
  timeout: '请求超时，草稿已保留',
  busy: '已有推送正在进行',
  unknown_error: '未知错误，请查看控制台日志',
};
