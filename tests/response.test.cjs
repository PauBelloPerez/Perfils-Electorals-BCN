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
element('percentage-decimals').value='0';element('percentage-decimals').onchange();
assert.ok(element('reference').innerHTML.includes('67%'));
assert.ok(element('table').innerHTML.includes('66,7%')===false);
assert.ok(element('table').innerHTML.includes('67%'));
element('export').onclick();assert.ok(exported.includes('"67"'));
element('percentage-decimals').value='2';element('percentage-decimals').onchange();
assert.ok(element('reference').innerHTML.includes('66,67%'));
assert.ok(element('table').innerHTML.includes('66,67%'));
element('export').onclick();assert.ok(exported.includes('"66,67"'));
element('percentage-decimals').value='1';element('percentage-decimals').onchange();
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
element('percentage-decimals').value='2';element('percentage-decimals').onchange();
assert.ok(element('table').innerHTML.includes('100,00%'));
element('export').onclick();assert.ok(exported.includes('"Menció problema"'));
assert.ok(exported.includes('"100,00"'));
element('sex').value='compare';element('sex').onchange();
assert.ok(element('table').innerHTML.includes('>Dona<small class="header-base">'));
vm.runInContext('reset()',context);assert.equal(element('sex').value,'compare');
assert.equal(element('group-by').value,'ID2');
// Old CSVs continue to work, with unavailable controls disabled.
context.fixture.headers=context.fixture.headers.slice(0,6);
context.fixture.rows=context.fixture.rows.map(r=>r.slice(0,6));
vm.runInContext('adoptData(fixture)',context);
assert.ok(element('sex').innerHTML.includes('value="PERFIL_POLITIC" disabled'));
assert.ok(element('group-by').innerHTML.includes('value="DISTRICTE" disabled'));
console.log('PASS: district and PSC controls, charts, tables, collection exports, reset and CSVs lacking the new columns.');

// Service usage uses the collection UI with independent valid bases per service.
context.servicesFixture={source:'services.csv',headers:['ID2','SEXE','estudi','ANY','US_APARCA','US_METRO'],rows:[
 ['A','Dona','Services','2026','Utilitza',null],
 ['A','Dona','Services','2026','No utilitza','Utilitza'],
 ['B','Home','Services','2026','Utilitza','No utilitza']
]};
vm.runInContext(`catalog.push({id:'US_APARCA',label:'Ús: Aparcament',group:'Serveis i espai públic'}, {id:'US_METRO',label:'Ús: Metro',group:'Serveis i espai públic'});adoptData(servicesFixture);`,context);
assert.ok(element('catalog').innerHTML.includes('data-id="__US_SERVEIS"'));
assert.ok(element('catalog').innerHTML.includes('data-id="US_APARCA"'));
const usageButton={dataset:{id:'__US_SERVEIS'}};
element('catalog').querySelectorAll=()=>[usageButton];
vm.runInContext("tableOptions.orientation='rows';navigation()",context);
usageButton.onclick();
assert.equal(element('table-orientation').value,'columns');
assert.equal(element('response').value,'Utilitza');
assert.equal(element('response-control').hidden,false);
assert.equal(element('chart-tab').disabled,true);
assert.ok(element('table').innerHTML.includes('scope="row" class="row-label">Aparcament</th>'));
assert.ok(element('table').innerHTML.includes('scope="row" class="row-label">Metro</th>'));
assert.ok(element('table').innerHTML.includes('Resposta: Utilitza'));
assert.ok(!element('table').innerHTML.includes('Menció problema'));
vm.runInContext("state.sex='all';render()",context);
assert.equal(vm.runInContext("result.reference.cells.US_APARCA.n",context),3);
assert.equal(vm.runInContext("result.reference.cells.US_METRO.n",context),2);
assert.equal(vm.runInContext("result.reference.cells.US_APARCA.count",context),2);
assert.ok(element('table').innerHTML.includes('n variable'));
assert.ok(element('table').innerHTML.includes('title="Base de 3 respostes vàlides · 0 excloses"'));
assert.ok(!/<td\b[^>]*>[\s\S]*?<small>n=/.test(element('table').innerHTML));
element('response').value='No utilitza';element('response').onchange();
assert.equal(vm.runInContext("result.reference.cells.US_APARCA.count",context),1);
assert.equal(vm.runInContext("result.reference.cells.US_METRO.count",context),1);
assert.ok(element('table').innerHTML.includes('Resposta: No utilitza'));
element('export').onclick();
assert.ok(exported.includes('"Ús de serveis municipals"'));
assert.ok(exported.includes('"No utilitza"'));
context.TableExport={capture:(_table,metadata)=>metadata};
element('table').querySelector=()=>({});
const usageExport=vm.runInContext('exportSnapshot()',context);
assert.ok(usageExport.title.includes('Ús: Tots els serveis'));
assert.ok(usageExport.title.endsWith('No utilitza'));
assert.equal(usageExport.fixedColumns,2);
vm.runInContext("state.profiles=['A'];render()",context);
assert.equal(vm.runInContext("result.reference.cells.US_APARCA.n",context),2);
assert.equal(vm.runInContext("result.reference.cells.US_METRO.n",context),1);
assert.equal(vm.runInContext("result.reference.cells.US_METRO.count",context),0);
vm.runInContext("state.indicator='US_APARCA';response='';render()",context);
assert.equal(element('response').value,'Utilitza');
assert.equal(element('chart-tab').disabled,false);
element('catalog').querySelectorAll=()=>[];
context.servicesFixture.headers=context.servicesFixture.headers.slice(0,5);
context.servicesFixture.rows=context.servicesFixture.rows.map(row=>row.slice(0,5));
vm.runInContext("adoptData(servicesFixture);state.indicator='__US_SERVEIS';response='';render()",context);
assert.equal(vm.runInContext('result.series.length',context),1);
assert.equal(element('response').value,'Utilitza');
assert.ok(element('table').innerHTML.includes('<small class="header-base">n=3</small>'));
console.log('PASS: service collection navigation, default response, service rows, per-service bases, response changes, filters, CSV and partial datasets.');

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
