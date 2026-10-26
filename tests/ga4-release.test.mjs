import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {restoreGa4Source} from '../scripts/ga4-source-contract.mjs';
import {restoreUnifiedHours} from '../scripts/unified-hours-source-contract.mjs';
import {restoreGdlFocus} from '../scripts/gdl-focus-source-contract.mjs';
import {restoreSanDiegoOpening} from '../scripts/san-diego-opening-source-contract.mjs';
import {checkGa4Coverage} from '../scripts/sync-ga4.mjs';

const root = new URL('../', import.meta.url).pathname;
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');

test('the GA4 release changes only its exact authorized patches and retains complete historical byte guards', () => {
  const contract = JSON.parse(read('scripts/ga4-source-patches.json'));
  for (const [file, entry] of Object.entries(contract.files)) {
    const source = restoreUnifiedHours(file, restoreGdlFocus(file, restoreSanDiegoOpening(file, read(file))));
    assert.equal(hash(source), entry.afterSha256, file);
    assert.equal(hash(restoreGa4Source(file, source)), entry.baselineSha256, file);
    assert.notEqual(hash(restoreGa4Source(file, source + 'unapproved change')), entry.baselineSha256);
    assert.throws(() => restoreGa4Source(file, source + entry.patches.at(-1).after), /GA4 patch/);
  }
  const manifest = JSON.parse(read('scripts/public-manifest.json'));
  assert.equal(checkGa4Coverage(root).measuredPages, manifest.pages.length - 1);
});

test('the served consent bundle matches its current owners and the final notice has no draft or invented fields', () => {
  const manifest = JSON.parse(read('scripts/public-manifest.json'));
  assert.doesNotMatch(JSON.stringify(manifest), /scripts\/analytics|review-analytics|ga4-consent-controller/);
  const notice = read('aviso-de-privacidad.html');
  assert.doesNotMatch(notice, /\{PENDIENTE|Proponemos incorporar|sujeto a aprobación|integración está apagada|Propuesta local/);
  assert.match(notice, /Rechazar desactiva GA4; Umami continúa/);
  assert.match(notice, /datos de usuarios durante 14 meses/);
  assert.match(notice, /privacidad@sin-yolanda\.com/);
  assert.doesNotMatch(notice, /Responsable del tratamiento:|razón social responsable/);
  assert.doesNotMatch(read('assets/js/ga4-consent.js'), /sy:site-action|sy:branch-action/);
  assert.doesNotMatch(read('404.html'), /ga4-consent|googletagmanager/);
});
