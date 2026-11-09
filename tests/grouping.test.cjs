const assert=require('node:assert/strict');
const C=require('../core.js'),T=require('../table.js');
const fields=['ID2','SEXE','estudi','ANY','IDEO_3','MUNI_VOT','INT_VOT','PERFIL_POLITIC','x','MENCIO_TEMES_Habitatge','DISTRICTE'];
const data={headers:fields,rows:[
 ['A','Home','One','2025','Esquerra','PSC','Indecís',"Satisfets d'esquerres",'Sí','1','Ciutat Vella'],
 ['B','Dona','One','2026','Esquerra','ERC','PSC',"Satisfets d'esquerres",'No','0','Eixample'],
 ['A','Home','Two','2026','No posicionats','Sense partit /Abstenció','Abstenció','No simpatitzants','Sí',null,'Ciutat Vella'],
 [null,'Dona','Two','2026',null,'No disponible',null,null,'No','1',null],
 ['B','Dona','One','2025','Dreta','PSC','PSC','Satisfets de dretes',null,'0','Eixample'],
]};
data.headers.push('EDAT');data.rows.forEach((row,i)=>row.push(i%2?'>65 Anys':'<25 Anys'));
const state={indicator:'x',groupBy:'IDEO_3',sex:'compare'};
let r=C.summarize(data,state);
assert.deepEqual([...new Set(r.groups.map(g=>g.profile))],['Esquerra','Dreta','No posicionats','Sense dada de referència']);
assert.equal(r.reference.n,4);assert.equal(r.groupingMissing,1);
assert.equal(r.groups.find(g=>g.profile==='Esquerra'&&g.sex==='Home').counts['Sí'],1);
assert.equal(r.groups.find(g=>g.profile==='Esquerra'&&g.sex==='Dona').counts['No'],1);
r=C.summarize(data,{...state,profiles:['No posicionats']});
assert.equal(r.selected,1);assert.equal(r.reference.counts['Sí'],1);assert.equal(r.groupingMissing,0);
r=C.summarize(data,{...state,profiles:[]});assert.equal(r.selected,0);
r=C.summarize(data,{...state,groupBy:'INT_VOT',sex:'all',excludeNS:true});
assert.ok(r.groups.some(g=>g.profile==='Indecís'));assert.ok(r.groups.some(g=>g.profile==='Abstenció'));
assert.ok(r.groups.some(g=>g.profile==='Sense dada de referència'));
assert.equal(r.groups.find(g=>g.profile==='PSC').n,1);
r=C.summarize(data,{...state,groupBy:'MUNI_VOT',sex:'Dona'});
assert.equal(r.selected,3);assert.equal(r.valid,2);assert.equal(r.groupingMissing,1);
r=C.summarize(data,{...state,groupBy:'PERFIL_POLITIC',sex:'all'});
assert.equal(r.groups.find(g=>g.profile==="Satisfets d'esquerres").n,2);
assert.equal(r.groupLabel,'Posicionament respecte al PSC');
assert.equal(C.summarize(data,{indicator:'x',sex:'all'}).groupBy,'ID2');
assert.ok(C.summarize(data,{indicator:'x',sex:'all'}).groups.some(g=>g.profile==='Sense perfil'));
assert.throws(()=>C.summarize({...data,headers:fields.map(k=>k==='IDEO_3'?'old':k)},state),/no disponible/);
for(const grouping of C.GROUPINGS){
 const direct=C.summarize(data,{...state,groupBy:grouping.id,indicator:'MENCIO_TEMES_Habitatge'});
 const collection=C.summarizeCollection(data,{...state,groupBy:grouping.id},['MENCIO_TEMES_Habitatge'],'1');
 assert.equal(collection.groupBy,grouping.id);assert.equal(collection.groupingMissing,direct.groupingMissing);
 for(let i=0;i<direct.groups.length;i++){
  assert.equal(collection.groups[i].profile,direct.groups[i].profile);
  assert.equal(collection.groups[i].cells.MENCIO_TEMES_Habitatge.n,direct.groups[i].n);
 }
 for(const orientation of ['columns','rows']){
  const html=T.render(collection,{orientation,grouped:true,counts:true,heat:true,reference:true},v=>v);
  assert.ok(html.includes(grouping.label));assert.ok(!html.includes('NaN')&&!html.includes('undefined'));
 }
}
console.log('PASS: all eight reference variables, category/sex filters across all surveys, missing vs explicit political categories, collections and table captions.');
