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
context.fixture={source:'test.csv',headers:['ID2','SEXE','estudi','ANY','PRIMER_PROBLEMA','MENCIO_TEMES_Habitatge','DISTRICTE','PERFIL_POLITIC','MENCIO_TEMES_Turisme'],rows:[
 ['A','Home','Test','2026','Inseguretat','1','Ciutat Vella',"Satisfets d'esquerres",'1'],
 ['A','Dona','Test','2026','Inseguretat','0','Ciutat Vella','No simpatitzants',null],
 ['B','Home','Test','2025','Habitatge','1','Eixample',null,'1']
]};
vm.runInContext('adoptData(fixture)',context);
element('multi-panel').open=true;
for(const id of ['PRIMER_PROBLEMA','PERFIL_POLITIC']){
  element('multi-options').onchange({target:{value:id,checked:true}});
}
const combined=element('multi-table').innerHTML;
assert.match(combined,/<thead><tr><th rowspan="2" scope="col" class="row-label">Indicador<\/th><th rowspan="2" scope="col">Categoria<\/th>/);
assert.match(combined,/<th id="multi-profile-1" scope="colgroup" colspan="2" class="profile-heading group-start">A<\/th>/);
assert.match(combined,/<th id="multi-subgroup-1" headers="multi-profile-1" scope="col" class="group-start">Dona<\/th><th id="multi-subgroup-2" headers="multi-profile-1" scope="col" class="">Home<\/th>/);
assert.equal((combined.match(/<th>Base \(n\)<\/th>/g)||[]).length,2);
assert.ok(combined.includes('<th>Base (n)</th><td>3</td>'));
assert.ok(combined.includes('<th>Base (n)</th><td>2</td>'));
assert.ok(combined.includes('33,3%'));
assert.equal(element('multi-mention-control').hidden,true);
element('multi-search').value='tots els problemes';element('multi-search').oninput();
assert.ok(element('multi-options').innerHTML.includes('value="__MENCIO_PROBLEMA"'));
for(const id of ['__MENCIO_PROBLEMA','MENCIO_TEMES_Habitatge']){
  element('multi-options').onchange({target:{value:id,checked:true}});
}
assert.equal(element('multi-mention-control').hidden,false);
assert.equal(element('multi-mention-response').value,'1');
assert.equal(element('multi-count').textContent,'4 indicadors seleccionats');
assert.match(element('multi-table').innerHTML,/Menció: Habitatge<\/th><th>Base \(n\)<\/th><td>3<\/td>/);
assert.match(element('multi-table').innerHTML,/Menció: Turisme<\/th><th>Base \(n\)<\/th><td>2<\/td>/);
assert.match(element('multi-table').innerHTML,/>Sí<\/th><td data-share="1">100,0%<\/td>/);
element('multi-mention-response').value='0';element('multi-mention-response').onchange();
assert.match(element('multi-table').innerHTML,/>No<\/th><td data-share="0">0,0%<\/td>/);
assert.ok(!element('multi-table').innerHTML.includes('NaN'));
const multiTable=element('multi-table');
multiTable.querySelector=()=>multiTable.innerHTML;
context.TableExport={capture:table=>table,xlsx:table=>table};
element('multi-export').onclick();
assert.equal(exported,multiTable.innerHTML);
element('sex').value='Dona';element('sex').onchange();
assert.match(element('multi-table').innerHTML,/Menció: Turisme<\/th><th>Base \(n\)<\/th><td>0<\/td>/);
assert.match(element('multi-table').innerHTML,/>No<\/th><td>—<\/td>/);
element('sex').value='compare';element('sex').onchange();
element('multi-options').onchange({target:{value:'__MENCIO_PROBLEMA',checked:false}});
assert.equal(element('multi-mention-control').hidden,true);
assert.equal(element('multi-count').textContent,'3 indicadors seleccionats');
assert.ok(element('multi-table').innerHTML.includes('Menció: Habitatge'));
assert.ok(!element('multi-table').innerHTML.includes('Menció: Turisme'));
element('multi-options').onchange({target:{value:'MENCIO_TEMES_Habitatge',checked:false}});
element('multi-search').value='';element('multi-search').oninput();
for(const id of ['PRIMER_PROBLEMA','PERFIL_POLITIC']){
  element('multi-options').onchange({target:{value:id,checked:false}});
}
assert.equal(element('multi-export').disabled,true);
element('multi-panel').open=false;
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
assert.ok(!element('multi-options').innerHTML.includes('value="__MENCIO_PROBLEMA"'));
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

