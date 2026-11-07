// Minimal cross-platform static server for the exported `out/` directory.
// Used by Playwright so the e2e run exercises the real static artifact.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'out');
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';

// Fail loudly instead of serving 404s: browser tests must target a real build.
if (!existsSync(join(root, 'index.html'))) {
  console.error('out/index.html is missing. Run `npm run build` before the e2e suite.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const candidates = (pathname) => {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const relative = clean.replace(/^[/\\]+/, '');
  const target = join(root, relative);
  if (pathname.endsWith('/')) return [join(target, 'index.html')];
  return [target, `${target}.html`, join(target, 'index.html')];
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? host}`);
  const paths = candidates(url.pathname);

  for (const file of paths) {
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(body);
      return;
    } catch {
      // try the next candidate
    }
  }

  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
}).listen(port, host, () => {
  console.log(`Static server for out/ listening on http://${host}:${port}`);
});
