// A local content outline only: no production projection, styles, scripts or live contact actions.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {resolve, relative, isAbsolute, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {escapeHtml as esc} from './editorial/branch-agenda.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
export const outline=JSON.parse(readFileSync(new URL('./review/gdl-posadas-outline.json',import.meta.url)));

export function renderPosadasStructure(data=outline) {
  assert.equal(data.version,1);
  assert.equal(data.publicationEnabled,false,'Structure review cannot enable publication');
  assert.equal(data.stage,'content-structure');
  assert.equal(data.branchId,'san-ignacio');
  assert.equal(data.section.action.enabled,false,'The proposed contact still requires confirmation');
  const s=data.section;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Posadas Guadalajara — estructura de contenido</title></head>
<body>
<header><h1>Posadas Guadalajara: estructura de contenido</h1>
<p>Borrador local para revisar orden, textos y acciones. No es un diseño ni la ficha publicada.</p>
<p><a href="#mapa">Orden de la ficha</a> · <a href="#posadas">Leer la sección</a> · <a href="#pendientes">Datos pendientes</a></p></header>
<main>
<section id="mapa" aria-labelledby="mapa-title"><h2 id="mapa-title">Dónde entra en la ficha</h2>
<ol>${data.pageOrder.map(item=>`<li><strong>${esc(item.label)}.</strong> ${esc(item.change)}</li>`).join('\n')}</ol>
<p>Destino previsto al integrarla: <code>${esc(data.intendedRoute)}</code>. Esta revisión no modifica esa URL.</p></section>
<hr>
<article id="posadas" aria-labelledby="posadas-title">
<header><h2 id="posadas-title">${esc(s.title)}</h2><p>${esc(s.lead)}</p><p>${esc(s.description)}</p>
<button type="button" disabled aria-describedby="review-action-note">${esc(s.action.label)}</button><p>${esc(s.qualification)}</p></header>
<section aria-labelledby="steps-title"><h3 id="steps-title">${esc(s.stepsTitle)}</h3><ol>${s.steps.map(item=>`<li><strong>${esc(item.title)}.</strong> ${esc(item.text)}</li>`).join('\n')}</ol></section>
<section aria-labelledby="faq-title"><h3 id="faq-title">${esc(s.faqTitle)}</h3>${s.faq.map(item=>`<h4>${esc(item.question)}</h4><p>${esc(item.answer)}</p>`).join('\n')}</section>
<footer><h3>${esc(s.contactTitle)}</h3><p>${esc(s.contactText)}</p><button type="button" disabled aria-describedby="review-action-note">${esc(s.action.label)}</button><p><a href="${esc('https://sin-yolanda.com'+s.locationLink.target)}" target="_blank" rel="noopener noreferrer">${esc(s.locationLink.label)} (sitio actual, abre otra pestaña)</a></p></footer>
</article>
<hr>
<aside id="pendientes" aria-labelledby="pendientes-title"><h2 id="pendientes-title">Notas para la revisión</h2>
<p>Estas notas no forman parte del texto para el visitante.</p>
<p id="review-action-note">Los botones están inactivos en este borrador. No abren WhatsApp, no envían datos ni confirman una reserva. El destino propuesto se activará después de confirmar el canal.</p>
<h3>Acción y mensaje previstos</h3><p>${esc(s.action.intent)}</p><blockquote><p>${esc(s.action.draftMessage)}</p></blockquote>
<h3>Fotografía</h3><p>${esc(data.mediaSlot.purpose)} ${esc(data.mediaSlot.preferredSource)} ${esc(data.mediaSlot.placement)}</p>
<h3>Información comercial por cerrar</h3><dl>${data.pending.map(item=>`<dt>${esc(item.value)}</dt><dd>${esc(item.decision)} Fuente: ${esc(item.source)}.</dd>`).join('\n')}</dl>
<h3>Después de aprobar la estructura</h3><ul>${data.deferred.map(text=>`<li>${esc(text)}</li>`).join('\n')}</ul></aside>
</main></body></html>`;
}

export function buildPosadasStructure(destination) {
  assert.ok(destination,'A fresh local destination is required');
  const out=resolve(destination),where=relative(resolve(root,'.artifacts'),out);
  assert.ok(where&&!where.startsWith('..')&&!isAbsolute(where),'Only a local .artifacts destination is allowed');
  assert.ok(!existsSync(out),'Refuse to overwrite a previous review');
  const html=renderPosadasStructure();
  // Deliberately leave visual choices and external services out of this phase.
  assert.doesNotMatch(html,/<(?:style|script|img|video|iframe|form)\b|\sstyle=|https:\/\/(?:wa\.me|api\.whatsapp)/i);
  mkdirSync(out,{recursive:true});
  const files={'index.html':html,'404.html':'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>No encontrado</title><h1>Revisión no encontrada</h1><a href="/">Volver a la estructura</a></html>'};
  for(const [file,body] of Object.entries(files))writeFileSync(resolve(out,file),body);
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const hashes=Object.fromEntries(Object.entries(files).map(([file,body])=>[file,hash(body)]));
  const metadata={version:1,audience:'local-content-structure',publicationEnabled:false,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),fileCount:2,hashes,publicDigest:hash(JSON.stringify(hashes))};
  writeFileSync(resolve(dirname(out),'release.json'),JSON.stringify(metadata,null,2)+'\n');
  return {output:out,fileCount:2,publicationEnabled:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildPosadasStructure(process.argv[2])));
