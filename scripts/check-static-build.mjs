// Smoke check for the exported static artifact. This is NOT a browser test:
// it verifies that `next build` produced the pages and that the data files in
// `out/` parse as UTF-8 JSON with the expected shape.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = resolve(process.cwd(), 'out');
let failures = 0;

const fail = (message) => {
  failures += 1;
  console.error(`✗ ${message}`);
};

if (!existsSync(outDir)) {
  fail('out/ does not exist — run `npm run build` first');
} else {
  const required = ['index.html', 'data/db.json', 'data/site-config.json'];
  for (const relative of required) {
    const full = join(outDir, relative);
    if (!existsSync(full)) fail(`missing ${relative}`);
    else console.log(`✓ ${relative}`);
  }

  try {
    const db = JSON.parse(readFileSync(join(outDir, 'data/db.json'), 'utf8'));
    if (!Array.isArray(db) || db.length === 0) fail('out/data/db.json is empty');
    else {
      const sites = db.reduce((sum, category) => sum + (category.nav?.length ?? 0), 0);
      console.log(`✓ out/data/db.json: ${db.length} categories, ${sites} sites`);
    }
  } catch (error) {
    fail(`out/data/db.json is not valid UTF-8 JSON: ${error.message}`);
  }

  const htmlFiles = readdirSync(outDir).filter((name) => name.endsWith('.html'));
  console.log(`✓ ${htmlFiles.length} exported HTML page(s)`);
}

if (failures > 0) {
  console.error(`\n${failures} static artifact check(s) failed.`);
  process.exit(1);
}
console.log('\nStatic artifact looks complete.');
