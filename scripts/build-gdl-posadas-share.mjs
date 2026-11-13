// Authorized, isolated Posadas preview. Never publish this artifact to Cloudflare Pages.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildExpandedPosadas} from './build-gdl-posadas-expanded.mjs';
import {detailPath,detailFile} from './review/gdl-posadas-expanded.mjs';

const root=resolve(import.meta.dirname,'..');
export const shareOrigin='https://posadas-sy.187.77.220.209.sslip.io';
export function preparePosadasShareHtml(source,route='/guadalajara') {
  assert.ok(['/guadalajara',detailPath].includes(route),'Only the two reviewed Posadas routes can remain on this host');
  let html=source.replace(/<script\b[^>]*src="[^"]*(?:site-analytics|site-measurement|ga4-consent|umami|webmcp)[^"]*"[^>]*>\s*<\/script>/g,'');
  html=html.replace(/<meta\b[^>]*name="robots"[^>]*>/g,'');
  html=html.replace(/<link\b[^>]*href="\/discovery\.json"[^>]*>/g,'');
  html=html.replace(/href="(\/[^"<>]*)"/g,(whole,href)=>/^\/(?:assets|images|fonts|_astro)\//.test(href)||/^\/guadalajara(?:\/posadas)?\/?(?:#.*)?$/.test(href)?whole:`href="https://sin-yolanda.com${href}"`);
  html=html.replace(/<title>[^<]*<\/title>/,'<title>Posadas · Sin Yolanda Guadalajara · Vista previa</title>');
  html=html.replace(/(<meta property="og:title" content=")[^"]*/, '$1Posadas en Sin Yolanda Guadalajara · Vista previa');
  html=html.replace(/(<meta property="og:image" content=")[^"]*/,`$1${shareOrigin}/assets/review-gdl/gdl-posadas-amigas-1600.webp`);
  html=html.replace(/(<meta property="og:url" content=")[^"]*/,`$1${shareOrigin}${route}`);
  if(!html.includes('property="og:image"'))html=html.replace('</head>',`<meta property="og:type" content="website"><meta property="og:title" content="Posadas en Sin Yolanda Guadalajara · Vista previa"><meta property="og:url" content="${shareOrigin}${route}"><meta property="og:image" content="${shareOrigin}/assets/review-gdl/gdl-posadas-amigas-1600.webp"></head>`);
  html=html.replace('</head>','<meta name="robots" content="noindex,nofollow,noarchive"></head>');
  assert.doesNotMatch(html,/<script\b[^>]*src="[^"]*(?:site-analytics|site-measurement|ga4-consent|umami|webmcp)/);
  return html;
}
export function buildPosadasShare(name) {
  assert.match(name??'',/^posadas-share-[a-z0-9-]+$/,'Use a fresh, named Posadas preview artifact');
  assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:root,encoding:'utf8'}).trim(),'','Share only committed, clean source');
  const out=resolve(root,'.artifacts',name);
  buildExpandedPosadas(resolve(out,'public'));
  const report=JSON.parse(readFileSync(resolve(out,'release.json'),'utf8'));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const keep=new Set(['guadalajara.html',detailFile,'404.html']);
  for(const file of Object.keys(report.hashes)) {
    const path=resolve(out,'public',file);
    if((file.endsWith('.html')&&!keep.has(file))||file==='sitemap.xml'||file==='discovery.json') {
      unlinkSync(path);delete report.hashes[file];continue;
    }
    if(file.endsWith('.html'))writeFileSync(path,preparePosadasShareHtml(readFileSync(path,'utf8'),file===detailFile?detailPath:'/guadalajara'));
    report.hashes[file]=hash(readFileSync(path));
  }
  writeFileSync(resolve(out,'public/robots.txt'),'User-agent: *\nDisallow: /\n');
  report.hashes['robots.txt']=hash(readFileSync(resolve(out,'public/robots.txt')));
  report.fileCount=Object.keys(report.hashes).length;
  report.publicDigest=hash(JSON.stringify(report.hashes));
  report.audience='shared-posadas-review';
  report.localOnly=false;
  report.shareReview={officialSite:false,origin:shareOrigin,route:'/guadalajara#posadas',detailRoute:detailPath,analyticsDisabled:true,contactEnabled:false,sourceNotesExcluded:true};
  writeFileSync(resolve(out,'release.json'),JSON.stringify(report,null,2)+'\n');
  return {directory:out,commit:report.commit,files:report.fileCount,digest:report.publicDigest};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildPosadasShare(process.argv[2])));
