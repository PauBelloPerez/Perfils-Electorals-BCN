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
const full=fs.existsSync(file)?C.parseCSV(fs.readFileSync(file,'utf8')):null;
if(full){
 const idx=Object.fromEntries(full.headers.map((v,i)=>[v,i]));
 const included=full.rows.filter(row=>row[idx.PERFIL_POLITIC]!=='No simpatitzants');
 for(const groupBy of ['DISTRICTE','ID2']){
  const result=C.summarize(full,{groupBy,sex:'PERFIL_POLITIC',indicator:'PRIMER_PROBLEMA'});
  for(const g of result.groups){
   const rows=included.filter(row=>C.profile(row[idx[groupBy]],groupBy)===g.profile&&(C.missing(row[idx.PERFIL_POLITIC])?missing:row[idx.PERFIL_POLITIC])===g.subgroup);
   assert.equal(g.total,rows.length);
   assert.equal(g.n,rows.filter(row=>!C.missing(row[idx.PRIMER_PROBLEMA])).length);
   assert.equal(g.counts.Habitatge,rows.filter(row=>row[idx.PRIMER_PROBLEMA]==='Habitatge').length);
  }
  assert.equal(result.groups.reduce((n,g)=>n+g.total,0),included.length);
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

const blocsData={...data,rows:[...data.rows,
 ['A','Dona','One','2026','Eixample','Simpatitzants o exvotants decidament d’esquerres','Sí','1','1'],
 ['A','Dona','One','2026','Eixample',"Simpatitzants o exvotants no decididament d'esquerres",'Sí','1','1'],
 ['A','Dona','One','2026','Eixample','Convençuts, simpatitzants o exvotants del partit','Sí','1','1'],
 [null,'Dona','One','2026','Eixample',left,'Sí','1','1'],
 ['A',null,'One','2026','Eixample',left,'Sí','1','1']
]};
const politicalState={groupBy:'ID2',sex:'BLOC_POLITIC_SEXE',indicator:'x'};
const blocs=C.summarize(blocsData,politicalState);
const leftBloc='Bloc d’esquerres',restBloc='Resta de perfils polítics';
assert.deepEqual(blocs.subgroups,['Dona · '+leftBloc,'Dona · '+restBloc,'Home · '+leftBloc,'Home · '+restBloc]);
assert.equal(blocs.politicalExcluded,5);
assert.equal(blocs.reference.total,6);
assert.equal(blocs.reference.n,5);
assert.equal(group(blocs,'A','Dona · '+leftBloc).n,2);
assert.equal(group(blocs,'A','Dona · '+leftBloc).counts['Sí'],1);
assert.equal(group(blocs,'A','Dona · '+leftBloc).sex,'Dona');
assert.equal(group(blocs,'A','Home · '+restBloc).n,0);
assert.equal(group(blocs,'B','Home · '+leftBloc).n,0);
assert.equal(blocs.groups.reduce((n,g)=>n+g.n,0),blocs.reference.n);
const blocOnly=C.summarize(blocsData,{...politicalState,sex:'BLOC_POLITIC'});
assert.equal(blocOnly.politicalExcluded,4);
assert.equal(group(blocOnly,'A',leftBloc).n,4);
assert.equal(group(blocOnly,'A',restBloc).total,2);
const wave={study:'One',year:'2026'};
const scoped=C.summarize(blocsData,{...politicalState,scope:wave});
assert.equal(scoped.reference.total,2);
assert.equal(scoped.politicalExcluded,3);
assert.deepEqual(Object.keys(scoped.coverage),['One']);
assert.equal(C.summarize(blocsData,{...politicalState,scope:{study:'One'}}).selected,4);
assert.equal(C.summarize(blocsData,{...politicalState,scope:{study:'Absent'}}).valid,0);
assert.equal(C.summarize(blocsData,{...politicalState,sex:'all',scope:wave}).selected,blocsData.rows.length);
const blocCollection=C.summarizeCollection(blocsData,politicalState,[p,q],'1');
assert.deepEqual(group(blocCollection,'A','Dona · '+leftBloc).cells[p],{n:2,count:1,missing:0});
assert.deepEqual(group(blocCollection,'A','Home · '+leftBloc).cells[q],{n:0,count:0,missing:1});
for(const orientation of ['rows','columns']){
 const html=T.render(blocCollection,{orientation,grouped:true,reference:true,counts:false},v=>v);
 assert.ok(html.includes('n = 0')&&html.includes('Bloc polític × sexe'));
}
const compositionData={...blocsData,rows:[...blocsData.rows,
 ['A','Home','One','2026','Eixample','No simpatitzants','Sí','1','1']
]};
const defaults=C.summarize(compositionData,politicalState);
assert.equal(defaults.excludedByComposition,1);
assert.equal(defaults.reference.n,blocs.reference.n);
assert.equal(C.summarize(compositionData,{...politicalState,sex:'all'}).selected,blocsData.rows.length);
assert.equal(C.summarize(compositionData,{...politicalState,sex:'Dona'}).excludedByComposition,0);
assert.equal(C.summarize(compositionData,{...politicalState,groupBy:'PERFIL_POLITIC',sex:'all'}).groups.some(g=>g.profile==='No simpatitzants'),false);
const changed={noSimpatitzants:'esquerres',satisfetsDretes:'exclos'};
const regrouped=C.summarize(compositionData,{...politicalState,politicalComposition:changed});
assert.equal(regrouped.excludedByComposition,2);
assert.equal(group(regrouped,'A','Home · '+leftBloc).n,2);
assert.equal(regrouped.groups.some(g=>g.profile==='B'),false);
assert.equal(C.politicalComposition({noSimpatitzants:'unknown'}).noSimpatitzants,'exclos');
const allOutside=Object.fromEntries(C.POLITICAL_PROFILES.map(({id})=>[id,'exclos']));
assert.equal(C.summarize(compositionData,{...politicalState,politicalComposition:allOutside}).reference.n,0);
if(full){
 const primer=C.summarize(full,{...politicalState,indicator:'PRIMER_PROBLEMA'});
 const idx=Object.fromEntries(full.headers.map((v,i)=>[v,i]));
 const leftProfiles=new Set([left,"Simpatitzants o exvotants decidament d'esquerres"]);
 const otherProfiles=new Set([right,"Simpatitzants o exvotants no decididament d'esquerres",'Satisfets poc polititzats']);
 const classified=full.rows.filter(row=>!C.missing(row[idx.ID2])&&['Dona','Home'].includes(row[idx.SEXE])
   &&(leftProfiles.has(row[idx.PERFIL_POLITIC])||otherProfiles.has(row[idx.PERFIL_POLITIC])));
 assert.equal(primer.selected,classified.length);
 assert.equal(primer.politicalExcluded,full.rows.length-classified.length);
 for(const g of primer.groups){
   const profiles=g.subgroup.endsWith(leftBloc)?leftProfiles:otherProfiles;
   const valid=classified.filter(row=>row[idx.ID2]===g.profile&&row[idx.SEXE]===g.sex
     &&profiles.has(row[idx.PERFIL_POLITIC])&&!C.missing(row[idx.PRIMER_PROBLEMA]));
   assert.equal(g.n,valid.length);
   assert.equal(g.counts.Habitatge,valid.filter(row=>row[idx.PRIMER_PROBLEMA]==='Habitatge').length);
 }
}
console.log('PASS: political blocs and sex, eligible bases, survey/year scope, exclusions and both table orientations.');
