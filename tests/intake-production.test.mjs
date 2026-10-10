import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL(`../services/loyalty-intake/${path}`, import.meta.url), 'utf8');

test('production service has dedicated volumes, no host ports and no GHL transport', () => {
  const compose = source('compose.production.yml');
  assert.doesNotMatch(compose, /^\s+(?:ports|env_file|privileged):/m);
  assert.match(compose, /sinyolanda-loyalty-intake-production-data/);
  assert.match(compose, /sinyolanda-loyalty-intake-production-backups/);
  assert.doesNotMatch(compose, /staging|PREVIEW_|GHL_[A-Z]/);
  assert.match(compose, /depends_on:\n\s+intake: \{condition: service_healthy\}/);
  assert.match(compose, /SY_INTAKE_ORIGINS: https:\/\/sin-yolanda\.com/);
  assert.match(compose, /SY_INTAKE_TURNSTILE_HOSTNAME: sin-yolanda\.com/);
  assert.match(compose, /SY_INTAKE_PROXY_AUTH_FILE:\?Dedicated existing production hash file/);
});

test('production ingress image cannot copy frontend files or runtime secrets', () => {
  const docker = source('api-gateway/Dockerfile');
  assert.deepEqual(docker.split('\n').filter(line => line.startsWith('COPY ')),
    ['COPY nginx.conf /etc/nginx/nginx.conf']);
  assert.equal(source('api-gateway/.dockerignore'), '*\n!Dockerfile\n!nginx.conf\n');
  const nginx = source('api-gateway/nginx.conf');
  assert.match(nginx, /auth_basic_user_file \/run\/secrets\/intake_proxy_auth;/);
  assert.match(nginx, /"https:\/\/sin-yolanda\.com" @intake_type;/);
  assert.doesNotMatch(nginx, /registro-sy-prueba|\/srv\/public|location = \/health/);
});

test('scheduler targets only production container and preserves backup safety limits', () => {
  const backup = source('ops/sinyolanda-intake-backup.timer');
  assert.match(backup, /OnCalendar=\*-\*-\* 00,04,08,12,16,20:10:00 UTC/);
  assert.match(backup, /Persistent=true/);
  assert.match(source('ops/sinyolanda-intake-monitor.timer'), /OnUnitActiveSec=5min/);
  for (const operation of ['backup', 'monitor']) {
    const service = source(`ops/sinyolanda-intake-${operation}.service`);
    assert.match(service, /UMask=0077/);
    assert.match(service, /NoNewPrivileges=true/);
    assert.match(service, /ProtectSystem=strict/);
    assert.match(service, new RegExp(`host_maintenance\\.py ${operation}`));
    assert.doesNotMatch(service, /DOPPLER_TOKEN|--token|\.token|GHL_/);
  }
});
