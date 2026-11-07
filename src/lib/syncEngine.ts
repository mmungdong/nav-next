import { canonicalEqual } from '@/lib/codec';
import { formatIssues } from '@/lib/dataValidation';
import {
  DraftEnvelope,
  SyncFailure,
  SyncResult,
  ValidationResult,
} from '@/lib/syncTypes';

export interface RemoteFile<T> {
  sha: string;
  data: T;
}

export interface RemoteRead {
  sha: string;
  /** Raw parsed JSON; validated by the caller before use. */
  data: unknown;
}

/**
 * Per-resource transport. The stores only describe what a valid document is;
 * every safety rule (SHA baseline, conflict, timeout re-read) lives here.
 */
export interface ResourceAdapter<T> {
  readRemote(
    token: string
  ): Promise<{ ok: true; file: RemoteRead } | { ok: false; result: SyncFailure }>;
  writeRemote(
    token: string,
    data: T,
    baseSha: string,
    message: string
  ): Promise<{ ok: true; sha: string } | { ok: false; result: SyncFailure }>;
  validate(raw: unknown): ValidationResult<T>;
}

export type ReadValidatedResult<T> =
  | { ok: true; file: RemoteFile<T> }
  | { ok: false; result: SyncFailure };

const readonly = <T>(value: T): T => value;

export async function readValidatedRemote<T>(
  adapter: ResourceAdapter<T>,
  token: string
): Promise<ReadValidatedResult<T>> {
  const read = await adapter.readRemote(token);
  if (!read.ok) return readonly(read);

  const validation = adapter.validate(read.file.data);
  if (!validation.ok || validation.value === undefined) {
    return {
      ok: false,
      result: {
        status: 'invalid_data',
        message: `远程数据校验失败：${formatIssues(validation.issues)}`,
        remoteSha: read.file.sha,
      },
    };
  }
  return { ok: true, file: { sha: read.file.sha, data: validation.value } };
}

export interface PushOutcome<T> {
  result: SyncResult;
  newSha?: string;
  remote?: RemoteFile<T>;
  /** The exact payload validated and sent, so callers use it as the new baseline. */
  submitted?: T;
}

export async function pushResource<T>(args: {
  adapter: ResourceAdapter<T>;
  token: string;
  data: T;
  baseSha: string;
  message: string;
}): Promise<PushOutcome<T>> {
  const { adapter, token, baseSha, message } = args;

  if (!baseSha) {
    return {
      result: {
        status: 'invalid_data',
        message: '没有已验证的远程基线，不能推送（请先重新拉取）',
      },
    };
  }

  const validation = adapter.validate(args.data);
  if (!validation.ok || validation.value === undefined) {
    return {
      result: {
        status: 'invalid_data',
        message: `数据校验未通过，未提交：${formatIssues(validation.issues)}`,
      },
    };
  }
  const submitted = validation.value;

  const write = await adapter.writeRemote(token, submitted, baseSha, message);
  if (write.ok) {
    return {
      result: { status: 'success', sha: write.sha },
      newSha: write.sha,
      submitted,
    };
  }

  if (write.result.status === 'conflict') {
    const remote = await readValidatedRemote(adapter, token);
    if (remote.ok) {
      return {
        result: {
          ...write.result,
          remoteSha: remote.file.sha,
          remoteData: remote.file.data,
        },
        remote: remote.file,
        submitted,
      };
    }
    return { result: write.result, submitted };
  }

  // A timeout or dropped connection may happen *after* GitHub accepted the PUT.
  // Re-read once and only then decide between success and failure.
  if (write.result.status === 'timeout' || write.result.status === 'network_error') {
    const remote = await readValidatedRemote(adapter, token);
    if (remote.ok && canonicalEqual(remote.file.data, submitted)) {
      return {
        result: {
          status: 'success',
          sha: remote.file.sha,
          verifiedAfterFailure: true,
        },
        newSha: remote.file.sha,
        remote: remote.file,
        submitted,
      };
    }
    return {
      result: remote.ok
        ? {
            ...write.result,
            remoteSha: remote.file.sha,
            remoteData: remote.file.data,
          }
        : write.result,
      remote: remote.ok ? remote.file : undefined,
      submitted,
    };
  }

  return { result: write.result, submitted };
}

export function buildDraft<T>(args: {
  resourceKey: string;
  draftId: string;
  baseSha: string;
  baseData: T;
  draftData: T;
  revision: number;
}): DraftEnvelope<T> {
  return {
    schemaVersion: 2,
    resourceKey: args.resourceKey,
    draftId: args.draftId,
    baseSha: args.baseSha,
    baseData: args.baseData,
    draftData: args.draftData,
    revision: args.revision,
    updatedAt: new Date().toISOString(),
  };
}

/** Order-sensitive business comparison; reverting to the baseline clears dirty. */
export function isDirty(current: unknown, baseline: unknown): boolean {
  return !canonicalEqual(current, baseline);
}
