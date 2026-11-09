const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../core.js'),T=require('../table.js');
const left="Satisfets d'esquerres",right='Satisfets de dretes',missing='Sense dada de desglossament';
const p='MENCIO_TEMES_Habitatge',q='MENCIO_TEMES_Turisme';
const data={headers:['ID2','SEXE','estudi','ANY','DISTRICTE','PERFIL_POLITIC','x',p,q],rows:[
 ['A','Home','One','2025','Eixample',left,'Sí','1',null],
 ['A','Dona','Two','2026','Eixample',left,'No','0','1'],
 ['B','Dona','Two','2026','Ciutat Vella',right,'Sí','1','0'],
 ['B','Home','One','2025','Eixample',null,'Sí',null,'1'],
 ['A','Dona','Two','2026',null,'No disponible','NS/NC','0',null],
 ['A','Home','One','2025','Eixample',right,null,'1','1']
]};
const state={groupBy:'DISTRICTE',sex:'PERFIL_POLITIC',indicator:'x'};
const r=C.summarize(data,state);
assert.deepEqual([...new Set(r.groups.map(g=>g.profile))],['Ciutat Vella','Eixample','Sense dada de referència']);
assert.deepEqual(r.subgroups,[left,right,missing]);
const group=(r,p,s)=>r.groups.find(g=>g.profile===p&&g.subgroup===s);
assert.equal(group(r,'Eixample',left).n,2);
assert.equal(group(r,'Eixample',left).counts['Sí'],1);
assert.equal(group(r,'Eixample',missing).n,1);
assert.equal(group(r,'Ciutat Vella',left).n,0);
assert.equal(r.breakdownMissing,2);assert.equal(r.groupingMissing,1);
assert.equal(r.reference.n,5);assert.equal(r.selected,6);
assert.equal(r.groups.reduce((n,g)=>n+g.n,0),r.reference.n);
assert.equal(C.summarize(data,{...state,excludeNS:true}).reference.n,4);
const filtered=C.summarize(data,{...state,profiles:['Ciutat Vella']});
assert.deepEqual(filtered.subgroups,[right]);assert.equal(filtered.selected,1);
assert.equal(C.summarize(data,{...state,profiles:[]}).groups.length,0);
assert.equal(C.summarize(data,{...state,sex:'Dona'}).selected,3);
assert.equal(C.summarize(data,{...state,groupBy:'PERFIL_POLITIC'}).reference.n,5);
const collection=C.summarizeCollection(data,state,[p,q],'1');
assert.deepEqual(group(collection,'Eixample',left).cells[p],{n:2,count:1,missing:0});
assert.deepEqual(group(collection,'Eixample',left).cells[q],{n:1,count:1,missing:1});
for(const result of [r,collection])for(const orientation of ['columns','rows']){
 const html=T.render(result,{orientation,grouped:true,counts:true,reference:true,heat:true},v=>v);
 assert.ok(html.includes('Posicionament respecte al PSC'));
 assert.ok(html.includes(missing));assert.ok(html.includes('colspan="3"')||html.includes('rowspan="3"'));
 assert.ok(!html.includes('undefined')&&!html.includes('NaN')&&!html.includes('>Sexe</th>'));
}
assert.throws(()=>C.summarize({...data,headers:data.headers.map(v=>v==='PERFIL_POLITIC'?'old':v)},state),/desglossament no disponible/);
const file=path.join(__dirname,'..','data.csv');
if(fs.existsSync(file)){
 const full=C.parseCSV(fs.readFileSync(file,'utf8')),idx=Object.fromEntries(full.headers.map((v,i)=>[v,i]));
 for(const groupBy of ['DISTRICTE','ID2']){
  const result=C.summarize(full,{groupBy,sex:'PERFIL_POLITIC',indicator:'PRIMER_PROBLEMA'});
  for(const g of result.groups){
   const rows=full.rows.filter(row=>C.profile(row[idx[groupBy]],groupBy)===g.profile&&(C.missing(row[idx.PERFIL_POLITIC])?missing:row[idx.PERFIL_POLITIC])===g.subgroup);
   assert.equal(g.total,rows.length);
   assert.equal(g.n,rows.filter(row=>!C.missing(row[idx.PRIMER_PROBLEMA])).length);
   assert.equal(g.counts.Habitatge,rows.filter(row=>row[idx.PRIMER_PROBLEMA]==='Habitatge').length);
  }
  assert.equal(result.groups.reduce((n,g)=>n+g.total,0),full.rows.length);
 }
 console.log('PASS: independent full-data counts and bases for district/PSC and profile/PSC crossings.');
}
console.log('PASS: district order, PSC breakdown bases, missing categories, sex fallback, empty/filtered selections and collection/table layouts.');

const ageData={headers:[...data.headers,'EDAT'],rows:data.rows.map((row,i)=>[...row,['>65 Anys','<25 Anys','<25 Anys',null,'>65 Anys','De 35 A 44 Anys'][i]])};
const ages=C.summarize(ageData,{groupBy:'SEXE',sex:'EDAT',indicator:'x'});
assert.deepEqual(ages.subgroups,['<25 Anys','De 35 A 44 Anys','>65 Anys','Sense dada de desglossament']);
assert.deepEqual([...new Set(ages.groups.map(g=>g.profile))],['Dona','Home']);
assert.equal(ages.breakdownBy,'EDAT');assert.equal(ages.breakdownLabel,'Edat');
assert.equal(ages.breakdownMissing,1);assert.equal(ages.reference.n,5);
assert.equal(group(ages,'Dona','<25 Anys').n,2);
assert.equal(group(ages,'Dona','<25 Anys').counts['Sí'],1);
assert.equal(ages.groups.reduce((n,g)=>n+g.total,0),6);
const byAge=C.summarize(ageData,{groupBy:'EDAT',sex:'all',indicator:'x'});
assert.equal(byAge.groupLabel,'Edat');assert.equal(byAge.groupingMissing,1);
const ageCollection=C.summarizeCollection(ageData,{groupBy:'SEXE',sex:'EDAT'},[p,q],'1');
assert.equal(ageCollection.breakdownBy,'EDAT');
assert.deepEqual(group(ageCollection,'Dona','<25 Anys').cells[p],{n:2,count:1,missing:0});
for(const orientation of ['rows','columns'])assert.ok(T.render(ages,{orientation,grouped:true,reference:true},v=>v).includes('Edat'));
assert.throws(()=>C.summarize(data,{groupBy:'SEXE',sex:'EDAT',indicator:'x'}),/desglossament no disponible: EDAT/);
assert.equal(C.summarize(ageData,{groupBy:'SEXE',sex:'EDAT',profiles:[],indicator:'x'}).valid,0);
console.log('PASS: age/sex references, age breakdown order, independent bases, missing ages, collections and unavailable age column.');
