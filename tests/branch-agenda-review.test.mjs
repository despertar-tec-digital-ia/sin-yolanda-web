import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { integrateAgenda, projectBranch, renderBranchAgenda } from '../scripts/editorial/branch-agenda.mjs';

const data = JSON.parse(readFileSync(new URL('../scripts/editorial/front-b-review.json', import.meta.url)));
const registry = JSON.parse(readFileSync(new URL('../scripts/editorial/front-b-sources.json', import.meta.url)));
const render = (id, language = 'es') => renderBranchAgenda({ id, branch: data.branches[id], registry, language, asOf: data.observedOn });

test('uncertain source conflicts and unconfirmed calendar recurrence remain in editorial review', () => {
  const results = Object.entries(data.branches).map(([id]) => render(id));
  assert.equal(results.flatMap(result => result.visible).length, 14);
  assert.equal(results.flatMap(result => result.held).length, 12);
  for (const { html, held, visible } of results) {
    for (const unit of held) assert.ok(!html.includes('data-record="' + unit.id + '"'));
    for (const unit of visible) assert.equal(unit.publicationEnabled, false);
  }
  assert.ok(!render('san-antonio').html.includes('Don’t Cry'));
  assert.ok(!render('the-woodlands').html.includes('Don’t Cry'));
  assert.ok(!render('el-paso').html.includes('Ladies Night'));
});

test('two Pinta functions share one artwork and keep their separate dates and tickets', () => {
  const { html } = render('houston');
  assert.equal((html.match(/src="[^"]*hu-pinta-provider/g) || []).length, 1);
  for (const id of ['houston-pinta-canta-20261014', 'houston-pinta-20261028', 'houston-jorge-mariana-20261113']) assert.equal((html.match(new RegExp('data-record="' + id + '"', 'g')) || []).length, 1);
  const pintaTickets = registry.tickets.filter(ticket => ticket.id.startsWith('tickets-pinta'));
  for (const ticket of pintaTickets) assert.equal(html.split('href="' + ticket.url + '"').length - 1, 1);
  assert.ok(html.includes('datetime="2026-10-14"') && html.includes('datetime="2026-10-28"'));
});

test('ticket actions require a verified exact destination, separately from an announced platform', () => {
  const houston = render('houston'), sa = render('san-antonio');
  for (const result of [houston, sa]) for (const held of result.heldActions) {
    const ticket = registry.tickets.find(ticket => ticket.id === held.action);
    assert.equal(ticket.linkVerification.platformAnnouncedByBranch, true);
    assert.equal(ticket.linkVerification.exactDestinationConfirmed, false);
    assert.ok(!result.html.includes(ticket.url));
  }
  assert.equal(houston.heldActions.length + sa.heldActions.length, 2);
  const unconfirmed = structuredClone(registry);
  for (const ticket of unconfirmed.tickets) ticket.linkVerification.exactDestinationConfirmed = false;
  const blocked = renderBranchAgenda({ id: 'houston', branch: data.branches.houston, registry: unconfirmed, asOf: data.observedOn });
  assert.equal((blocked.html.match(/class="sy-agenda-action"/g) || []).length, 0);
  assert.equal(blocked.heldActions.length, 3);
});

test('external venue, invitation and unknown admission cannot become branch reservation actions', () => {
  const sa = render('san-antonio'), tw = render('the-woodlands'), ep = render('el-paso');
  assert.match(sa.html, /Fuera de la cantina[\s\S]*K\.O\.P\. Sports &amp; Entertainment Center/);
  assert.ok(!sa.html.includes('sa-jorge-DeaxTe3hV7k.jpg'), 'Short-lived pre-sale poster withheld');
  assert.match(tw.html, /Conroe[\s\S]*Solo por invitación/);
  assert.ok(![sa, tw, ep].some(result => /opentable|Reservar|Gratis|sold out/i.test(result.html)));
  assert.ok(!ep.html.includes('eventbrite.com'));
  assert.ok(!ep.html.includes('Horario propio por confirmar'));
  assert.equal((ep.html.match(/desde las 10/gi) || []).length, 1);
});

test('ES and EN use the same records and verified destinations with no invented event times', () => {
  for (const [id] of Object.entries(data.branches)) {
    const es = render(id).html, en = render(id, 'en').html;
    const records = html => [...html.matchAll(/data-record="([^"]+)"/g)].map(match => match[1]);
    const links = html => [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(records(es), records(en)); assert.deepEqual(links(es), links(en));
    assert.ok(!/undefined|null|\{PENDIENTE\}/.test(es + en));
    assert.ok(!en.includes('condiciones') && !en.includes('invitada especial'));
  }
  const future = projectBranch(data.branches.houston, '2026-10-29');
  assert.ok(!future.visible.some(unit => unit.id.startsWith('houston-pinta')));
});

test('integration replaces legacy snapshot and event emitter once, preserving surrounding content', () => {
  for (const [id] of Object.entries(data.branches)) for (const language of ['es', 'en']) {
    const file = language === 'es' ? '../' + id + '.html' : '../en/' + id + '/index.html';
    const baseline = readFileSync(new URL(file, import.meta.url), 'utf8');
    const integrated = integrateAgenda(baseline, id, render(id, language).html, language);
    assert.equal((integrated.match(new RegExp('id="programacion-' + id + '"', 'g')) || []).length, 1);
    assert.ok(!integrated.includes('data-programming-snapshot='));
    assert.ok(!integrated.includes('data-programming-action'));
    const extract = (html, name) => html.match(new RegExp('<section [^>]*id="' + name + '"[^>]*>[\\s\\S]*?</section>'))?.[0];
    for (const name of [id, 'mesa', 'visita-' + id, ...(id === 'houston' ? ['catering-houston'] : [])]) {
      assert.ok(extract(baseline, name)); assert.equal(extract(integrated, name), extract(baseline, name), name);
    }
    assert.equal(integrated.slice(integrated.indexOf('<footer')), baseline.slice(baseline.indexOf('<footer')));
  }
});
