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
const context=vm.createContext({
 document:{getElementById:element,querySelectorAll:()=>[]},
 window:{INDICATORS:indicators},location:{protocol:'file:'},
 localStorage:{getItem:()=>null,setItem(){}},
 ProfileCore:require('../core.js'),ProfileTable:require('../table.js'),Intl,setTimeout
});
vm.runInContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
context.fixture={source:'test.csv',headers:['ID2','SEXE','estudi','ANY','PRIMER_PROBLEMA','MENCIO_TEMES_Habitatge'],rows:[
 ['A','Home','Test','2026','Inseguretat','1'],
 ['A','Dona','Test','2026','Inseguretat','0'],
 ['B','Home','Test','2025','Habitatge','1']
]};
vm.runInContext('adoptData(fixture)',context);
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