context.politicalFixture={source:'politics.csv',headers:['ID2','SEXE','estudi','ANY','PRIMER_PROBLEMA','PERFIL_POLITIC','MENCIO_TEMES_Habitatge'],rows:[
 ['A','Dona','Test','2025','Habitatge',"Satisfets d'esquerres",'1'],
 ['A','Home','Test','2026','Habitatge',"Simpatitzants o exvotants decidament d'esquerres",'1'],
 ['A','Dona','Test','2026','Inseguretat','No simpatitzants','0'],
 [null,'Dona','Test','2026','Habitatge','No simpatitzants','1'],
 ['A','Home','Other','2026','Inseguretat',null,'0']
]};
vm.runInContext('adoptData(politicalFixture)',context);
assert.equal(element('political-controls').hidden,true);
assert.match(element('sex').innerHTML,/value="BLOC_POLITIC_SEXE"\s*>Bloc polític × sexe/);
element('sex').value='BLOC_POLITIC_SEXE';element('sex').onchange();
assert.equal(element('political-controls').hidden,false);
assert.ok(element('political-scope').innerHTML.includes('Test · 2026'));
assert.ok(!element('political-scope').innerHTML.includes('Other'));
assert.ok(!element('profile-options').innerHTML.includes('Sense perfil'));
assert.ok(element('legend').innerHTML.includes('Home · Bloc d’esquerres'));
assert.equal(element('valid-n').textContent,'3');
element('multi-panel').open=true;
element('multi-options').onchange({target:{value:'__MENCIO_PROBLEMA',checked:true}});
assert.match(element('multi-table').innerHTML,/<th id="multi-profile-1" scope="colgroup" colspan="4" class="profile-heading group-start">A<\/th>/);
const politicalHeaders=element('multi-table').innerHTML.match(/<thead>(.*?)<\/thead>/)[1];
assert.equal((politicalHeaders.match(/<tr>/g)||[]).length,3);
assert.match(politicalHeaders,/<th rowspan="3" scope="col" class="row-label">Indicador<\/th>/);
assert.match(politicalHeaders,/<th [^>]*headers="multi-profile-0"[^>]*rowspan="2">Total<\/th>/);
assert.match(politicalHeaders,/<th id="multi-sex-1" headers="multi-profile-1" colspan="2" class="sex-heading group-start">Dona<\/th>/);
assert.match(politicalHeaders,/<th id="multi-sex-3" headers="multi-profile-1" colspan="2" class="sex-heading sex-start">Home<\/th>/);
assert.equal((politicalHeaders.match(/headers="multi-profile-1 multi-sex-[13]"/g)||[]).length,4);
assert.ok(!politicalHeaders.includes('Dona ·')&&!politicalHeaders.includes('Home ·'));
assert.match(element('table').innerHTML,/<th id="table-sex-1" headers="table-profile-1" colspan="2" class="sex-heading group-start">Dona<\/th>/);
assert.match(element('multi-table').innerHTML,/<th>Base \(n\)<\/th><td><i [^>]+><\/i>3<\/td>/);
element('political-scope').value=JSON.stringify({study:'Test',year:'2026'});element('political-scope').onchange();
assert.equal(element('valid-n').textContent,'2');
assert.match(element('multi-table').innerHTML,/<th>Base \(n\)<\/th><td><i [^>]+><\/i>2<\/td>/);
assert.ok(element('grouping-note').textContent.includes('1 registres fora del creuament'));
element('export').onclick();
assert.ok(exported.includes('"Test";"2026";"Sense ponderar"'));
assert.ok(exported.includes('"A";"Home";"BLOC_POLITIC_SEXE";"Bloc polític × sexe";"Home · Bloc d’esquerres"'));
assert.ok(vm.runInContext('exportSnapshot()',context).context.includes('Test · 2026'));
assert.equal(element('multi-volume-control').hidden,true);
context.ProfileData=require('../data-loader.js');
vm.runInContext(`
  volumeData=new Map(result.groups.map((g,i)=>[JSON.stringify([result.groupBy,result.breakdownBy,g.profile,g.subgroup]),[210,320,150,420][i]]));
  render();
`,context);
assert.equal(element('multi-volume-control').hidden,false);
assert.match(element('multi-table').innerHTML,/<\/thead><tbody><tr class="volume-row">/);
assert.match(element('multi-table').innerHTML,/colspan="2">Volum del perfil \(persones\)<\/th><td data-volume="1100">/);
const multiVolume=element('multi-volume-position');
multiVolume.value='last';multiVolume.onchange();
assert.equal(element('table-volume-position').value,'last');
assert.match(element('multi-table').innerHTML,/>Conjunt seleccionat<\/th><th [^>]*>A<\/th><\/tr>/);
assert.match(element('multi-table').innerHTML,/<\/tbody><tbody><tr class="volume-row">.*<\/tr><\/tbody><\/table>$/);
assert.match(element('table').innerHTML,/<tr class="volume-row">.*<\/tr><\/tbody><\/table>$/);
element('table-orientation').value='rows';element('table-orientation').onchange();
assert.match(element('table').innerHTML,/>Volum del perfil \(persones\)<\/th><\/tr><\/thead>/);
element('table-orientation').value='columns';element('table-orientation').onchange();
element('table-volume-position').value='first';element('table-volume-position').onchange();
assert.equal(multiVolume.value,'first');
assert.match(element('multi-table').innerHTML,/<\/thead><tbody><tr class="volume-row">/);
assert.equal(vm.runInContext('exportSnapshot()',context).fixedColumns,2);
element('sex').value='BLOC_POLITIC';element('sex').onchange();
assert.equal(element('valid-n').textContent,'2');
assert.ok(element('legend').innerHTML.includes('Resta de perfils polítics'));
assert.ok(!element('legend').innerHTML.includes('Home ·'));
element('sex').value='compare';element('sex').onchange();
assert.equal(element('political-controls').hidden,true);
assert.equal(element('valid-n').textContent,'5');
element('multi-panel').open=false;
console.log('PASS: political block controls, filtered multi-indicator bases, CSV and formatted export metadata, and ordinary breakdowns.');

