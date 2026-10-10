// Dedicated release candidate only. Never place this in the ordinary site's functions folder.
// The target is fixed; callers cannot choose a host, branch, credential or provider.
export const publicOrigin = 'https://sin-yolanda.com';
export const upstreamUrl = 'https://sy-intake-api.despertartdigital.cloud/api/registrations';
export const endpoint = '/api/loyalty/el-paso/registrations';
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const errorStatuses = Object.freeze({
  invalid_fields: 400, consent_required: 400, invalid_date: 400, invalid_phone: 400,
  verification_failed: 400, idempotency_conflict: 409, rate_limited: 429,
});

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status, headers: {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    },
  });
}

async function readBounded(stream, limit, signal) {
  if (!stream) throw new Error('invalid_body');
  const reader = stream.getReader();
  const chunks = [];
  let length = 0;
  const aborted = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', aborted, { once: true });
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (signal.aborted) throw new Error('deadline');
      if (done) {
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        return bytes;
      }
      length += value.length;
      if (length > limit) throw new Error('too_large');
      chunks.push(value);
    }
    throw new Error('deadline');
  } finally {
    signal.removeEventListener('abort', aborted);
    if (!signal.aborted) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function relay(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (url.origin !== publicOrigin || url.pathname !== endpoint || url.search) return reply(404, { code: 'not_found' });
  if (request.method !== 'POST') return reply(405, { code: 'method_not_allowed' });
  if (request.headers.get('Origin') !== publicOrigin) return reply(403, { code: 'origin_denied' });
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') || '')) return reply(415, { code: 'invalid_fields' });
  const key = request.headers.get('Idempotency-Key') || '';
  if (!uuidV4.test(key)) return reply(400, { code: 'invalid_fields' });
  // The deployment binding is a dedicated server-only gateway credential, not a GHL token.
  // Restrict syntax before constructing a header; absence always closes capture.
  const credential = env?.SY_INTAKE_PROXY_AUTH;
  if (typeof credential !== 'string' || !/^Basic [A-Za-z0-9+/]{20,1024}={0,2}$/.test(credential)) return reply(503, { code: 'unavailable' });
  const contentLength = request.headers.get('Content-Length');
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > 8192)) return reply(413, { code: 'invalid_fields' });
  const incoming = new AbortController();
  const incomingTimer = setTimeout(() => incoming.abort(), 8000);
  let bytes;
  try {
    bytes = await readBounded(request.body, 8192, incoming.signal);
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { code: 'invalid_fields' });
  } catch (error) {
    return reply(incoming.signal.aborted ? 408 : error.message === 'too_large' ? 413 : 400, { code: 'invalid_fields' });
  } finally { clearTimeout(incomingTimer); }
  const outgoing = new AbortController();
  const outgoingTimer = setTimeout(() => outgoing.abort(), 12000);
  try {
    const response = await fetcher(upstreamUrl, {
      // workerd accepts manual/follow, not Node's error mode. Never follow a redirect
      // with this server credential; reject all 3xx before inspecting the body.
      method: 'POST', body: bytes, redirect: 'manual', signal: outgoing.signal,
      headers: { 'Content-Type': 'application/json', Origin: publicOrigin, 'Idempotency-Key': key, Authorization: credential },
    });
    if ((response.status >= 300 && response.status < 400) || !/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('Content-Type') || '')) {
      void response.body?.cancel().catch(() => {});
      return reply(503, { code: 'unavailable' });
    }
    const result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readBounded(response.body, 2048, outgoing.signal)));
    if ([200, 201].includes(response.status) && result?.status === 'received' && uuidV4.test(result.receipt_id || '') && result.sync_status === 'pending') {
      return reply(response.status, { status: 'received', receipt_id: result.receipt_id, sync_status: 'pending' });
    }
    if (response.status >= 400 && response.status < 500 && Object.hasOwn(errorStatuses, result?.code)) return reply(errorStatuses[result.code], { code: result.code });
  } catch { /* Provider body, credentials and customer details never enter logs or responses. */ }
  finally { clearTimeout(outgoingTimer); }
  return reply(503, { code: 'unavailable' });
}

export function onRequest({ request, env }) { return relay(request, env); }
