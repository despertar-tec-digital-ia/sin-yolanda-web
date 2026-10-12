import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

export const target = Object.freeze({
  repository: 'despertar-tec-digital-ia/sin-yolanda-web',
  accountId: '6be299341b349dad18a90982ada1cc7a',
  zoneId: '7183eb6e461465913f5fe600625bbe96',
  domain: 'sin-yolanda.com', project: 'sin-yolanda-web', productionBranch: 'main',
});

// Temporary shared-config exception approved by Luis. Never load the entire config.
export function credential(kind, env = process.env, read = execFileSync) {
  assert.ok(['dns', 'pages'].includes(kind), 'Unknown credential purpose');
  const key = kind === 'dns' ? 'SY_CLOUDFLARE_DNS_TOKEN' : 'SY_CLOUDFLARE_PAGES_TOKEN';
  const supplied = env[key];
  if (supplied) return supplied.trim();
  assert.ok(!env.GITHUB_ACTIONS, 'GitHub must supply the protected environment credential');
  return read('doppler', ['secrets', 'get', key, '--plain', '--project', 'ddtia',
    '--config', 'prd_dns-ops', '--silent'], {encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();
}

export function cloudflare(token, fetchImpl = globalThis.fetch) {
  assert.ok(token, 'Missing scoped Cloudflare credential');
  return async (path, options = {}) => {
    assert.ok(path.startsWith('/zones/' + target.zoneId + '/')
      || path.startsWith('/accounts/' + target.accountId + '/'), 'Refuse another account or zone');
    const response = await fetchImpl('https://api.cloudflare.com/client/v4' + path, {
      ...options, redirect:'error', signal:AbortSignal.timeout(30000),
      headers:{Authorization:'Bearer ' + token, 'Content-Type':'application/json'},
    });
    const body = await response.json();
    // Provider error messages can contain submitted content. Print only status/codes.
    assert.ok(response.ok && body.success, 'Cloudflare operation rejected: HTTP ' + response.status
      + '; codes=' + (body.errors ?? []).map(x=>x.code).join(','));
    return body;
  };
}