const modelColumns=['VAL_GESTIO','EVO1A_BARRI','FUTUR_BARRI','EVO1A_BCN','FUTUR_BCN'];
context.modelFixture={source:'models.csv',headers:[
 'ID2','SEXE','estudi','ANY','PRIMER_PROBLEMA','MENCIO_TEMES_Habitatge','MENCIO_TEMES_Turisme',...modelColumns
],rows:[['A','Dona','Test','2026','Habitatge','1','0','Bona','Millora','Millorarà','Igual','Millorarà']]};
vm.runInContext('adoptData(modelFixture)',context);
element('multi-panel').open=true;
const modelPicker=element('multi-model');
const selectModel=value=>{modelPicker.value=value;modelPicker.onchange();};
const setIndicator=(value,checked)=>element('multi-options').onchange({target:{value,checked}});
const selectedIndicators=()=>JSON.parse(vm.runInContext('JSON.stringify([...multiSelection().indicators])',context));
assert.match(modelPicker.innerHTML,/value="builtin-0">Gestió, evolució i futur/);
assert.match(modelPicker.innerHTML,/value="builtin-4" disabled>Ús de serveis municipals/);
element('multi-search').value='habitatge';
selectModel('builtin-0');
assert.deepEqual(selectedIndicators(),modelColumns);
assert.equal(element('multi-search').value,'');
setIndicator('EVO1A_BARRI',false);
setIndicator('PRIMER_PROBLEMA',true);
assert.deepEqual(selectedIndicators(),['VAL_GESTIO','FUTUR_BARRI','EVO1A_BCN','FUTUR_BCN','PRIMER_PROBLEMA']);
assert.equal(modelPicker.value,'');
element('multi-selected-only').checked=true;
element('multi-selected-only').onchange();
assert.ok(!element('multi-options').innerHTML.includes('value="EVO1A_BARRI"'));
selectModel('builtin-2');
assert.deepEqual(selectedIndicators(),['PRIMER_PROBLEMA','MENCIO_TEMES_Habitatge','MENCIO_TEMES_Turisme']);
setIndicator('MENCIO_TEMES_Turisme',false);
assert.deepEqual(selectedIndicators(),['PRIMER_PROBLEMA','MENCIO_TEMES_Habitatge']);
assert.equal(element('multi-mention-control').hidden,false);
assert.ok(!element('multi-table').innerHTML.includes('Menció: Turisme'));
const storedModels=new Map();
context.localStorage.setItem=(key,value)=>storedModels.set(key,value);
element('multi-model-name').value='Selecció de treball';
element('multi-model-form').onsubmit({preventDefault(){}});
const saved=JSON.parse(storedModels.get('perfils-indicator-models'));
assert.deepEqual(saved,[{name:'Selecció de treball',ids:['PRIMER_PROBLEMA','__MENCIO_PROBLEMA'],omitted:['MENCIO_TEMES_Turisme']}]);
assert.match(modelPicker.innerHTML,/value="saved-0">Selecció de treball/);
selectModel('builtin-1');
assert.deepEqual(selectedIndicators(),['VAL_GESTIO','FUTUR_BCN','FUTUR_BARRI']);
selectModel('saved-0');
assert.deepEqual(selectedIndicators(),['PRIMER_PROBLEMA','MENCIO_TEMES_Habitatge']);
setIndicator('MENCIO_TEMES_Habitatge',false);
assert.equal(element('multi-mention-control').hidden,true);
context.partialModelFixture={...context.modelFixture,headers:context.modelFixture.headers.slice(0,-1),rows:context.modelFixture.rows.map(row=>row.slice(0,-1))};
vm.runInContext('adoptData(partialModelFixture)',context);
selectModel('builtin-0');
assert.deepEqual(selectedIndicators(),modelColumns.slice(0,-1));
assert.match(element('multi-model-status').textContent,/omès un indicador/);
assert.equal(element('multi-count').textContent,'4 indicadors seleccionats');
element('multi-panel').open=false;
console.log('PASS: editable indicator models, per-mention exclusions, saved selections, and missing CSV columns.');

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
