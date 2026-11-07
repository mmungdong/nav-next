// Discovers *.test.ts under src/ and runs them with Node's test runner through tsx.
// No shell globs or platform-specific commands, so it works on macOS and Windows.
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(process.cwd(), 'src');
const files = [];

const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full);
    } else if (entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
};

walk(root);
files.sort();

if (files.length === 0) {
  console.error('No test files found under src/.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
