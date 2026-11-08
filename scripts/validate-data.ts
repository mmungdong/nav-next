// Validates the static data files with the same rules the stores use before
// pushing to GitHub. `ownVisible` is a retired field: it is reported as a
// migration note, never as a build-blocking "private data" error.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatIssues,
  validateCategories,
  validateSiteConfig,
} from '../src/lib/dataValidation.ts';

type RawCategory = {
  nav: Array<Record<string, unknown>>;
};

type RawConfig = {
  search: { engines: unknown[] };
};

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));

let failures = 0;

try {
  const categories = readJson('public/data/db.json') as RawCategory[];
  const result = validateCategories(categories);
  if (result.ok) {
    const siteCount = categories.reduce((sum, category) => sum + category.nav.length, 0);
    console.log(`✓ db.json: ${categories.length} categories, ${siteCount} sites`);

    const deprecated = categories.reduce(
      (sum, category) =>
        sum + category.nav.filter((site) => site && 'ownVisible' in site).length,
      0
    );
    if (deprecated > 0) {
      console.warn(
        `! db.json contains ${deprecated} legacy ownVisible field(s); they are removed on the next save.`
      );
    }
  } else {
    failures += 1;
    console.error(`✗ db.json invalid:\n  ${formatIssues(result.issues, 20)}`);
  }
} catch (error) {
  failures += 1;
  console.error(`✗ db.json cannot be read: ${(error as Error).message}`);
}

try {
  const config = readJson('public/data/site-config.json') as RawConfig;
  const result = validateSiteConfig(config);
  if (result.ok) {
    console.log(`✓ site-config.json: ${config.search.engines.length} search engines`);
  } else {
    failures += 1;
    console.error(`✗ site-config.json invalid:\n  ${formatIssues(result.issues, 20)}`);
  }
} catch (error) {
  failures += 1;
  console.error(`✗ site-config.json cannot be read: ${(error as Error).message}`);
}

if (failures > 0) {
  console.error(`\n${failures} data file(s) failed validation.`);
  process.exit(1);
}

console.log('\nAll data files passed validation.');
