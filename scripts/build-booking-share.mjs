// Authorized Houston preview only; this artifact must never replace the official site.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildOpenTableReview} from './opentable-review.mjs';
const root=resolve(import.meta.dirname,'..'),name=process.argv[2];
assert.match(name??'',/^booking-review-share-[a-z0-9-]+$/);
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:root,encoding:'utf8'}).trim(),'','Share only committed, clean source');
const out=resolve(root,'.artifacts',name),report=buildOpenTableReview({root,out});
const publicRoot=resolve(out,'public'),hash=b=>createHash('sha256').update(b).digest('hex');
const keep=new Set(['houston.html','en/houston/index.html','404.html']);
const css='<style data-share-review>.sy-review-notice{position:relative;max-width:1240px;margin:0 auto 20px;background:#fff4de;color:#30201c;border-bottom:1px solid #30201c44;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:8px 20px;font:13px/1.4 Georgia,serif}.sy-review-notice small{display:block;font-size:11px}.sy-review-notice a{color:inherit;min-height:44px;display:flex;align-items:center;text-underline-offset:3px}@media(max-width:480px){.sy-review-notice{padding:8px 12px;font-size:12px;gap:10px}}</style>';
for(const file of Object.keys(report.hashes)){
 const path=resolve(publicRoot,file);
 if(file.endsWith('.html')&&!keep.has(file)){unlinkSync(path);delete report.hashes[file];continue;}
 if(!file.endsWith('.html'))continue;
 let html=readFileSync(path,'utf8');
 html=html.replace(/<script\b[^>]*src="[^"]*(?:site-analytics|site-measurement|ga4-consent|umami|webmcp)[^"]*"[^>]*>\s*<\/script>/g,'');
 html=html.replace(/href="(\/[^"<>]*)"/g,(whole,href)=>/^\/(?:assets|images|fonts|_astro)\//.test(href)||/^\/(?:en\/)?houston\/?(?:#.*)?$/.test(href)?whole:`href="https://sin-yolanda.com${href}"`);
 const en=file.startsWith('en/');
 const notice=`<aside class="sy-review-notice" aria-label="${en?'Test version':'Versión de prueba'}"><span>${en?'Design preview · Houston':'Prueba de diseño · Houston'}<small>${en?'Live OpenTable availability. Do not confirm a booking during this review.':'Disponibilidad real de OpenTable. No confirmes una reserva durante la revisión.'}</small></span><a href="https://sin-yolanda.com/houston" target="_blank" rel="noopener noreferrer">${en?'Official site':'Sitio oficial'}</a></aside>`;
 html=html.replace('</head>',css+'<meta name="robots" content="noindex,nofollow"></head>').replace(file==='404.html'?'</body>':'<div class="sy-booking-inner">',file==='404.html'?notice+'</body>':notice+'<div class="sy-booking-inner">');
 writeFileSync(path,html);report.hashes[file]=hash(readFileSync(path));
}
writeFileSync(resolve(publicRoot,'robots.txt'),'User-agent: *\nDisallow: /\n');
report.hashes['robots.txt']=hash(readFileSync(resolve(publicRoot,'robots.txt')));
report.fileCount=Object.keys(report.hashes).length;
report.publicDigest=hash(JSON.stringify(report.hashes));
report.shareReview={officialSite:false,scope:'Houston ES/EN reservation and motion review',analyticsDisabled:true,notice:true,liveAvailability:true};
writeFileSync(resolve(out,'release.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({directory:out,commit:report.commit,files:report.fileCount,digest:report.publicDigest}));
