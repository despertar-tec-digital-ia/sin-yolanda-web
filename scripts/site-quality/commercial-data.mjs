// Derive public directory destinations from existing Restaurant identities; never sync GBP phones blindly.
import assert from 'node:assert/strict';

const dataAsset = 'assets/js/public-data.js';
function registry(source) {
  assert.equal(source.split('window.SY_DATA =').length, 2, 'Use the existing public registry');
  const start = source.indexOf('=') + 1, end = source.indexOf('\nif (window.SY_OCTOBER_HOURS)');
  assert.ok(end > start, 'Public registry boundary changed');
  return {start, end, value: JSON.parse(source.slice(start, end).trim().replace(/;$/, ''))};
}
function restaurants(pages) {
  const identities = new Map();
  for (const [file, html] of pages) {
    for (const [, content] of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      const document = JSON.parse(content);
      for (const node of document['@graph'] ?? [document]) {
        if (![].concat(node['@type'] ?? []).includes('Restaurant')) continue;
        const identity = node['@id'];
        assert.ok(identity?.startsWith('https://sin-yolanda.com/') && identity.endsWith('#restaurant'), 'Expected a published Restaurant identity');
        const previous = identities.get(identity);
        if (previous) {
          assert.equal(node.telephone, previous.node.telephone, file + ': phone differs across languages');
          assert.deepEqual(node.address, previous.node.address, file + ': address differs across languages');
          if (node.url === identity.split('#')[0]) previous.node = node;
        } else identities.set(identity, {node, files: []});
        identities.get(identity).files.push(file);
      }
    }
  }
  return identities;
}

export function projectCommercialData({pages, read} = {}) {
  const identities = restaurants(pages), source = read(dataAsset), data = registry(source), updated = [];
  for (const branch of data.value.branches.filter(branch => branch.status === 'active')) {
    const path = branch.page.replace(/\.html$/, ''), canonical = 'https://sin-yolanda.com/' + path;
    const restaurant = identities.get(canonical + '#restaurant')?.node;
    assert.ok(restaurant && restaurant.url === canonical, 'Resolve the published branch identity before changing its directory URL');
    if (branch.website !== canonical) {
      updated.push({branch: branch.id, from: branch.website, to: canonical});
      branch.website = canonical;
    }
  }
  const files = new Map();
  if (updated.length) files.set(dataAsset, source.slice(0, data.start) + ' ' + JSON.stringify(data.value, null, 2) + ';' + source.slice(data.end));
  return {files, changes: [...files.keys()].map(file => ({file, kind: 'canonical-commercial-directory'})),
    metadata: {version: 1, directoryUrls: updated, phoneChanges: 0, addressChanges: 0, googleChangesApplied: false}};
}

export function inspectCommercialData({pages, read} = {}) {
  try {
    const identities = restaurants(pages), data = registry(read(dataAsset)).value;
    const discovery = JSON.parse(read('discovery.json')), active = data.branches.filter(branch => branch.status === 'active');
    assert.equal(identities.size, active.length, 'All operating branches need one shared Restaurant identity');
    const profiles = active.map(branch => {
      const url = 'https://sin-yolanda.com/' + branch.page.replace(/\.html$/, '');
      const record = identities.get(url + '#restaurant');
      assert.ok(record, branch.id + ': missing Restaurant');
      const found = discovery.locations.filter(item => item.id === branch.id);
      assert.equal(found.length, 1, branch.id + ': discovery must have one identity');
      assert.equal(found[0].url, url); assert.equal(branch.website, url, branch.id + ': stale directory destination');
      assert.equal(branch.phoneIntl, record.node.telephone, branch.id + ': public phone differs');
      assert.equal(found[0].telephone, record.node.telephone, branch.id + ': discovery phone differs');
      assert.deepEqual(found[0].address, record.node.address, branch.id + ': discovery address differs');
      for (const file of record.files) {
        const phones = [...new Set([...pages.get(file).matchAll(/href="tel:([^"]+)"/g)].map(match => match[1]))];
        assert.deepEqual(phones, [record.node.telephone], file + ': visible phone differs');
      }
      return {branch: branch.id, url, telephone: record.node.telephone, address: record.node.address, pages: record.files};
    });
    return {passed: true, profiles, branches: active.length, googleChangesApplied: false};
  } catch (error) {return {passed: false, error: error.message};}
}
