import { test } from 'node:test';
import assert from 'node:assert/strict';
import { githubConfig, owner, repo, branch, dbPath, configPath } from './config.ts';

test('config exports github config fields', () => {
  assert.equal(owner, githubConfig.owner);
  assert.equal(repo, githubConfig.repo);
  assert.equal(branch, githubConfig.branch);
  assert.equal(dbPath, 'public/data/db.json');
  assert.equal(configPath, 'public/data/site-config.json');
  assert.ok(owner.length > 0);
  assert.ok(repo.length > 0);
});
