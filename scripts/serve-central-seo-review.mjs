// Loopback review with read-only excerpts taken from the candidate's actual HTML and styles.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadReviewPackage, createReviewServer } from './serve-review.mjs';

const candidate = loadReviewPackage(process.argv[2]);
const port = Number(process.argv[3] ?? 8842);
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536);
const site = createReviewServer(candidate);
const excerpts = new Map([
  ['/__review/home', ['index.html', '<section class="section venue-showcase"']],
  ['/__review/guadalajara', ['guadalajara.html', '<section class="hh-table"']],
]);
const server = createServer((req, res) => {
  const entry = excerpts.get((req.url ?? '').split('?')[0]);
  if (!entry) return site.emit('request', req, res);
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  const [file, marker] = entry;
  const html = readFileSync(resolve(candidate.root, file), 'utf8');
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<script\b[\s\S]*?<\/script>/g, '');
  const body = html.match(/<body\b[^>]*>/)[0];
  const start = html.indexOf(marker), end = html.indexOf('</section>', start) + '</section>'.length;
  assert.ok(start > 0 && end > start);
  const excerpt = '<!doctype html><html lang="es"><head><base href="/">' + head +
    '<style>html{scroll-behavior:auto!important}.reveal,.reveal-scale{opacity:1!important;transform:none!important}.venue-showcase{outline:none!important}</style></head>' +
    body + '<main>' + html.slice(start, end) + '</main></body></html>';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  res.end(req.method === 'HEAD' ? undefined : excerpt);
});
server.listen(port, '127.0.0.1', () => console.log('Local SEO review: http://127.0.0.1:' + port));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
