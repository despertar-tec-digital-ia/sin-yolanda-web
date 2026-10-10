// Local visual review only. Never serve the repository root or a network interface.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = new URL('./', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/intake.js', ['intake.js', 'text/javascript; charset=utf-8']],
  ['/assets/media/brand-logo.png', ['../../assets/media/brand-logo.png', 'image/png']],
  ['/fonts/bebas-neue-400.woff2', ['../../fonts/bebas-neue-400.woff2', 'font/woff2']],
  ['/fonts/roboto-slab-400.woff2', ['../../fonts/roboto-slab-400.woff2', 'font/woff2']],
  ['/fonts/roboto-slab-700.woff2', ['../../fonts/roboto-slab-700.woff2', 'font/woff2']],
]);

const port = Number(process.argv[2] || 8798);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a local port from 1024 to 65535.');
const server = createServer(async (request, response) => {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { ...headers, Allow: 'GET, HEAD' }); response.end(); return;
  }
  const path = (request.url || '').split('?')[0];
  const file = files.get(path);
  if (!file) { response.writeHead(404, headers); response.end(); return; }
  try {
    const body = await readFile(fileURLToPath(new URL(file[0], directory)));
    response.writeHead(200, { ...headers, 'Content-Type': file[1], 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(500, headers); response.end('Local preview resource unavailable.');
  }
});

server.listen(port, '127.0.0.1', () => process.stdout.write(`Local registration preview: http://127.0.0.1:${port}/\n`));
