import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('assets/js/site.js');
const context = { window: {} };
vm.runInNewContext(read('assets/js/public-data.js'), context);
const data = context.window.SY_DATA;
const block = name => {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, 'Missing renderer: ' + name);
  const end = source.indexOf('\n  function ', start + 1);
  return source.slice(start, end < 0 ? source.length : end);
};
const agenda = (facts = data) => vm.runInNewContext(block('hasAgendaProfile') + block('homeAgenda') + '\nhomeAgenda()', { data: facts });
const home = () => vm.runInNewContext(block('hasAgendaProfile') + block('homeAgenda') + block('homePage') + '\nhomePage()', {
  data, publicHeader: () => '', publicFooter: () => '', openingAnnouncement: () => '', venueShowcase: () => '<section id="ubicaciones"></section>',
});

test('home agenda links only to each active location\'s registered Instagram, not invented events', () => {
  const html = agenda();
  const active = data.branches.filter(branch => branch.status === 'active');
  assert.equal((html.match(/data-agenda-branch=/g) || []).length, active.length);
  for (const branch of active) {
    assert.ok(html.includes(`href="${branch.socialUrl}"`));
    assert.ok(html.includes(`data-agenda-branch="${branch.id}"`));
  }
  assert.doesNotMatch(html, /el-paso|moreno-valley|san-diego|Reservar evento|TODO|CONFIRMAR|Brunch|8:00|Eventbrite/i);
  assert.equal(data.events.length, 0, 'Unverified global events must not enter the public register');
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
});

test('agenda with missing or unsafe social profiles is omitted, not filled with another location', () => {
  for (const socialUrl of ['', 'javascript:alert(1)', 'https://example.com/profile/', 'https://www.instagram.com/p/post-id/', 'https://www.instagram.com/sinyolanda/" onclick="alert(1)']) {
    const facts = structuredClone(data);
    facts.branches.forEach(branch => { branch.socialUrl = socialUrl; });
    assert.equal(agenda(facts), '');
  }
  const facts = structuredClone(data);
  facts.branches.forEach(branch => { branch.status = 'coming-soon'; });
  assert.equal(agenda(facts), '');
});

test('pretexts and birthday CTA use native location selection with no opening modal or default city', () => {
  const html = home();
  const pretexts = html.match(/<section class="section pretextos-section">[\s\S]*?<\/section>/)[0];
  assert.equal((pretexts.match(/href="#ubicaciones"/g) || []).length, 6);
  assert.equal((pretexts.match(/<a class="pretexto-card /g) || []).length, 6);
  assert.doesNotMatch(pretexts, /<button|data-open-modal|apartamos mesa|<span>0\d<\/span>/);
  const birthday = html.match(/<section class="section cumple-section"[\s\S]*?<\/section>/)[0];
  assert.equal((birthday.match(/<a /g) || []).length, 1);
  assert.match(birthday, /href="#ubicaciones" data-select-location>Elegir sucursal/);
  assert.doesNotMatch(birthday, /wa\.me|pastel/);
  assert.doesNotMatch(html, /demo-modal|TODO:|CONFIRMAR CON OPERACIÓN|Programación de ejemplo|Brunch de domingo/);
});

test('booking entries clear only the coming-soon filter and never intercept native links', () => {
  let soon = true, clicks = 0, listener;
  const link = { addEventListener: (name, fn) => { listener = fn; } };
  const document = {
    querySelector: selector => selector.includes('soon') ? (soon ? {} : null)
      : selector.includes('all') ? { click() { clicks++; } } : null,
    querySelectorAll: selector => selector === '[data-select-location]' ? [link] : [],
  };
  vm.runInNewContext(block('bindCommon') + '\nbindCommon()', { document });
  listener({ button: 0, ctrlKey: true, preventDefault() { throw Error('Do not intercept'); } });
  assert.equal(clicks, 0);
  listener({ button: 0, preventDefault() { throw Error('Do not intercept'); } });
  assert.equal(clicks, 1);
  soon = false;
  listener({ button: 0 });
  assert.equal(clicks, 1, 'Keep the chosen country when it is not the soon filter');
});

test('legacy branch pages no longer receive a shared fictitious calendar', () => {
  const branch = data.branches.find(branch => branch.id === 'san-antonio');
  const html = vm.runInNewContext(block('hasAgendaProfile') + block('branchAgenda') + '\nbranchAgenda(branch)', { branch });
  assert.ok(html.includes(`href="${branch.socialUrl}"`));
  assert.doesNotMatch(html, /opentable|event\.date|de ejemplo|Houston|Jue–Sáb/);
  assert.match(block('branchPage'), /\$\{branchAgenda\(branch\)\}/);
  assert.doesNotMatch(block('branchPage'), /data\.events\.map|Programación de ejemplo/);
});
