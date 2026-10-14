// Explicit one-time adoption; never mutate sources in CI.
import assert from'node:assert/strict';
import{readFileSync,writeFileSync,existsSync}from'node:fs';
import{resolve}from'node:path';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{compileMeasurementContract,contractStart,contractEnd}from'./measurement-contract.mjs';
const root=resolve(import.meta.dirname,'..'),read=file=>readFileSync(resolve(root,file),'utf8');
const file='scripts/measurement-source-patches.json';assert.ok(!existsSync(resolve(root,file)));
const contract={version:1,baseCommit:'08027d92bd5ff9965d82a8a6792f94ea4237495d',files:{}};
function patch(file,before,after){const source=read(file);assert.equal(source.split(before).length-1,1,file);writeFileSync(resolve(root,file),source.replace(before,after));(contract.files[file]??={patches:[]}).patches.push({before,after});}
const tracker='assets/js/site-measurement.js',source=read(tracker),start=source.indexOf(contractStart),end=source.indexOf(contractEnd);
assert.ok(start>=0&&end>start);writeFileSync(resolve(root,tracker),source.slice(0,start+contractStart.length)+'\n'+JSON.stringify(compileMeasurementContract(root))+'\n'+source.slice(end));
const manifestFile='scripts/public-manifest.json',manifest=JSON.parse(read(manifestFile)),version='20261013-measurement-v2';
const renamed=new Map();
for(const prefix of['BranchLanding','BranchLayout']){
  const previous='_astro/'+prefix+'.astro_astro_type_script_index_1_lang.BlqKqRiJ.js';
  const module='import"/assets/js/branch-language.js?v='+version+'";';
  const digest=createHash('sha256').update(module).digest('hex').slice(0,10);
  const next='_astro/'+prefix+'.astro_astro_type_script_index_1_lang.'+digest+'.js';
  writeFileSync(resolve(root,next),module);renamed.set(previous,next);
}
for(const page of manifest.pages){
  const before='assets/js/site-analytics.js?v='+manifest.assetVersions['assets/js/site-analytics.js'];
  if(read(page).includes(before))patch(page,before,'assets/js/site-measurement.js?v='+version);
  for(const[old,next]of renamed)if(read(page).includes('/'+old))patch(page,'/'+old,'/'+next);
}
// Preserve old immutable modules for already-open pages. Current pages use only
// the language-only leaf and the single shared measurement owner.
manifest.assets.push(...renamed.values(),'assets/js/branch-language.js',tracker);manifest.assetVersions[tracker]=version;manifest.assetVersions['assets/js/branch-language.js']=version;
writeFileSync(resolve(root,manifestFile),JSON.stringify(manifest,null,2)+'\n');
const notice='Esta medición no utiliza cookies de seguimiento ni envía nombres, teléfonos, correos, mensajes, búsquedas del menú o parámetros de las direcciones web. Respeta la señal «No rastrear» del navegador.';
const nextNotice='Esta medición no utiliza cookies de seguimiento ni envía nombres, teléfonos, correos, mensajes, búsquedas del menú ni parámetros libres de las direcciones web. Solo admite etiquetas de procedencia registradas y códigos de campaña autorizados. Conserva temporalmente, en esta pestaña, la página de entrada y esas etiquetas para relacionar los clics; se descartan al cerrar la pestaña o después de 30 minutos de inactividad. Respeta las señales «No rastrear» y Global Privacy Control del navegador.';
patch('aviso-de-privacidad.html',notice,nextNotice);
writeFileSync(resolve(root,file),JSON.stringify(contract,null,2)+'\n');
console.log(JSON.stringify({pages:Object.keys(contract.files).length,version,renamed:Object.fromEntries(renamed)}));
