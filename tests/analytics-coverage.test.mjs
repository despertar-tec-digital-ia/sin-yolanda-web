import { measurementHarness as harness } from './helpers/measurement-harness.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import vm from 'node:vm';
import { analyticsAsset, analyticsExclusions, checkAnalyticsCoverage, syncSiteAnalyticsHtml } from '../scripts/sync-site-analytics.mjs';
import { compileMeasurementContract, readEmbeddedContract } from '../scripts/measurement-contract.mjs';
import {resolve} from 'node:path';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read(analyticsAsset);
const manifest = JSON.parse(read('scripts/public-manifest.json'));

test('all allowed public pages use exactly one versioned shared tracker; 404 is explicitly excluded', () => {
  assert.deepEqual(checkAnalyticsCoverage().exclusions, Object.keys(analyticsExclusions));
  assert.equal(checkAnalyticsCoverage().measuredPages, manifest.pages.length - 1);
});

test('the current public graph has exactly one shared click emitter and no competing native emitter', () => {
  for (const page of manifest.pages) {
    const html = read(page);
    if (!/data-branch="/.test(html)) continue;
    const visited = new Set();
    const visit = path => {
      if (visited.has(path)) return;
      visited.add(path);
      const code = read(path);
      for (const [, dependency] of code.matchAll(/\bimport\s*["']([./][^"']+\.js(?:\?[^"']*)?)["']/g)) {
        const clean=dependency.split('?')[0];visit(clean.startsWith('/')?clean.slice(1):posix.join(posix.dirname(path),clean));
      }
    };
    for (const [, path] of html.matchAll(/<script\b[^>]*src="\/([^"?]+\.js)(?:\?[^" ]*)?"[^>]*>/g)) {
      visit(path);
    }
    const emitters = [...visited].filter(path => /umami(?:\?\.)?\.?track/.test(read(path)));
    assert.deepEqual(emitters,[analyticsAsset], page + ' must use only the shared event owner.');
  }
});

test('the pure HTML migration removes the old tracker, keeps inline UI scripts and is idempotent', () => {
  const old = '<html><head><script defer src="https://analytics.despertartdigital.cloud/script.js" data-website-id="cbfa7fb3-230e-405c-a0b8-06c762d6216b"></script><script type="module">window.ui=true</script></head><body>Hero</body></html>';
  const next = syncSiteAnalyticsHtml(old, 'index.html', manifest.assetVersion);
  assert.ok(next.includes('<script type="module">window.ui=true</script>'));
  assert.ok(next.endsWith('<body>Hero</body></html>'));
  assert.equal(next, syncSiteAnalyticsHtml(next, 'index.html', manifest.assetVersion));
  assert.doesNotMatch(next, /analytics\.despertartdigital/);
  assert.match(syncSiteAnalyticsHtml(old, '404.html', manifest.assetVersion), /excluded:404/);
  assert.doesNotMatch(syncSiteAnalyticsHtml(old, '404.html', manifest.assetVersion), /site-analytics\.js/);
  const configured = syncSiteAnalyticsHtml(old.replace('data-website-id=', 'data-before-send="myExistingBeforeSend" data-website-id='), 'index.html', manifest.assetVersion);
  assert.match(configured, /data-before-send="myExistingBeforeSend"/);
  assert.equal(configured, syncSiteAnalyticsHtml(configured, 'index.html', manifest.assetVersion));
  assert.throws(() => syncSiteAnalyticsHtml(old.replace('cbfa7fb3-230e-405c-a0b8-06c762d6216b', 'different-site'), 'index.html', manifest.assetVersion), /different website tracker/);
});

test('the production path allowlist covers every public HTML alias and excludes unknown or demo paths', () => {
  for (const page of manifest.pages.filter(page => !Object.hasOwn(analyticsExclusions, page))) {
    const aliases = page === 'index.html' ? ['/', '/index', '/index.html'] : page.endsWith('/index.html')
      ? ['/' + page, '/' + page.replace(/index\.html$/, ''), '/' + page.replace(/\/index\.html$/, '')]
      : ['/' + page, '/' + page.replace(/\.html$/, ''), '/' + page.replace(/\.html$/, '/')];
    for (const path of aliases) assert.equal(harness({ url: 'https://sin-yolanda.com' + path }).scripts.length, 1, page + ': ' + path);
  }
  for (const path of ['/404', '/404.html', '/unknown-person@example.com', '/dashboard', '/maricarmen', '/api/private', '/houston/menu/private']) {
    assert.equal(harness({ url: 'https://sin-yolanda.com' + path }).scripts.length, 0, path);
  }
  for (const origin of ['http://sin-yolanda.com', 'https://sin-yolanda-web.pages.dev', 'http://localhost:8080', 'https://preview.sin-yolanda.com', 'https://sin-yolanda.com.example.org']) {
    assert.equal(harness({ url: origin + '/' }).scripts.length, 0, origin);
  }
  assert.equal(harness({ url: 'https://www.sin-yolanda.com/houston' }).scripts.length, 1);
});

test('loader respects DNT, Umami disable storage, and repeated execution without changing visual elements', () => {
  for (const dnt of ['1', 'yes']) assert.equal(harness({ dnt }).scripts.length, 0);
  assert.equal(harness({ disabled: '1' }).scripts.length, 0);
  assert.equal(harness({ gpc: true }).scripts.length, 0);
  const state = harness();
  state.runAgain();
  assert.equal(state.scripts.length, 1);
  const script = state.scripts[0];
  assert.equal(script.async, true);
  assert.equal(script.referrerPolicy, 'origin');
  assert.deepEqual(script.attributes, {
    'data-website-id': 'cbfa7fb3-230e-405c-a0b8-06c762d6216b',
    'data-domains': 'sin-yolanda.com,www.sin-yolanda.com',
    'data-do-not-track': 'true', 'data-exclude-search': 'true', 'data-exclude-hash': 'true',
    'data-before-send': 'sySiteAnalyticsSanitize',
  });
  assert.doesNotMatch(source, /googletagmanager|gtag|G-[A-Z0-9]+|innerHTML|classList|style\./);
});

test('beforeSend strips URL/referrer queries, hash, title and arbitrary event metadata', () => {
  const state = harness({ url: 'https://sin-yolanda.com/houston?email=person@example.com&utm_campaign=free#private' });
  const payload = state.window.sySiteAnalyticsSanitize('event', {
    url: '/houston?email=person@example.com#private', title: 'person@example.com',
    referrer: 'https://www.sin-yolanda.com/locations?secret=private#private',
    language: 'en-US', screen: '1440x900', name: 'reservation_click',
    data: { action: 'reservation_click', branch: 'houston', language: 'en', email: 'person@example.com', href: 'tel:1234', label: 'My name' },
    email: 'person@example.com',
  });
  assert.equal(payload.url, '/houston');
  assert.equal(payload.title, 'Sin Yolanda');
  assert.equal(payload.referrer, 'https://www.sin-yolanda.com/locations');
  assert.deepEqual(Object.keys(payload.data).sort(), ['action', 'branch', 'entry_referrer', 'landing_path', 'language', 'page_branch', 'page_language', 'schema_version']);
  assert.doesNotMatch(JSON.stringify(payload), /person|secret|private|email|utm|href|label|[#?]/);
  assert.equal(state.window.sySiteAnalyticsSanitize('event', { referrer: 'https://example.org/person@example.com?x=1' }).referrer, '');
  assert.equal(state.window.sySiteAnalyticsSanitize('event', { referrer: 'javascript:secret' }).referrer, '');
  assert.equal(state.window.sySiteAnalyticsSanitize('event', { name: 'free-text-event', data: {} }), false);
  assert.equal(state.window.sySiteAnalyticsSanitize('event', { name: 'reservation_click', data: { action: 'free text', branch: 'houston', language: 'en' } }), false);
  state.disabled('1');
  assert.equal(state.window.sySiteAnalyticsSanitize('event', {}), false, 'Changing the privacy preference also stops subsequent sends.');
});

test('a pre-existing beforeSend hook remains intact and can veto or adjust a send', () => {
  const veto = () => false;
  const state = harness({ hook: veto });
  assert.equal(state.window.sySiteAnalyticsBeforeSend, veto);
  assert.equal(state.window.sySiteAnalyticsSanitize('event', {}), false);
  const adjust = (_, data) => ({ ...data, referrer: 'https://example.org/secret?email=person@example.com' });
  const configured = harness({ hook: adjust, scriptHook: 'myExistingBeforeSend' });
  assert.equal(configured.window.myExistingBeforeSend, adjust);
  assert.equal(configured.window.sySiteAnalyticsSanitize('event', {}).referrer, '');
});

test('selector clicks send one allowlisted event, never hover/focus or a synthetic filter reset', () => {
  const state = harness();
  const card = new state.Element({ href: '/el-paso', dataset: { venue: '', branchId: 'el-paso' } });
  state.other('pointerenter', card);
  state.other('focus', card);
  assert.equal(state.calls.length, 0);
  const nested = new state.Element({ tag: 'span', parent: card });
  state.click(nested, { ctrlKey: true });
  const common={schema_version:2,page_branch:'group',page_language:'es',landing_path:'/',entry_referrer:'unknown',link_location:'content'};
  assert.deepEqual(state.calls, [['location_select', { branch: 'el-paso', language: 'es', action: 'location_select',...common,destination:'branch' }]]);
  const filter = new state.Element({ tag: 'button', dataset: { venueFilter: 'soon' } });
  state.click(filter, { isTrusted: false });
  assert.equal(state.calls.length, 1);
  state.click(filter);
  assert.deepEqual(state.calls[1], ['location_filter_click', { branch: 'group', language: 'es', action: 'filter_soon',...common,destination:'filter' }]);
  state.click(new state.Element({ dataset: { selectLocation: '' }, href: '#ubicaciones' }));
  assert.equal(state.calls[2][0], 'location_selector_open');
});

test('global CTA coverage keeps destinations native and adds only the bounded public context', () => {
  const state = harness();
  for (const [href, name, branch] of [
    ['/houston?private=true', 'branch_click', 'houston'],
    ['/san-antonio/menu/', 'menu_click', 'san-antonio'],
    ['/catering/', 'catering_click', 'group'],
    ['https://www.opentable.com/restaurant/profile/1484191?ref=1068', 'reservation_click', 'san-antonio'],
    ['https://wa.me/523310186159?text=private', 'reservation_click', 'san-ignacio'],
    ['tel:+13468791675', 'phone_click', 'houston'],
    ['https://www.google.com/maps/dir/?api=1&destination=private', 'directions_click', 'group'],
  ]) {
    const before = state.calls.length;
    state.click(new state.Element({ href }));
    assert.equal(state.calls.length, before + 1);
    assert.equal(state.calls.at(-1)[0], name);
    assert.equal(state.calls.at(-1)[1].branch, branch);
    assert.deepEqual(Object.keys(state.calls.at(-1)[1]).sort(), ['action', 'branch', 'destination', 'entry_referrer', 'landing_path', 'language', 'link_location', 'page_branch', 'page_language', 'schema_version']);
  }
  state.click(new state.Element({ tag: 'button', dataset: { langBtn: 'en' } }));
  assert.equal(state.calls.at(-1)[1].language, 'en');
  state.click(new state.Element({ href: 'https://example.org/private?email=person@example.com' }));
  assert.equal(state.calls.length, 8, 'Unrelated external links do not become arbitrary analytics labels.');
});

test('existing imported branch handlers still send one event and the shared loader adds none', () => {
  const state = harness({ url: 'https://sin-yolanda.com/houston', body: { branch: 'houston', status: 'open', language: 'es' }, branchHandler: true });
  vm.runInContext(read('_astro/branch-landing.DvYw-im_.js'), state.context);
  for (const [href, classes, event] of [
    ['https://www.opentable.com/r/sin-yolanda-houston', ['hh-reserve'], 'reservation_click'],
    ['/houston/menu/', ['hh-nav-menu'], 'menu_click'],
    ['tel:+13468791675', [], 'phone_click'],
    ['https://www.google.com/maps/dir/?api=1&destination=private', [], 'directions_click'],
  ]) {
    const before = state.calls.length;
    state.click(new state.Element({ href, classes }));
    assert.equal(state.calls.length, before + 1, event + ' must have a single owner.');
    assert.equal(state.calls.at(-1)[0], event);
  }
  const before = state.calls.length;
  state.click(new state.Element({ href: 'https://www.eventbrite.com/e/private', dataset: { programmingAction: 'tickets' } }));
  assert.equal(state.calls.length, before, 'An unregistered ticket URL never becomes an editorial event.');
  state.click(new state.Element({ href: '/catering/', classes: ['bct-action'] }));
  assert.equal(state.calls.at(-1)[0], 'catering_click', 'An uncovered CTA still gets measured on an imported page.');
});

test('delayed or unavailable tracker never blocks navigation and keeps only a bounded action queue', () => {
  const state = harness({ delayed: true });
  const link = new state.Element({ href: '/houston' });
  state.click(link);
  assert.equal(state.calls.length, 0);
  state.ready();
  assert.equal(state.calls.length, 1);
  const capped = harness({ delayed: true });
  for (let i = 0; i < 25; i++) capped.click(new capped.Element({ href: '/houston' }));
  capped.ready();
  assert.equal(capped.calls.length, 20);
  const failed = harness({ delayed: true });
  failed.click(new failed.Element({ href: '/houston' }));
  failed.scripts[0].handlers.error();
  failed.ready();
  assert.equal(failed.calls.length, 0);
});

test('compiled measurement contains only the approved public records and corroborated ticket targets',()=>{
 const catalog=readEmbeddedContract(source);
 assert.deepEqual(catalog,compileMeasurementContract(resolve(import.meta.dirname,'..')));
 assert.equal(Object.keys(catalog.events).length,14);
 assert.equal(Object.values(catalog.events).filter(event=>event.tickets).length,2);
 assert.equal(catalog.events['houston-jorge-mariana-20261113'].tickets,undefined);
 assert.equal(catalog.events['the-woodlands-mes-hispano-20261015'].post,'https://www.instagram.com/p/DefaT9GBok6/');
 assert.equal(catalog.routes['/guadalajara'],'san-ignacio');
 assert.equal(catalog.routes['/san-ignacio/menu'],'san-ignacio');
 assert.equal(catalog.routes['/en/san-antonio/menu'],'san-antonio');
 assert.equal(catalog.trafficCampaigns.length,0,'Editorial campaigns do not prove active traffic campaign codes.');
});

test('agenda art and nested image clicks send exactly one sourced event with its kind and symbolic destination',()=>{
 const state=harness({url:'https://sin-yolanda.com/houston'});
 const agenda=new state.Element({tag:'section',classes:['sy-agenda']});
 const record=new state.Element({tag:'article',dataset:{record:'houston-ladies-weekly'},parent:agenda});
 const link=new state.Element({href:'https://www.instagram.com/reel/DeL7Ly_vyo2/',parent:record});
 const img=new state.Element({tag:'img',parent:link});state.click(img);
 assert.equal(state.calls.length,1);const[name,data]=state.calls[0];
 assert.equal(name,'programming_action_click');assert.equal(data.event_id,'houston-ladies-weekly');
 assert.equal(data.event_kind,'recurring-night');assert.equal(data.destination,'instagram_post');
 assert.equal(data.link_location,'agenda');assert.equal(data.page_branch,'houston');
 assert.ok(!('href'in data));state.auxclick(link);assert.equal(state.calls.length,2);
 state.click(new state.Element({href:'https://www.instagram.com/p/unrelated/',parent:record}));
 assert.equal(state.calls.length,2,'The known record does not authorize arbitrary post destinations.');
 const wrongBranch=new state.Element({tag:'article',dataset:{record:'san-antonio-ladies-weekly'},parent:agenda});
 state.click(new state.Element({href:'https://www.instagram.com/reel/DeL7NjSxiSY/',parent:wrongBranch}));
 assert.equal(state.calls.length,2);
});

test('event payload rejects an invented record, cross-branch id, mismatched action and unconfirmed Jorge tickets',()=>{
 const state=harness({url:'https://sin-yolanda.com/houston'}),base={action:'tickets',branch:'houston',language:'es',destination:'tickets'};
 for(const change of[{event_id:'free-text-person'},{event_id:'san-antonio-jorge-20261114'},{event_id:'houston-jorge-mariana-20261113'}]){
  assert.equal(state.window.sySiteAnalyticsSanitize('event',{name:'programming_action_click',data:{...base,...change}}),false);
 }
 assert.equal(state.window.sySiteAnalyticsSanitize('event',{name:'menu_click',data:base}),false);
 assert.equal(state.window.sySiteAnalyticsSanitize('identify',{data:{id:'private'}}),false);
});

test('registered acquisition labels survive the privacy hook but arbitrary parameters and unregistered campaigns do not',()=>{
 const state=harness({url:'https://sin-yolanda.com/houston?utm_source=instagram&utm_medium=social&utm_campaign=guest-name&email=guest@example.com&fbclid=private#secret',referrer:'https://www.instagram.com/private?email=guest@example.com'});
 const payload=state.window.sySiteAnalyticsSanitize('event',{referrer:'https://www.instagram.com/private?email=guest@example.com'});
 assert.equal(payload.url,'/houston?utm_source=instagram&utm_medium=social');
 assert.equal(payload.data.source,'instagram');assert.equal(payload.data.medium,'social');
 assert.equal(payload.data.entry_referrer,'instagram');assert.equal(payload.data.campaign,undefined);
 assert.equal(payload.referrer,'https://www.instagram.com');
 assert.doesNotMatch(JSON.stringify(payload),/guest|private|secret|fbclid|email|campaign/);
 const duplicate=harness({url:'https://sin-yolanda.com/?utm_source=instagram&utm_source=facebook&utm_medium=social'});
 assert.equal(duplicate.window.sySiteAnalyticsSanitize('event',{}).data.source,undefined);
});

test('internal navigation preserves bounded per-tab acquisition, while an external return and expiry start again',()=>{
 const storage=new Map(),now=1791948000000;
 harness({url:'https://sin-yolanda.com/locations?utm_source=instagram&utm_medium=social',referrer:'https://l.instagram.com/',storage,now});
 const next=harness({url:'https://sin-yolanda.com/houston',referrer:'https://sin-yolanda.com/locations',storage,now:now+1000});
 const view=next.window.sySiteAnalyticsSanitize('event',{});
 assert.equal(view.url,'/houston','No internal URL gains acquisition UTMs.');
 assert.equal(view.data.source,'instagram');assert.equal(view.data.landing_path,'/locations');
 const expired=harness({url:'https://sin-yolanda.com/houston/menu/',referrer:'https://sin-yolanda.com/houston',storage,now:now+1801001});
 assert.equal(expired.window.sySiteAnalyticsSanitize('event',{}).data.source,undefined);
 const returned=harness({url:'https://sin-yolanda.com/houston',referrer:'https://www.google.com/',storage,now:now+2000});
 assert.equal(returned.window.sySiteAnalyticsSanitize('event',{}).data.source,undefined);
 assert.equal(returned.window.sySiteAnalyticsSanitize('event',{}).data.entry_referrer,'google');
});

test('legacy hop is reported as limited referrer evidence, not as a claimed social or QR acquisition',()=>{
 const state=harness({url:'https://sin-yolanda.com/locations',referrer:'https://sinyolandatx.com/'});
 const payload=state.window.sySiteAnalyticsSanitize('event',{});
 assert.equal(payload.data.legacy_hop,'tx');assert.equal(payload.data.entry_referrer,'legacy');
 assert.equal(payload.data.source,undefined);assert.equal(payload.data.medium,undefined);
 const unknown=harness().window.sySiteAnalyticsSanitize('event',{});
 assert.equal(unknown.data.entry_referrer,'unknown');assert.equal(unknown.data.legacy_hop,undefined);
});

test('Guadalajara retains its historic ID and Catering WhatsApp is contact intent',()=>{
 const gdl=harness({url:'https://sin-yolanda.com/guadalajara'});
 gdl.click(new gdl.Element({href:'/san-ignacio/menu/'}));
 assert.equal(gdl.calls[0][1].branch,'san-ignacio');assert.equal(gdl.calls[0][1].page_branch,'san-ignacio');
 const catering=harness({url:'https://sin-yolanda.com/catering'});
 catering.click(new catering.Element({href:'https://wa.me/523310186159?text=private'}));
 assert.equal(catering.calls[0][0],'catering_contact_click');assert.equal(catering.calls[0][1].destination,'whatsapp');
 assert.doesNotMatch(JSON.stringify(catering.calls),/523310186159|private|text=/);
});

test('current language-only branch companion emits no analytics and delayed branch clicks retain one owner',()=>{
 const state=harness({url:'https://sin-yolanda.com/houston',body:{branch:'houston',language:'es'},delayed:true});
 vm.runInContext(read('assets/js/branch-language.js'),state.context);
 state.click(new state.Element({href:'https://www.opentable.com/r/sin-yolanda-houston',classes:['hh-reserve']}));
 assert.equal(state.calls.length,0);state.ready();assert.equal(state.calls.length,1);
 assert.equal(state.calls[0][0],'reservation_click');
});

test('privacy revocation and on-page inactivity discard earlier acquisition without replay',()=>{
 const now=1791948000000,storage=new Map(),state=harness({url:'https://sin-yolanda.com/houston?utm_source=instagram&utm_medium=social',storage,now});
 state.setTime(now+1800001);state.click(new state.Element({href:'/houston/menu/'}));
 assert.equal(state.calls[0][1].source,undefined);
 assert.equal(state.window.sySiteAnalyticsSanitize('event',{}).url,'/houston');
 const revoked=harness({url:'https://sin-yolanda.com/houston?utm_source=instagram',storage,now});
 revoked.disabled('1');assert.equal(revoked.window.sySiteAnalyticsSanitize('event',{}),false);assert.equal(storage.size,0);
 revoked.disabled('');revoked.click(new revoked.Element({href:'/houston/menu/'}));assert.equal(revoked.calls[0][1].source,undefined);
});

test('queued clicks expire and menu language controls retain one event with source and destination languages',()=>{
 const now=1791948000000,state=harness({delayed:true,now});state.click(new state.Element({href:'/houston'}));state.setTime(now+60001);state.ready();assert.equal(state.calls.length,0);
 const menu=harness({url:'https://sin-yolanda.com/san-antonio/menu/'});
 menu.click(new menu.Element({href:'/en/san-antonio/menu/',lang:'en'}));assert.equal(menu.calls.length,1);assert.equal(menu.calls[0][0],'language_switch_click');
 const data=menu.calls[0][1];assert.equal(data.page_language,'es');assert.equal(data.destination_language,'en');
 menu.document.documentElement.lang='en';const payload=menu.window.sySiteAnalyticsSanitize('event',{name:'language_switch_click',data});assert.equal(payload.data.page_language,'es');
});
