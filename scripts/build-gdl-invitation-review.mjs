// Local visual revision; publication approval and production owners remain untouched.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic,publicSourceDigest,projectRoot as root} from './package-public.mjs';
import {elementRange} from './editorial/public-agenda.mjs';
import {loadGdlApproval} from './editorial/gdl-approved.mjs';
import {projectGdlHours} from './unified-hours-source-contract.mjs';
import {renderGdlAgenda} from './review/gdl-invitation-agenda.mjs';
import {whatsappIcon as oldIcon,contestPath} from './editorial/gdl-contest-config.mjs';
import {whatsappIcon} from './review/gdl-invitation-config.mjs';
import {renderContestFooter} from './review/gdl-contest-footer.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function arrangeInvitation(html){
 const promoted=[];
 for(const id of ['agenda-san-ignacio-canta','agenda-san-ignacio-solteras']){const part=elementRange(html,'section',id);if(part){promoted.push(part.html);html=html.slice(0,part.start)+html.slice(part.end);}}
 return html.replace(/(<h2 id="programacion-san-ignacio-title")[^>]*>/,'$1 class="sy-agenda-sr">').replace('</h2>','</h2>'+promoted.join('\n'));
}
export function buildInvitationReview({destination,now=new Date().toISOString()}={}){
 const out=resolve(destination||''),within=relative(resolve(root,'.artifacts'),out);
 assert.ok(destination&&within&&!within.startsWith('..')&&!isAbsolute(within)&&!existsSync(out),'Fresh local artifact required');
 const base=packagePublic({destination:out,audience:'review',now});
 const config=loadGdlApproval(root),instant=Date.parse(now);
 const windows=config.approval.records.filter(r=>instant>=Date.parse(r.publishFrom)&&(!r.expiresAt||instant<Date.parse(r.expiresAt)));
 const files=new Set(Object.keys(base.hashes));
 const write=(path,value)=>{mkdirSync(dirname(resolve(out,path)),{recursive:true});writeFileSync(resolve(out,path),value);files.add(path);};
 let branch=readFileSync(resolve(out,'guadalajara.html'),'utf8');
 const range=elementRange(branch,'section','programacion-san-ignacio');assert.ok(range);
 const agenda=projectGdlHours(arrangeInvitation(renderGdlAgenda({records:config.records,visibleIds:windows.map(r=>r.id),windows})));
 branch=branch.slice(0,range.start)+agenda+branch.slice(range.end);
 branch=branch.replaceAll(oldIcon,whatsappIcon)
  .replace('/assets/css/gdl-focus.css?v=20261019-gdl-focus','/assets/review-gdl/gdl-invitation.css?v=20261019-gdl-invitation')
  .replace('content="index,follow,max-image-preview:large"','content="noindex,nofollow"');
 write('guadalajara.html',branch);
 const detail=contestPath.slice(1)+'index.html';
 let contest=readFileSync(resolve(out,detail),'utf8').replaceAll(oldIcon,whatsappIcon).replace('content="index,follow,max-image-preview:large"','content="noindex,nofollow"');
 assert.equal((contest.match(/<footer\b/g)||[]).length,1,'One contest footer expected');
 contest=contest.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/,renderContestFooter())
  .replace('</head>','<link rel="stylesheet" href="/assets/review-gdl/gdl-contest-footer.css?v=20261019-gdl-footer"></head>');
 write(detail,contest);
 write('assets/review-gdl/gdl-invitation.css',readFileSync(resolve(root,'scripts/review/gdl-invitation.css')));
 write('assets/review-gdl/gdl-contest-footer.css',readFileSync(resolve(root,'scripts/review/gdl-contest-footer.css')));
 write('licenses/bootstrap-icons.txt',readFileSync(resolve(root,'licenses/bootstrap-icons.txt')));
 const hashes=Object.fromEntries([...files].sort().map(file=>[file,hash(readFileSync(resolve(out,file)))]));
 const {agenda:baseAgenda,publicDigest:baseDigest,...metadata}=base;
 const report={...metadata,audience:'local-gdl-invitation-review',publicationEnabled:false,baseAgenda,baseDigest,fileCount:files.size,hashes,publicDigest:publicSourceDigest(hashes)};
 writeFileSync(resolve(out,'../release.json'),JSON.stringify(report,null,2)+'\n');
 return {path:out,fileCount:files.size,publicationEnabled:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildInvitationReview({destination:process.argv[2],now:process.argv[3]})));
