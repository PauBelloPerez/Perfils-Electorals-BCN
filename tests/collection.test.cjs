const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const C=require('../core.js'),T=require('../table.js');
const p='MENCIO_TEMES_Habitatge',q='MENCIO_TEMES_Turisme';
const fixture={headers:['ID2','SEXE','estudi','ANY',p,q],rows:[
 ['A','Home','One','2025','1',null],
 ['A','Home','One','2025','0','1'],
 ['A','Dona','One','2025',null,'0'],
 [null,'Dona','Two','2026','1','1'],
]};
const state={sex:'compare'};
const yes=C.summarizeCollection(fixture,state,[p,q],'1');
const no=C.summarizeCollection(fixture,state,[p,q],'0');
const group=(result,name,sex)=>result.groups.find(g=>g.profile===name&&g.sex===sex);
assert.deepEqual(group(yes,'A','Home').cells[p],{n:2,count:1,missing:0});
assert.deepEqual(group(yes,'A','Home').cells[q],{n:1,count:1,missing:1});
assert.deepEqual(group(no,'A','Home').cells[q],{n:1,count:0,missing:1});
assert.equal(group(yes,'A','Dona').cells[p].n,0);
assert.equal(yes.reference.cells[p].count,2);
assert.deepEqual(C.summarizeCollection(fixture,{sex:'Dona'},[p,q],'0').reference.cells[q],{n:2,count:1,missing:0});
assert.equal(C.summarizeCollection(fixture,{sex:'all',profiles:[]},[p,q],'1').valid,0);
assert.equal(C.summarizeCollection(fixture,state,['absent'],'1'),null);
for(const orientation of ['columns','rows']){
 const html=T.render(yes,{orientation,grouped:true,heat:true,counts:false,reference:true},id=>id);
 assert.ok(html.includes('50,0%')&&html.includes('100,0%'));
 assert.ok(html.includes('n=1 · 1 excloses'));
 assert.ok(!html.includes('NaN')&&!html.includes('undefined'));
 assert.ok(!/<small>\d+ respostes<\/small>/.test(html));
 const ids=[...html.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);
 for(const m of html.matchAll(/ headers="([^"]+)"/g))for(const id of m[1].split(' '))assert.ok(ids.includes(id));
}
console.log('PASS: collection bases, yes/no, missing values and both table layouts (synthetic fixtures).');
const samplePath=require('node:path').join(__dirname,'../data/sample.js');
if(fs.existsSync(samplePath)){
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(samplePath,'utf8'),sandbox);
const data=sandbox.window.SAMPLE_DATA,indicators=data.headers.filter(id=>id.startsWith('MENCIO_TEMES_'));
assert.equal(indicators.length,10);
for(const sex of ['compare','all','Home','Dona']){
 const filtered={sex};
 const a=C.summarizeCollection(data,filtered,indicators,'1'),b=C.summarizeCollection(data,filtered,indicators,'0');
 for(const id of indicators)for(let i=0;i<a.groups.length;i++){
  const g=a.groups[i],idx=data.headers.indexOf(id);
  const rows=data.rows.filter(r=>C.profile(r[0])===g.profile&&(g.sex==='Total'||r[1]===g.sex)&&!C.missing(r[idx]));
  assert.equal(g.cells[id].n,rows.length);
  assert.equal(g.cells[id].count,rows.filter(r=>r[idx]==='1').length);
  assert.equal(g.cells[id].count+b.groups[i].cells[id].count,g.cells[id].n);
 }
}
console.log('PASS: 10-indicator collection, independent per-cell bases, yes/no, sex filters across all surveys, missing values and both table layouts.');
}else console.log('Optional local sample collection checks skipped.');
