import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSocialSelection,renderSocialFeed,integrateSocialFeed} from '../scripts/review/social-feed.mjs';

const fixture = () => ({version:1,reviewOnly:true,branch:'houston',profile:'sinyolandahouston',generatedAt:'2026-11-04T00:00:00Z',items:[{
  id:'examplePost',branch:'houston',origin:'ghl',accountId:'6acfe61478e7110cac2c9fb6_uWMoUoRh3GNepEFH28Vn_17841436324015470_profile',status:'published',deleted:false,
  permalink:'https://www.instagram.com/reel/examplePost/',publishedAt:'2026-10-28T18:00:00Z',kind:'reel',category:'ambience',
  title:{es:'Una noche <especial>',en:'A special night'},alt:{es:'Gente cantando',en:'People singing'},
  media:[400,800].map(width=>({file:`examplePost-${width}.webp`,width,height:width,bytes:50000,sha256:'a'.repeat(64)}))
}]});

test('foreign branches, drafts and withdrawn pieces cannot cross the public boundary',()=>{
  for (const patch of [{accountId:'another-branch'},{branch:'el-paso'},{status:'draft'},{status:'scheduled'},{deleted:true},{category:'dated-event'},{category:'offer'}]) {
    const s=fixture();Object.assign(s.items[0],patch);assert.throws(()=>validateSocialSelection(s));
  }
  const s=fixture();s.reviewOnly=false;assert.throws(()=>validateSocialSelection(s));
});
test('reject duplicate posts, foreign links and path traversal',()=>{
  const duplicate=fixture();duplicate.items.push(structuredClone(duplicate.items[0]));assert.throws(()=>validateSocialSelection(duplicate));
  for(const url of ['https://example.com/reel/examplePost/','https://www.instagram.com/reel/anotherPost/','https://name:password@www.instagram.com/reel/examplePost/','javascript:alert(1)']) {
    const s=fixture();s.items[0].permalink=url;assert.throws(()=>validateSocialSelection(s));
  }
  const s=fixture();s.items[0].media[0].file='../../secret.webp';assert.throws(()=>validateSocialSelection(s));
});
test('chronological order is stable without mutating the editorial selection',()=>{
  const s=fixture(),newer=structuredClone(s.items[0]);
  newer.id='newerPost';newer.permalink='https://www.instagram.com/reel/newerPost/';newer.publishedAt='2026-10-29T18:00:00Z';
  newer.media.forEach(m=>m.file=m.file.replace('examplePost','newerPost'));
  s.items.push(newer);const html=renderSocialFeed(s);
  assert.ok(html.indexOf('https://www.instagram.com/reel/newerPost/')<html.indexOf('https://www.instagram.com/reel/examplePost/'));
  assert.equal(s.items[0].id,'examplePost');
});
test('English navigation and responsive source declarations stay valid',()=>{
  const s=fixture(),html=renderSocialFeed(s,'en');
  assert.ok(html.includes('Houston Instagram · opens in a new tab'));assert.ok(!html.includes('Instagram de Houston'));
  s.items[0].media[1].width=400;assert.throws(()=>validateSocialSelection(s));
});
test('manual native selection cannot masquerade as API coverage or another branch',()=>{
  const s=fixture();Object.assign(s.items[0],{origin:'instagram-visible',author:'sinyolandahouston',observedAt:'2026-11-04T01:00:00Z'});
  assert.throws(()=>validateSocialSelection(s)); delete s.items[0].accountId;validateSocialSelection(s);
  s.items[0].author='sinyolandaelpaso';assert.throws(()=>validateSocialSelection(s));
});
test('projection escapes editorial text and emits only public presentation fields',()=>{
  const s=fixture();s.items[0].unrelatedPrivateMetadata='DO_NOT_SERVE';
  const html=renderSocialFeed(s);assert.ok(html.includes('&lt;especial&gt;'));assert.ok(!html.includes('DO_NOT_SERVE'));
  assert.ok(!html.includes(s.items[0].accountId));assert.ok(!html.includes('autoplay'));assert.ok(!html.includes('<script'));
  assert.equal((html.match(/<article /g)||[]).length,1);
});
test('overlay is inserted once before Catering, leaving the existing agenda and hero intact',()=>{
  const html='<html><head></head><body><main><section id="hero">Original hero</section><section id="programacion-houston">Original agenda</section><div><section class="bct">Catering</section></div></main></body></html>';
  for(const language of ['es','en']) {
    const result=integrateSocialFeed(html,fixture(),language);
    assert.ok(result.includes('<section id="hero">Original hero</section>'));assert.ok(result.includes('<section id="programacion-houston">Original agenda</section>'));
    assert.ok(result.indexOf('id="instagram-houston"')<result.indexOf('<div><section class="bct"'));
    assert.throws(()=>integrateSocialFeed(result,fixture(),language));
  }
});
