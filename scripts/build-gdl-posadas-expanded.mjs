// This candidate is explicitly local. It does not update the existing shared preview.
import {readFileSync,writeFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildPosadasDesign} from './build-gdl-posadas-design.mjs';
import {stylePath} from './review/gdl-posadas-design.mjs';
import {projectExpandedInvitation,renderExpandedPosadasPage,detailFile,expandedStyle,uiScript,campaignMediaFiles} from './review/gdl-posadas-expanded.mjs';

export function buildExpandedPosadas(destination){
  const baseline=buildPosadasDesign(destination),out=resolve(destination),reportPath=resolve(dirname(out),'release.json');
  const report=JSON.parse(readFileSync(reportPath,'utf8'));
  writeFileSync(resolve(out,'guadalajara.html'),projectExpandedInvitation(readFileSync(resolve(out,'guadalajara.html'),'utf8')));
  mkdirSync(dirname(resolve(out,detailFile)),{recursive:true});writeFileSync(resolve(out,detailFile),renderExpandedPosadasPage());
  writeFileSync(resolve(out,expandedStyle),readFileSync(new URL('./review/gdl-posadas-expanded.css',import.meta.url)));
  writeFileSync(resolve(out,'revision-posadas.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Revisión local de Posadas</title><h1>Posadas Guadalajara: ficha y página detallada</h1><p>Solo local. La invitación lleva a una página propia con los datos del DOCX de Karina. No se actualizó el preview compartido ni el sitio oficial.</p><p><a href="/guadalajara#posadas">Ver invitación en la ficha</a> · <a href="/guadalajara/posadas/">Ver página de Posadas</a></p><h2>Pendientes de operación antes de publicar</h2><ul><li>Confirmar el rango de grupos y cómo se organiza su acomodo.</li><li>Validar que apartado y horario de políticas generales aplican a posadas.</li><li>Confirmar que el WhatsApp de posadas atiende cotizaciones. Botón inactivo.</li><li>Definir último día de campaña y aprobar publicación.</li></ul><p>Se preserva el contenido útil del DOCX; se excluye «a tu medida» por instrucción de Luis. Google Post, WordPress, listings y formulario opcional quedan fuera de esta prueba.</p></html>`);
  writeFileSync(resolve(out,uiScript),readFileSync(new URL('./review/gdl-posadas-ui.js',import.meta.url)));
  for(const file of campaignMediaFiles)writeFileSync(resolve(out,'assets/review-gdl',file),readFileSync(new URL('./review/assets/'+file,import.meta.url)));
  unlinkSync(resolve(out,stylePath));delete report.hashes[stylePath];
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  for(const path of ['guadalajara.html',detailFile,expandedStyle,uiScript,'revision-posadas.html',...campaignMediaFiles.map(file=>'assets/review-gdl/'+file)])report.hashes[path]=hash(readFileSync(resolve(out,path)));
  report.audience='local-posadas-expanded';report.publicationEnabled=false;report.contactEnabled=false;
  report.mediaReview='Supplied campaign screenshot with CSS presentation crop; two GDL social photos. Local proposal only, no claim of a documented posada.';
  report.localOnly=true;report.reviewPages=['/guadalajara#posadas','/guadalajara/posadas/'];report.businessContentSource='Karina DOCX; group, deposit, reservation hours and contact still need operational confirmation before public release.';
  report.fileCount=Object.keys(report.hashes).length;report.publicDigest=hash(JSON.stringify(report.hashes));
  writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');return {...baseline,fileCount:report.fileCount,reviewPages:report.reviewPages,localOnly:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildExpandedPosadas(process.argv[2])));
