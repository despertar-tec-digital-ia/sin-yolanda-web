// Validate the explicitly approved pilot. No wildcard rules or user-selected destinations.
import assert from 'node:assert/strict';

export const qrMenuDestination = 'https://sinyolandagdl.com/menu/?utm_source=qr&utm_medium=offline&utm_campaign=menu_guadalajara';
const approvedSources = new Set(['/q/gdl-menu', '/q/gdl-menu/']);

export function parseQrRedirects(source) {
  assert.equal(typeof source, 'string', 'QR redirect source must be text');
  const records = [], seen = new Set();
  for (const line of source.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const fields = text.split(/\s+/);
    assert.equal(fields.length, 3, 'QR rule needs source, destination and explicit status');
    const [path, destination, code] = fields;
    assert.ok(approvedSources.has(path), 'QR rule is outside the approved alias');
    assert.ok(!seen.has(path), 'Duplicate QR redirect source');
    assert.equal(destination, qrMenuDestination, 'QR destination differs from the approved original menu');
    assert.equal(code, '302', 'QR destinations must remain temporary');
    seen.add(path);
    records.push({ source: path, destination, status: 302 });
  }
  assert.equal(records.length, approvedSources.size, 'QR must cover both exact slash variants');
  return records;
}
