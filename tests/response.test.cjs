const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
// Small DOM substitute to exercise the real response change handler and renderer.
const elements=new Map();
const element=id=>{
 if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',hidden:false,checked:false,disabled:false,previousElementSibling:{textContent:''},querySelectorAll:()=>[],setAttribute(){}});
 return elements.get(id);
};
const indicators=[
 {id:'PRIMER_PROBLEMA',label:'Principal problema',description:'Problema principal',group:'Preocupacions',warning:''},
 {id:'MENCIO_TEMES_Habitatge',label:'Menció: Habitatge',description:'Menció habitatge',group:'Preocupacions',warning:''}
];
let exported='';
const context=vm.createContext({
 Blob:class{constructor(parts){exported=parts.join('');}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
 document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>({click(){}})},
 window:{INDICATORS:indicators},location:{protocol:'file:'},
 localStorage:{getItem:()=>null,setItem(){}},
 ProfileCore:require('../core.js'),ProfileTable:require('../table.js'),Intl,setTimeout
});
vm.runInContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
context.fixture={source:'test.csv',headers:['ID2','SEXE','estudi','ANY','PRIMER_PROBLEMA','MENCIO_TEMES_Habitatge','DISTRICTE','PERFIL_POLITIC'],rows:[
 ['A','Home','Test','2026','Inseguretat','1','Ciutat Vella',"Satisfets d'esquerres"],
 ['A','Dona','Test','2026','Inseguretat','0','Ciutat Vella','No simpatitzants'],
 ['B','Home','Test','2025','Habitatge','1','Eixample',null]
]};
vm.runInContext('adoptData(fixture)',context);
assert.equal(element('response-title').textContent,'Habitatge');
assert.ok(element('response').innerHTML.indexOf('Habitatge')<element('response').innerHTML.indexOf('Inseguretat'));
assert.equal(element('description').textContent,require('../response-metadata.js').variables.PRIMER_PROBLEMA.description);
element('response').value='Inseguretat';element('response').onchange();
assert.equal(element('response-title').textContent,'Inseguretat');
element('response').value='Habitatge';element('response').onchange();
assert.equal(element('response-title').textContent,'Habitatge');
assert.ok(element('reference').innerHTML.includes('33,3%'));
element('response').value='Inseguretat';element('response').onchange();
assert.equal(element('response-title').textContent,'Inseguretat');
assert.ok(element('reference').innerHTML.includes('66,7%'));
vm.runInContext("state.indicator='MENCIO_TEMES_Habitatge';response='';render()",context);
assert.equal(element('response-title').textContent,'Sí, el menciona');
element('response').value='0';element('response').onchange();
assert.equal(element('response-title').textContent,'No el menciona');
assert.ok(element('reference').innerHTML.includes('33,3%'));
vm.runInContext("state.profiles=[];render()",context);
assert.equal(element('response-title').textContent,'Sense respostes per a aquesta selecció');
console.log('PASS: response changes update the chart title and percentages together; indicator changes and empty selection clear stale headings.');

vm.runInContext('reset()',context);
element('group-by').value='DISTRICTE';element('group-by').onchange();
element('sex').value='PERFIL_POLITIC';element('sex').onchange();
assert.equal(element('analysis-title').textContent,'Districte');
assert.ok(element('legend').innerHTML.includes('No simpatitzants'));
assert.ok(element('legend').innerHTML.includes('Sense dada de desglossament'));
assert.ok(!element('chart').innerHTML.includes('background:undefined'));
assert.ok(element('table').innerHTML.includes('Posicionament respecte al PSC'));
element('export').onclick();
assert.ok(exported.includes('"variable_desglossament";"desglossament";"subgrup"'));
assert.ok(exported.includes('"DISTRICTE";"Districte"'));
assert.ok(exported.includes('"Total";"PERFIL_POLITIC";"Posicionament respecte al PSC";"No simpatitzants"'));
vm.runInContext("state.indicator='__MENCIO_PROBLEMA';render()",context);
assert.ok(element('table').innerHTML.includes('No simpatitzants'));
element('export').onclick();assert.ok(exported.includes('"Menció problema"'));
element('sex').value='compare';element('sex').onchange();
assert.ok(element('table').innerHTML.includes('>Dona</th>'));
vm.runInContext('reset()',context);assert.equal(element('sex').value,'compare');
assert.equal(element('group-by').value,'ID2');
// Old CSVs continue to work, with unavailable controls disabled.
context.fixture.headers=context.fixture.headers.slice(0,6);
context.fixture.rows=context.fixture.rows.map(r=>r.slice(0,6));
vm.runInContext('adoptData(fixture)',context);
assert.ok(element('sex').innerHTML.includes('value="PERFIL_POLITIC" disabled'));
assert.ok(element('group-by').innerHTML.includes('value="DISTRICTE" disabled'));
console.log('PASS: district and PSC controls, charts, tables, collection exports, reset and CSVs lacking the new columns.');

(async()=>{
 let selected=false,opened=false;
 context.TableExport={capture:()=>({}),html:()=>'<table><tr><td>Habitatge</td></tr></table>',copyFormatted:async()=>false};
 element('table').querySelector=()=>({});
 element('copy-preview').showModal=()=>{opened=true;};
 element('copy-table').focus=()=>{};
 context.document.createRange=()=>({selectNodeContents(){}});
 context.window.getSelection=()=>({removeAllRanges(){},addRange(){selected=true;}});
 await vm.runInContext('copyTable()',context);
 assert.ok(opened&&selected);assert.ok(element('copy-status').textContent.includes('Ctrl+C'));
 assert.ok(!element('export-status').textContent.includes('Taula copiada amb format'));
 assert.equal(element('export-copy').disabled,false);
 opened=false;selected=false;context.TableExport.copyFormatted=async()=>true;
 await vm.runInContext('copyTable()',context);
 assert.ok(element('export-status').textContent.includes('Taula copiada amb format'));
 assert.equal(opened,false);assert.equal(selected,false);
 assert.ok(!fs.readFileSync(require.resolve('../index.html'),'utf8').includes('export-copy-manual'));
 console.log('PASS: blocked automatic copying opens a selected-table dialog; successful copying does not open the manual alternative.');
})().catch(error=>{console.error(error);process.exitCode=1;});
