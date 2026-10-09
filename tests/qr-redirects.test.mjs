import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseQrRedirects } from '../scripts/qr-redirects.mjs';
import { inspectPublic, packagePublic, projectRoot } from '../scripts/package-public.mjs';

const destination = 'https://sinyolandagdl.com/menu/?utm_source=qr&utm_medium=offline&utm_campaign=menu_guadalajara';
const rules = `/q/gdl-menu ${destination} 302\n/q/gdl-menu/ ${destination} 302\n`;

test('the print alias points to the original menu with fixed public attribution', () => {
  assert.deepEqual(parseQrRedirects('# QR pilot\n\n' + rules), [
    { source: '/q/gdl-menu', destination, status: 302 },
    { source: '/q/gdl-menu/', destination, status: 302 },
  ]);
  assert.deepEqual(parseQrRedirects(rules.replaceAll('\n', '\r\n')), parseQrRedirects(rules));
  const { files } = inspectPublic();
  assert.ok(files.includes('_redirects'));
  assert.deepEqual(parseQrRedirects(readFileSync(join(projectRoot, '_redirects'), 'utf8')), parseQrRedirects(rules));
});

test('unapproved rules, permanent redirects and arbitrary destinations fail closed', () => {
  for (const value of [
    '', rules.split('\n')[0], rules + rules,
    rules.replaceAll('302', '301'), rules.replaceAll('302', '307'),
    rules.replace('/q/gdl-menu ', '/q/* '),
    rules.replace('/q/gdl-menu ', '/q/gdl-menu?next=:next '),
    rules.replace('/q/gdl-menu ', '/menu '),
    rules.replaceAll('https://sinyolandagdl.com/menu/', 'http://sinyolandagdl.com/menu/'),
    rules.replaceAll('https://sinyolandagdl.com/menu/', 'https://evil.example/menu/'),
    rules.replaceAll('https://sinyolandagdl.com/menu/', 'https://sin-yolanda.com/san-ignacio/menu/'),
    rules.replaceAll('utm_source=qr', 'utm_source=instagram'),
    rules.replaceAll('menu_guadalajara', 'menu_guadalajara&email=visitor@example.org'),
    rules.replace(' 302\n', ' 302 extra\n'),
  ]) assert.throws(() => parseQrRedirects(value));
  assert.throws(() => parseQrRedirects(null));
});

test('only reviewed redirect control files enter the package', t => {
  const root = mkdtempSync(join(tmpdir(), 'sy-qr-package-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  writeFileSync(join(root, 'scripts/public-manifest.json'), JSON.stringify({ version: 1,
    pages: ['404.html'], assets: ['_headers', '_redirects'] }));
  writeFileSync(join(root, '404.html'), '<!doctype html><title>Missing</title>');
  writeFileSync(join(root, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n');
  writeFileSync(join(root, '_redirects'), rules);
  const out = join(root, 'candidate'), report = packagePublic({ root, destination: out });
  assert.equal(readFileSync(join(out, '_redirects'), 'utf8'), rules);
  assert.match(report.hashes._redirects, /^[a-f0-9]{64}$/);
  writeFileSync(join(root, '_redirects'), rules.replaceAll('302', '301'));
  assert.throws(() => packagePublic({ root, destination: join(root, 'rejected') }), /temporary/);
});
