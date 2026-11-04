// Authorized isolated review host only. Never deploy this package to the official site.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicSourceDigest} from './package-public.mjs';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
const name=process.argv[2];assert.match(name??'',/^social-feed-review-share-[a-z0-9-]+$/);
execFileSync(process.execPath,[resolve(root,'scripts/build-social-feed-review.mjs'),resolve(root,'review/social-feed-houston'),name],{cwd:root,stdio:'inherit'});
const directory=resolve(root,'.artifacts',name),publicRoot=resolve(directory,'public');
const report=JSON.parse(readFileSync(resolve(directory,'release.json'),'utf8'));
assert.equal(report.dirty,false,'Only a clean committed source can be shared');
const banner='<aside class="sy-review-notice" aria-label="Versión de prueba"><span>Prueba para revisión · Instagram Houston<small>Selección editorial · Sin sincronización automática</small></span><a href="https://sin-yolanda.com/houston" target="_blank" rel="noopener noreferrer">Sitio oficial</a></aside>';
const css='<style data-share-review>.sy-review-notice{position:fixed;bottom:0;left:0;right:0;z-index:2147483000;background:#fff4de;color:#30201c;border-top:1px solid #30201c44;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:10px 24px;font:14px/1.4 Georgia,serif}.sy-review-notice small{display:block;font-size:12px}.sy-review-notice a{color:inherit;min-height:44px;display:flex;align-items:center;text-underline-offset:3px}.sy-review-notice a:focus-visible{outline:3px solid #8b1820;outline-offset:3px}body{padding-bottom:80px}@media(max-width:480px){.sy-review-notice{padding:8px 12px;font-size:12px;gap:12px}.sy-review-notice small{font-size:11px}}</style>';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const file of Object.keys(report.hashes).filter(file=>file.endsWith('.html'))){
 const path=resolve(publicRoot,file);let html=readFileSync(path,'utf8');
 // No analytics or form collection is required to review a visual proposal.
 html=html.replace(/<script\b[^>]*src="[^"]*(?:site-analytics|site-measurement|ga4-consent|umami)[^"]*"[^>]*>\s*<\/script>/g,'');
 html=html.replace('</head>',css+'<meta name="robots" content="noindex,nofollow"></head>').replace('</body>',banner+'</body>');
 writeFileSync(path,html);report.hashes[file]=hash(readFileSync(path));
}
writeFileSync(resolve(publicRoot,'robots.txt'),'User-agent: *\nDisallow: /\n');
report.hashes['robots.txt']=hash(readFileSync(resolve(publicRoot,'robots.txt')));
report.publicDigest=publicSourceDigest(report.hashes);
report.shareReview={officialSite:false,sourceCommit:report.commit,scope:'Houston Instagram visual review',notice:true,automatedFeed:false,analyticsDisabled:true};
writeFileSync(resolve(directory,'release.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({directory,commit:report.commit,files:report.fileCount,digest:report.publicDigest,shareReview:report.shareReview}));
