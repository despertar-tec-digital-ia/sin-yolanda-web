// Package one local-only design overlay; source pages and production allowlist are never edited.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packagePublic} from './package-public.mjs';
import {projectPosadasDesign,stylePath,photoFiles,photoPath} from './review/gdl-posadas-design.mjs';
import {renderPosadasStructure} from './build-gdl-posadas-outline.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
export function buildPosadasDesign(destination) {
  assert.ok(destination);const out=resolve(destination),where=relative(resolve(root,'.artifacts'),out);
  assert.ok(where&&!where.startsWith('..')&&!isAbsolute(where),'Only a fresh local .artifacts destination');
  assert.ok(!existsSync(out),'Refuse to overwrite an earlier candidate');
  const baseline=packagePublic({root,destination:out,audience:'review',posadas:false});
  const page=resolve(out,'guadalajara.html'),original=readFileSync(page,'utf8');
  writeFileSync(page,projectPosadasDesign(original));
  mkdirSync(dirname(resolve(out,stylePath)),{recursive:true});
  writeFileSync(resolve(out,stylePath),readFileSync(resolve(root,'scripts/review/gdl-posadas-design.css')));
  for(const file of photoFiles)writeFileSync(resolve(out,photoPath(file)),readFileSync(resolve(root,'scripts/review/assets',file)));
  writeFileSync(resolve(out,'revision-posadas.html'),renderPosadasStructure());
  const paths=[...Object.keys(baseline.hashes),stylePath,...photoFiles.map(photoPath),'revision-posadas.html'].sort();
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const hashes=Object.fromEntries(paths.map(file=>[file,hash(readFileSync(resolve(out,file)))]));
  const metadata={...baseline,audience:'local-posadas-design',publicationEnabled:false,
    changedBaseFiles:['guadalajara.html'],fileCount:paths.length,hashes,publicDigest:hash(JSON.stringify(hashes)),
    contactEnabled:false,photo:'GDL business library #4: three friends singing and toasting. Local review only; not identified as an actual posada. Source metadata stays outside the served folder.'};
  writeFileSync(resolve(dirname(out),'release.json'),JSON.stringify(metadata,null,2)+'\n');
  return {output:out,changedBaseFiles:metadata.changedBaseFiles,fileCount:paths.length,publicationEnabled:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildPosadasDesign(process.argv[2])));
