// Explicit text-only status update for the two reviewed El Paso pages; never imports the donor.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const replacements = {
  'el-paso.html': [
    ['data-status="coming-soon"','data-status="active"'],
    ['Sin Yolanda El Paso · Apertura 9 de octubre','Sin Yolanda El Paso · La cantina'],
    ['Conoce su ubicación y sigue las novedades de apertura.','Conoce su ubicación y las novedades de la cantina.'],
    ['Nos vemos<br>pronto.','Nos vemos<br>en la cantina.'],
    ['Apertura 9 de octubre','Ya abrimos'],
    ['Novedades de apertura','Instagram El Paso']
  ],
  'en/el-paso/index.html': [
    ['data-status="coming-soon"','data-status="active"'],
    ['Sin Yolanda El Paso · Opening October 9','Sin Yolanda El Paso · The cantina'],
    ['Find the location and follow opening updates.','Find the location and news from the cantina.'],
    ['See you<br>soon.','See you<br>at the cantina.'],
    ['Opening October 9','Now open'],
    ['Opening updates','Instagram El Paso']
  ]
};
for(const [file,pairs] of Object.entries(replacements)){
  const path = new URL(file,root);
  let html = fs.readFileSync(path,'utf8');
  for(const [old,next] of pairs){ assert.ok(html.includes(old),`Expected reviewed text missing: ${file}`); html=html.replaceAll(old,next); }
  fs.writeFileSync(path,html);
}
console.log(JSON.stringify({files:Object.keys(replacements),status:'active',scope:'demo-only',hoursAndReservationUnchanged:true}));
