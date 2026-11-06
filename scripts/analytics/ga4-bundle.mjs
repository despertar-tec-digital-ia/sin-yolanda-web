// Compile the versioned public consent bundle from its single configuration and current contract.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileMeasurementContract } from '../measurement-contract.mjs';

const normalizeRoot = root => {
  if (typeof root !== 'string') return root;
  try { root = decodeURIComponent(root); } catch {}
  return root.replace(/^\/([A-Za-z]:[\\/])/, '$1');
};

export function compileGa4Bundle(root, overrides = {}, measurementContract) {
  const sourceRoot = normalizeRoot(root);
  const read = file => readFileSync(resolve(sourceRoot, file), 'utf8');
  const contract = measurementContract ?? compileMeasurementContract(sourceRoot);
  const config = { ...JSON.parse(read('scripts/analytics/ga4-event-config.json')), ...overrides };
  const adapter = read('scripts/analytics/ga4-event-adapter.mjs');
  assert.equal(adapter.split('export function createGa4EventAdapter').length, 2);
  const scriptJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
  return '(function () {\n"use strict";\n' +
    'window.SY_GA4_CONFIG = Object.freeze(' + scriptJson(config) + ');\n' +
    'window.SY_GA4_CONTRACT = ' + scriptJson(contract) + ';\n' +
    adapter.replace('export function createGa4EventAdapter', 'function createGa4EventAdapter') + '\n' +
    read('scripts/analytics/ga4-consent-controller.js') + '\n}());\n';
}
