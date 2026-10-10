import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseQrRedirects, assertRegistrationRedirectPatch, qrMenuDestination,
  qrRegistrationFormId, qrRegistrationDestination } from '../scripts/qr-redirects.mjs';

// Synthetic fixture only. This is not the real GHL form URL or a publishable destination.
const registrationDestination = `https://forms.example.test/confirmed-form/${qrRegistrationFormId}`;
const options = { registrationDestination };
const menuRules = ['/q/gdl-menu', '/q/gdl-menu/'].map(path => `${path} ${qrMenuDestination} 302\n`).join('');
const registrationRules = ['/q/el-paso-registro', '/q/el-paso-registro/']
  .map(path => `${path} ${registrationDestination} 302\n`).join('');
const allRules = menuRules + registrationRules;
const hash = value => createHash('sha256').update(value).digest('hex');
const baselineHashes = { '_redirects': hash(menuRules), '_headers': hash('baseline headers'),
  'index.html': hash('baseline home'), '404.html': hash('baseline missing page') };
const candidateHashes = { ...baselineHashes, '_redirects': hash(allRules) };
const patch = () => ({ baselineHashes, candidateHashes, baselineRedirects: menuRules,
  candidateRedirects: allRules, registrationDestination });

test('registration aliases wait for a supplied URL and keep both menu aliases intact', () => {
  assert.equal(qrRegistrationFormId, 'nN59k3I7TT6TOxDl4XET');
  assert.deepEqual(parseQrRedirects(menuRules, options), parseQrRedirects(menuRules));
  assert.throws(() => parseQrRedirects(allRules, { registrationDestination: null }), /approved alias/);
  const records = parseQrRedirects('# local fixture\n' + allRules, options);
  assert.deepEqual(records.slice(0, 2), parseQrRedirects(menuRules));
  assert.deepEqual(records.slice(2), [
    { source: '/q/el-paso-registro', destination: registrationDestination, status: 302 },
    { source: '/q/el-paso-registro/', destination: registrationDestination, status: 302 },
  ]);
  assert.deepEqual(parseQrRedirects(allRules.replaceAll('\n', '\r\n'), options), records);
});

test('the real registration destination preserves the exact shared form and fixed public attribution', () => {
  const url = new URL(qrRegistrationDestination);
  assert.equal(url.origin, 'https://api.leadconnectorhq.com');
  assert.equal(url.pathname, '/widget/form/nN59k3I7TT6TOxDl4XET');
  assert.deepEqual([...url.searchParams], [
    ['utm_source', 'qr'], ['utm_medium', 'offline'], ['utm_campaign', 'loyalty_el_paso'], ['utm_content', 'registro_v1'],
  ]);
  assert.equal(url.hash, '');
});

test('registration rules reject partial aliases, wildcards, permanent status and other forms', () => {
  for (const source of [
    menuRules + registrationRules.split('\n')[0], allRules + registrationRules,
    registrationRules, allRules.replace('/q/el-paso-registro ', '/q/* '),
    allRules.replace('/q/el-paso-registro ', '/q/el-paso-registro?next=:next '),
    allRules.replace('/q/el-paso-registro ', '/q/el-paso-registro/other '),
    allRules.replaceAll(`${registrationDestination} 302`, `${registrationDestination} 301`),
    allRules.replaceAll(registrationDestination, registrationDestination + '?email=visitor@example.org'),
    allRules.replaceAll(qrRegistrationFormId, 'another-form'),
    allRules.replaceAll(qrMenuDestination, registrationDestination),
  ]) assert.throws(() => parseQrRedirects(source, options));
  for (const destination of [null, '', registrationDestination.replace('https:', 'http:'),
    registrationDestination.replace('https://', 'https://user:password@'),
    registrationDestination + '#other', registrationDestination.replace(qrRegistrationFormId, 'another-form')]) {
    assert.throws(() => assertRegistrationRedirectPatch({ ...patch(), registrationDestination: destination }));
  }
});

test('control-only registration patch preserves the full baseline and changes only redirects', () => {
  const report = assertRegistrationRedirectPatch(patch());
  assert.deepEqual(report.changedFiles, ['_redirects']);
  assert.equal(report.preservedFileCount, 3);
  assert.equal(report.rules.length, 4);
});

test('control-only patch rejects changed, missing, extra or inconsistent baseline files', () => {
  const missing = { ...candidateHashes }; delete missing['404.html'];
  for (const hashes of [
    { ...candidateHashes, 'index.html': hash('replacement home') }, missing,
    { ...candidateHashes, 'new-page.html': hash('not in baseline') },
    { ...candidateHashes, '_redirects': hash('wrong bytes') },
    { ...candidateHashes, '_headers': 'invalid hash' },
  ]) assert.throws(() => assertRegistrationRedirectPatch({ ...patch(), candidateHashes: hashes }));
  const changedMenu = allRules.replaceAll('utm_source=qr', 'utm_source=other');
  assert.throws(() => assertRegistrationRedirectPatch({ ...patch(), candidateRedirects: changedMenu,
    candidateHashes: { ...candidateHashes, '_redirects': hash(changedMenu) } }));
  assert.throws(() => assertRegistrationRedirectPatch({ ...patch(), candidateRedirects: menuRules,
    candidateHashes: baselineHashes }), /both registration aliases/);
});
