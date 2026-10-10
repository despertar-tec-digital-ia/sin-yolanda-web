// Local visual review by default; --with-intake enables only the fixed local QA API.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = new URL('./', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/intake.js', ['intake.js', 'text/javascript; charset=utf-8']],
  ['/media/singer-600.webp', ['media/singer-600.webp', 'image/webp']],
  ['/media/singer-1200.webp', ['media/singer-1200.webp', 'image/webp']],
  ['/assets/media/brand-logo.png', ['../../assets/media/brand-logo.png', 'image/png']],
  ['/fonts/bebas-neue-400.woff2', ['../../fonts/bebas-neue-400.woff2', 'font/woff2']],
  ['/fonts/roboto-slab-400.woff2', ['../../fonts/roboto-slab-400.woff2', 'font/woff2']],
  ['/fonts/roboto-slab-700.woff2', ['../../fonts/roboto-slab-700.woff2', 'font/woff2']],
]);

export const consentVersion = 'sy-el-paso-registration-v2-2026-10-09';
const backendUrl = 'http://127.0.0.1:8801/api/registrations';
const maxBodyBytes = 8192;
const receiptPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const errorCodes = new Set(['invalid_fields', 'consent_required', 'invalid_date', 'invalid_phone', 'idempotency_conflict', 'rate_limited', 'verification_failed', 'unavailable']);
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };

function json(response, status, value, head = false) {
  const body = JSON.stringify(value);
  response.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  response.end(head ? undefined : body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let chunks = [], size = 0, settled = false;
    const fail = error => { if (!settled) { settled = true; reject(error); } };
    const data = chunk => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        chunks = [];
        request.off('data', data);
        request.resume();
        fail(new RangeError('Body too large'));
      } else chunks.push(chunk);
    };
    request.on('data', data);
    request.once('end', () => { if (!settled) { settled = true; resolve(Buffer.concat(chunks)); } });
    request.once('error', fail);
    request.once('aborted', () => fail(new Error('Aborted')));
  });
}

// fetch is injectable for native tests; the backend URL is never configurable.
export function createLocalServer({ captureEnabled = false, proxyFetch = fetch } = {}) {
  const server = createServer(async (request, response) => {
    if (request.url === '/intake-config.json' && ['GET', 'HEAD'].includes(request.method)) {
      json(response, 200, { captureEnabled: Boolean(captureEnabled), qaOnly: true, mode: captureEnabled ? 'local-qa' : 'disabled', consentVersion }, request.method === 'HEAD');
      return;
    }
    if (request.url === '/api/registrations') {
      if (!captureEnabled) { json(response, 404, { code: 'unavailable' }); return; }
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST'); json(response, 405, { code: 'invalid_fields' }); return;
      }
      const origin = `http://127.0.0.1:${server.address().port}`;
      if (!['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress) || request.headers.origin !== origin) {
        json(response, 403, { code: 'verification_failed' }); return;
      }
      if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '') || !receiptPattern.test(request.headers['idempotency-key'] || '')) {
        json(response, 400, { code: 'invalid_fields' }); return;
      }
      if (Number(request.headers['content-length'] || 0) > maxBodyBytes) { json(response, 413, { code: 'invalid_fields' }); request.resume(); return; }
      let inputValidated = false;
      try {
        const body = await readBody(request);
        const payload = JSON.parse(body.toString('utf8'));
        if (!payload || Array.isArray(payload) || typeof payload !== 'object') { json(response, 400, { code: 'invalid_fields' }); return; }
        inputValidated = true;
        const upstream = await proxyFetch(backendUrl, {
          method: 'POST', redirect: 'error', credentials: 'omit',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': request.headers['idempotency-key'], Origin: origin },
          body, signal: AbortSignal.timeout(8000),
        });
        const result = await upstream.json();
        if ([200, 201].includes(upstream.status) && result?.status === 'received' && receiptPattern.test(result.receipt_id || '') && result.sync_status === 'pending') {
          json(response, upstream.status, { status: 'received', receipt_id: result.receipt_id, sync_status: 'pending' });
        } else if (upstream.status >= 400 && upstream.status <= 599 && errorCodes.has(result?.code)) {
          json(response, upstream.status, { code: result.code });
        } else json(response, 502, { code: 'unavailable' });
      } catch (error) {
        const invalidInput = !inputValidated && (error instanceof RangeError || error instanceof SyntaxError);
        json(response, invalidInput ? error instanceof RangeError ? 413 : 400 : 503,
          { code: invalidInput ? 'invalid_fields' : 'unavailable' });
      }
      return;
    }
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
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2), ports = args.filter(arg => arg !== '--with-intake');
  const port = Number(ports[0] || 8798);
  if (ports.length > 1 || args.some(arg => arg.startsWith('--') && arg !== '--with-intake') || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a local port and the optional --with-intake flag.');
  const enabled = args.includes('--with-intake');
  createLocalServer({ captureEnabled: enabled }).listen(port, '127.0.0.1', () => process.stdout.write(`Local registration ${enabled ? 'QA capture' : 'preview'}: http://127.0.0.1:${port}/\n`));
}
