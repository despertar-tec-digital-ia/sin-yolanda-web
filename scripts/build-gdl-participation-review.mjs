// Local proposal only; public owners, event approval and manifest are unchanged.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic,publicSourceDigest,projectRoot as root} from './package-public.mjs';
import {participationBranch} from './review/gdl-participation.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function buildParticipationReview({destination,now=new Date().toISOString()}={}){
 const out=resolve(destination||''),within=relative(resolve(root,'.artifacts'),out);
 assert.ok(destination&&within&&!within.startsWith('..')&&!isAbsolute(within)&&!existsSync(out),'Fresh local artifact required');
 const base=packagePublic({destination:out,audience:'review',now});
 const files=new Set(Object.keys(base.hashes));
 const write=(path,value)=>{mkdirSync(dirname(resolve(out,path)),{recursive:true});writeFileSync(resolve(out,path),value);files.add(path);};
 const extras='<link rel="stylesheet" href="/assets/review-gdl/gdl-participation.css?v=20261021-participation"><script defer src="/assets/review-gdl/gdl-participation.js?v=20261021-participation"></script>';
 for(const [path,project] of [['guadalajara.html',participationBranch]]){
  let page=project(readFileSync(resolve(out,path),'utf8'),{now});
  write(path,page.replace('</head>',extras+'</head>').replace('content="index,follow,max-image-preview:large"','content="noindex,nofollow"'));
 }
 for(const suffix of ['css','js'])write('assets/review-gdl/gdl-participation.'+suffix,readFileSync(resolve(root,'scripts/review/gdl-participation.'+suffix)));
 const hashes=Object.fromEntries([...files].sort().map(file=>[file,hash(readFileSync(resolve(out,file)))]));
 const {agenda:baseAgenda,publicDigest:baseDigest,...metadata}=base;
 writeFileSync(resolve(out,'../release.json'),JSON.stringify({...metadata,audience:'local-gdl-participation-review',publicationEnabled:false,baseAgenda,baseDigest,fileCount:files.size,hashes,publicDigest:publicSourceDigest(hashes)},null,2)+'\n');
 return {path:out,fileCount:files.size,publicationEnabled:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildParticipationReview({destination:process.argv[2],now:process.argv[3]})));
