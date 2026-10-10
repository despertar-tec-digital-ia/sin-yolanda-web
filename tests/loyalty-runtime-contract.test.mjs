import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = file => readFileSync(new URL(`../services/loyalty-intake/${file}`, import.meta.url), 'utf8');

test('intake image uses a fixed base and excludes local QA, databases, keys and frontend media', () => {
  const docker = read('Dockerfile');
  assert.match(docker, /FROM python:3\.12-slim@sha256:[a-f0-9]{64}/);
  assert.match(docker, /uv sync --frozen --no-dev --no-install-project/);
  assert.match(docker, /USER 10001:10001/);
  assert.match(docker, /CMD \["python", "run_production.py"\]/);
  assert.doesNotMatch(docker, /COPY (?:\.|var|tests|run_local|prototypes)/);
  const ignore = read('.dockerignore').split('\n');
  assert.equal(ignore[0], '*');
  assert.ok(!ignore.some(line => /^!(?:var|tests|\.env|media|run_local)/.test(line)));
});

test('candidate compose cannot enable public routing or discover shared credentials', () => {
  const compose = read('compose.candidate.yml');
  assert.match(compose, /127\.0\.0\.1:8841:8000/);
  assert.match(compose, /SY_INTAKE_MODE: production/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /external: true/);
  assert.match(compose, /SY_INTAKE_ENCRYPTION_KEY:\?Dedicated encryption key required/);
  assert.doesNotMatch(compose, /GHL_|traefik\.enable|network_mode: host|privileged: true|\/var\/run\/docker\.sock/);
});
