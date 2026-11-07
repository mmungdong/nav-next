import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushResource, readValidatedRemote, ResourceAdapter, isDirty } from '@/lib/syncEngine';
import { validateCategories } from '@/lib/dataValidation';
import { SyncFailure } from '@/lib/syncTypes';

type Data = { id: number; title: string; nav: unknown[] }[];

const valid: Data = [{ id: 1, title: '分类', nav: [] }];

const makeAdapter = (
  remote: { sha: string; data: unknown },
  write: ResourceAdapter<Data>['writeRemote']
): ResourceAdapter<Data> => ({
  readRemote: async () => ({ ok: true, file: remote }),
  writeRemote: write,
  validate: (raw) => {
    const result = validateCategories(raw);
    return {
      ok: result.ok,
      issues: result.issues,
      value: result.ok && result.value ? (result.value as Data) : undefined,
    };
  },
});

test('dirty detection is order-sensitive and clears on revert', () => {
  const a: Data = [
    { id: 1, title: 'A', nav: [] },
    { id: 2, title: 'B', nav: [] },
  ];
  const reversed: Data = [a[1], a[0]];
  assert.equal(isDirty(a, a), false);
  assert.equal(isDirty(reversed, a), true);
  // Same content, different object key order, is not a change.
  assert.equal(
    isDirty([{ title: 'A', id: 1, nav: [] }] as unknown as Data, a.slice(0, 1)),
    false
  );
});

test('invalid payload never reaches the write call', async () => {
  let wrote = false;
  const adapter = makeAdapter({ sha: 's1', data: valid }, async () => {
    wrote = true;
    return { ok: true, sha: 's2' };
  });

  const outcome = await pushResource({
    adapter,
    token: 't',
    data: [{ id: 1, title: 'x', nav: [{ id: 1, name: '', desc: '', url: 'nope' }] }] as unknown as Data,
    baseSha: 's1',
    message: 'm',
  });
  assert.equal(outcome.result.status, 'invalid_data');
  assert.equal(wrote, false);
});

test('missing baseline SHA refuses to write', async () => {
  const adapter = makeAdapter({ sha: 's1', data: valid }, async () => ({ ok: true, sha: 's2' }));
  const outcome = await pushResource({
    adapter,
    token: 't',
    data: valid,
    baseSha: '',
    message: 'm',
  });
  assert.equal(outcome.result.status, 'invalid_data');
});

test('conflict attaches the remote snapshot for review', async () => {
  const remote = { sha: 's2', data: [{ id: 1, title: '远程', nav: [] }] };
  const adapter = makeAdapter(remote, async (): Promise<{ ok: false; result: SyncFailure }> => ({
    ok: false,
    result: { status: 'conflict', message: 'sha does not match', httpStatus: 409 },
  }));

  const outcome = await pushResource({
    adapter,
    token: 't',
    data: valid,
    baseSha: 's1',
    message: 'm',
  });
  assert.equal(outcome.result.status, 'conflict');
  assert.equal(outcome.result.status === 'conflict' && outcome.result.remoteSha, 's2');
  assert.deepEqual(outcome.remote?.data, remote.data);
});

test('A06 timeout after a committed write is confirmed by re-reading remote', async () => {
  const remote = { sha: 's1', data: valid as unknown };
  const adapter = makeAdapter(remote, async () => {
    // The server applied the write, then the connection dropped.
    remote.sha = 's2';
    remote.data = valid;
    return { ok: false, result: { status: 'timeout', message: '超时' } };
  });

  const outcome = await pushResource({
    adapter,
    token: 't',
    data: valid,
    baseSha: 's1',
    message: 'm',
  });
  assert.equal(outcome.result.status, 'success');
  assert.equal(outcome.result.status === 'success' && outcome.result.verifiedAfterFailure, true);
  assert.equal(outcome.newSha, 's2');
});

test('a timeout with different remote content stays a failure', async () => {
  const remote = { sha: 's2', data: [{ id: 2, title: '别人改的', nav: [] }] };
  const adapter = makeAdapter(remote, async () => ({
    ok: false,
    result: { status: 'timeout', message: '超时' },
  }));

  const outcome = await pushResource({
    adapter,
    token: 't',
    data: valid,
    baseSha: 's1',
    message: 'm',
  });
  assert.equal(outcome.result.status, 'timeout');
  assert.equal(outcome.remote?.sha, 's2');
});

test('invalid remote data is reported instead of overwriting the baseline', async () => {
  const adapter = makeAdapter({ sha: 's1', data: { not: 'categories' } }, async () => ({
    ok: true,
    sha: 's2',
  }));
  const read = await readValidatedRemote(adapter, 't');
  assert.equal(read.ok, false);
  assert.equal(!read.ok && read.result.status, 'invalid_data');
});
