const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../core.js'),T=require('../table.js'),metadata=require('../response-metadata.js');

assert.deepEqual(C.orderedResponses('PRIMER_PROBLEMA',['Inseguretat','Turisme','Habitatge']),['Habitatge','Turisme','Inseguretat']);
assert.deepEqual(C.orderedResponses('VAL_GESTIO',['Insatisfet','Neutres','Satisfets']),['Satisfets','Neutres','Insatisfet']);
assert.deepEqual(C.orderedResponses('MENCIO_TEMES_Habitatge',['0','1']),['1','0']);
assert.deepEqual(C.orderedResponses('PRIMER_PROBLEMA',['Nova B','Inseguretat','Nova A']),['Inseguretat','Nova A','Nova B']);
assert.deepEqual(C.sexesFor('compare'),['Dona','Home']);
assert.deepEqual(['VOX','ERC','PSC','Sense dada de referència'].sort((a,b)=>C.compareProfiles(a,b,'MUNI_VOT')),['PSC','ERC','VOX','Sense dada de referència']);
assert.deepEqual(['No simpatitzants','Satisfets de dretes'].sort((a,b)=>C.compareProfiles(a,b,'PERFIL_POLITIC')),['Satisfets de dretes','No simpatitzants']);

const data={headers:['ID2','SEXE','estudi','ANY','PRIMER_PROBLEMA'],rows:[
 ['A','Home','Test','2026','Inseguretat'],
 ['A','Dona','Test','2026','Habitatge'],
 ['A','Dona','Test','2026','Inseguretat'],
 ['A','Dona','Test','2026','NA'],
 ['A','Home','Test','2026','No disponible']
]};
const result=C.summarize(data,{indicator:'PRIMER_PROBLEMA',sex:'compare'});
assert.deepEqual(result.responses,['Habitatge','Inseguretat']);
assert.equal(result.reference.n,3);assert.equal(result.reference.missing,2);
assert.equal(result.reference.counts.Inseguretat,2);
assert.deepEqual(result.groups.map(g=>g.sex),['Dona','Home']);
for(const orientation of ['columns','rows']){
 const html=T.render(result,{orientation,grouped:true,reference:false,counts:true},v=>v);
 assert.ok(html.indexOf('>Habitatge<')<html.indexOf('>Inseguretat<'));
 assert.ok(html.indexOf('>Dona<')<html.indexOf('>Home<'));
}
// Check the browser script path too, without Node's require/module globals.
const browser=vm.createContext({});
for(const file of ['response-metadata.js','core.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),browser);
assert.equal(browser.ProfileCore.descriptionFor('PRIMER_PROBLEMA'),metadata.variables.PRIMER_PROBLEMA.description);
assert.equal(browser.ProfileCore.orderedResponses('MENCIO_TEMES_Habitatge',['0','1']).join(','),'1,0');

// When the real database is present, verify coverage without logging survey rows.
const dataPath=path.join(__dirname,'..','data.csv');
if(fs.existsSync(dataPath)){
 const full=C.parseCSV(fs.readFileSync(dataPath,'utf8'));
 for(const [column,id] of full.headers.entries()){
  const entry=metadata.variables[id];
  assert.ok(entry,`Missing dictionary entry: ${id}`);
  const values=new Set(full.rows.map(row=>row[column]).filter(v=>!C.missing(v)));
  const expected=entry.responses.filter(r=>values.has(r.value)).map(r=>r.value);
  assert.deepEqual(C.orderedResponses(id,values),expected,`Dictionary coverage/order: ${id}`);
 }
 console.log(`PASS: dictionary covers all observed responses across ${full.headers.length} columns and ${full.rows.length} records.`);
}
console.log('PASS: dictionary order in answers, references, sex groups and both table layouts; unknown categories retained; missingness unchanged; browser metadata loading.');
