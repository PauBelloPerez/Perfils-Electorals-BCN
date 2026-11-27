const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const C=require('../core.js');
const fixture={headers:['ID2','SEXE','estudi','ANY','x'],rows:[['A','Home','One','2025','Sí'],['A','Home','One','2025','No'],['A','Home','One','2025',null],['A','Dona','One','2025','Sí'],[null,'Dona','Two','2026','No'],['B','Dona','Two','2026','No disponible'],['B','Home','Two','2026','NS/NC']]};
let r=C.summarize(fixture,{indicator:'x',sex:'compare'});
assert.equal(r.valid,5);assert.equal(r.missing,2);
assert.equal(r.groups.find(g=>g.profile==='A'&&g.sex==='Home').n,2);
assert.equal(r.groups.find(g=>g.profile==='A'&&g.sex==='Home').counts['Sí'],1);
assert.equal(r.groups.find(g=>g.profile==='Sense perfil'&&g.sex==='Dona').n,1);
assert.equal(C.summarize(fixture,{indicator:'x',sex:'compare',excludeNS:true}).valid,4);
assert.equal(C.summarize(fixture,{indicator:'x',sex:'Dona'}).valid,2);
assert.equal(C.summarize(fixture,{indicator:'x',sex:'all',excludeNS:true}).valid,4);
assert.equal(C.summarize(fixture,{indicator:'x',sex:'compare',profiles:[]}).valid,0);
const parsed=C.parseCSV('\uFEFF"ID2";"SEXE";"estudi";"ANY";"x"\r\n"a; b";Home;One;2025;"line 1\nline ""2"""\r\n');
assert.equal(parsed.rows[0][0],'a; b');assert.equal(parsed.rows[0][4],'line 1\nline "2"');
assert.throws(()=>C.parseCSV('ID2;SEXE;estudi;ANY\nA;Home;One'));
assert.throws(()=>C.parseCSV('ID2;SEXE;estudi;ANY\n"A;Home;One;2025'));
console.log('PASS: denominators, filters, missing profiles, NS/NC and CSV quoting (synthetic fixtures).');
{
  const values=['PSC','ERC','BeC','CUP','PP','VOX','JUNTS','Aliança','AC','Aliança Catalana',
    'Sense partit /Abstenció','Nous electors','Altres','NS/NC',null,'No disponible'];
  const parties={headers:['ID2','SEXE','estudi','ANY','PARTIT','INT_VOT'],
    rows:values.map((v,i)=>Object.freeze(['A',i%2?'Dona':'Home','Test','2026',v,v]))};
  const grouped=C.summarize(parties,{indicator:'PARTIT',sex:'compare'});
  assert.equal(grouped.reference.n,14);
  assert.equal(grouped.reference.missing,2);
  assert.equal(grouped.reference.counts['ERC, BeC i CUP'],3);
  assert.equal(grouped.reference.counts['PP i VOX'],2);
  assert.equal(grouped.reference.counts['Junts i AC'],4);
  for(const value of ['PSC','Sense partit /Abstenció','Nous electors','Altres','NS/NC'])assert.equal(grouped.reference.counts[value],1);
  for(const value of ['ERC','BeC','CUP','PP','VOX','JUNTS','Aliança','AC'])assert.ok(!grouped.responses.includes(value));
  for(const group of [grouped.reference,...grouped.groups])assert.equal(Object.values(group.counts).reduce((a,b)=>a+b,0),group.n);
  assert.equal(grouped.groups.find(g=>g.sex==='Home').counts['ERC, BeC i CUP'],1);
  assert.equal(grouped.groups.find(g=>g.sex==='Dona').counts['ERC, BeC i CUP'],2);
  assert.equal(C.summarize(parties,{indicator:'PARTIT',sex:'all',excludeNS:true}).reference.n,13);
  assert.equal(C.summarize(parties,{indicator:'PARTIT',sex:'Dona'}).reference.counts['ERC, BeC i CUP'],2);
  assert.equal(C.summarize(parties,{indicator:'INT_VOT',sex:'all'}).reference.counts.ERC,1);
  assert.equal(parties.rows[1][4],'ERC');
  console.log('PASS: PARTIT grouping, party aliases, per-sex counts, unchanged bases, NS/NC and original data.');
}
const samplePath=require('node:path').join(__dirname,'../data/sample.js');
if(fs.existsSync(samplePath)){
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(samplePath,'utf8'),sandbox);
const sample=sandbox.window.SAMPLE_DATA;
const sampleState={indicator:'PRIMER_PROBLEMA',sex:'compare',politicalComposition:C.politicalComposition({noSimpatitzants:'resta'})};
r=C.summarize(sample,sampleState);
assert.equal(sample.rows.length,1000);assert.equal(r.valid,520);assert.equal(r.reference.counts.Inseguretat,132);assert.equal(r.reference.counts.Habitatge,117);
for(const g of r.groups)assert.equal(Object.values(g.counts).reduce((a,b)=>a+b,0),g.n);
assert.equal(r.groups.reduce((sum,g)=>sum+g.n,0),520);
const large={...sample,rows:Array.from({length:45},()=>sample.rows).flat()};
const start=performance.now();const big=C.summarize(large,sampleState);
assert.equal(big.valid,520*45);
console.log('PASS: denominators, filters, missing profiles, NS/NC, CSV quoting and sample totals.');
console.log('45,000 synthetic rows aggregation:',Math.round(performance.now()-start),'ms (repeated sample, not the full database).');
}else console.log('Optional local sample checks skipped: no survey data is bundled in the repository.');
