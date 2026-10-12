// Local asset preparation, not a download or publication step. Originals stay intact.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const bank = process.argv[2];
assert.ok(bank, 'Pass the existing local editorial bank directory explicitly');
const files = JSON.parse(fs.readFileSync(path.join(bank, 'review/drive-karina/files.json')));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const choices = [
  {id:'17Tr6UIoqtmFz9Y_SoaI-icxQhcdZ8hTr',key:'future-crowd',branch:'moreno-valley'},
  {id:'1I5KyJZ0_W_vc5ydIgrwitys9CE3gxaL3',key:'future-singalong',branch:'san-diego'}
];
(async()=>{
  const out = path.join(root,'assets/media/venues/future');
  fs.mkdirSync(out,{recursive:true});
  const report = [];
  for(const choice of choices){
    const source = files.find(file=>file.fileId===choice.id);
    assert.ok(source && source.group==='woodlands' && !source.duplicateOf.length);
    assert.equal(sha(source.originalPath),source.sha256,'Do not use a changed original');
    const variants=[];
    for(const width of [640,960]){
      const destination=path.join(out,`${choice.key}-${width}.webp`);
      assert.ok(!fs.existsSync(destination),'Use a new rendition; do not overwrite');
      const info=await sharp(source.originalPath).rotate().resize({width,withoutEnlargement:true}).webp({quality:80}).toFile(destination);
      variants.push({file:path.relative(root,destination),width:info.width,height:info.height,bytes:info.size,sha256:sha(destination)});
    }
    assert.equal(sha(source.originalPath),source.sha256);
    report.push({...choice,sourceSha256:source.sha256,kind:'brand-illustrative',variants});
  }
  const preview=path.join(root,'assets/media/agenda-canto-preview.webp');
  assert.ok(!fs.existsSync(preview));
  const info=await sharp(path.join(root,'assets/media/agenda-canto-1280.webp')).resize({width:48,withoutEnlargement:true}).webp({quality:35}).toFile(preview);
  report.push({key:'agenda-placeholder',file:'assets/media/agenda-canto-preview.webp',bytes:info.size,sha256:sha(preview)});
  console.log(JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1;});
