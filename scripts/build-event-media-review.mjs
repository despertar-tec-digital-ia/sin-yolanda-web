import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';
import {projectEventMedia,mediaConfig} from './editorial/event-media.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
export function buildEventMediaReview(destination,{now=new Date().toISOString()}={}) {
  assert.equal(mediaConfig.publicationEnabled,false,'Use the ordinary build after approval');
  const output=resolve(destination);
  assert.ok(output.startsWith(resolve(root,'.artifacts')+'/'),'Local review only');
  const baseline=packagePublic({root,destination:output,audience:'review',now});
  const files=new Map(Object.keys(baseline.hashes).filter(file=>file.endsWith('.html')).map(file=>[file,readFileSync(resolve(output,file),'utf8')]));
  const projection=projectEventMedia(root,files,now,{review:true});
  const changed=[];
  for(const [file,content] of files)if(content!==readFileSync(resolve(output,file),'utf8')) {
    writeFileSync(resolve(output,file),content);changed.push(file);
  }
  for(const file of Object.keys(mediaConfig.files)) {
    mkdirSync(dirname(resolve(output,file)),{recursive:true});copyFileSync(resolve(root,file),resolve(output,file));
  }
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const paths=[...new Set([...Object.keys(baseline.hashes),...Object.keys(mediaConfig.files)])].sort();
  const hashes=Object.fromEntries(paths.map(file=>[file,hash(readFileSync(resolve(output,file)))]));
  const report={...baseline,audience:'review',publicationEnabled:false,fileCount:paths.length,hashes,publicDigest:hash(JSON.stringify(hashes)),eventMedia:projection.metadata,changedBaseFiles:changed};
  writeFileSync(resolve(dirname(output),'release.json'),JSON.stringify(report,null,2)+'\n');
  return {output,changedBaseFiles:changed,fileCount:paths.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildEventMediaReview(process.argv[2],{now:process.argv[3]})));
