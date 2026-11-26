const assert=require('node:assert/strict');
const E=require('../table-export.js');
const cell=(r,c,text,extra={})=>({r,c,text,rs:1,cs:1,bg:'FFFFFF',bold:false,align:'center',...extra});
const model={title:'Menció: Habitatge',description:'Descripció amb accents & <text>',context:'DISTRICTE · PERFIL_POLITIC · Sense ponderar',caption:'Base pròpia per grup',note:'• n < 30',headerRows:2,rows:4,columns:14,fixedColumns:2,cells:[
 cell(0,0,'Resposta',{rs:2,bold:true,align:'left'}),cell(0,1,'Conjunt seleccionat',{bold:true}),
 cell(0,2,'Ciutat Vella',{cs:6,bold:true,bg:'EAF2EE'}),cell(0,8,'Eixample',{cs:6,bold:true,bg:'EAF2EE'}),
 ...Array.from({length:13},(_,i)=>cell(1,i+1,i===0?'Total':`Categoria ${i}`,{bold:true})),
 cell(2,0,'Habitatge',{bold:true}),...Array.from({length:13},(_,i)=>cell(2,i+1,'25,0%',{bg:'C5DDD9'})),
 cell(3,0,'=1+1'),...Array.from({length:13},(_,i)=>cell(3,i+1,'• 50,0%\n2 respostes\nn=4 · 1 excloses'))
]};
const parts=E.panels(model,8);
assert.equal(parts.length,2);assert.ok(parts.every(p=>p.columns===8));
assert.deepEqual(parts.map(p=>p.cells.find(c=>c.r===0&&c.c===2).text),['Ciutat Vella','Eixample']);
assert.ok(parts.every(p=>p.cells.some(c=>c.text==='Conjunt seleccionat')));
assert.equal(parts.flatMap(p=>p.cells.filter(c=>c.r===2&&c.c>=2)).length,12);
const oversized={...model,columns:14,fixedColumns:1,cells:[cell(0,0,'Resposta',{rs:2}),cell(0,1,'Grup gran',{cs:13}),...model.cells.filter(c=>c.r>0)]};
assert.equal(E.panels(oversized,8).length,2);
assert.ok(E.panels(oversized,8).every(p=>p.cells.some(c=>c.text==='Grup gran')));
const rowModel={...model,columns:9,fixedColumns:3,headerRows:1,rows:3,cells:[...Array.from({length:9},(_,i)=>cell(0,i,`H${i}`,{bold:true})),cell(1,0,'Ciutat Vella',{rs:2}),...Array.from({length:8},(_,i)=>cell(1,i+1,`A${i}`)),...Array.from({length:8},(_,i)=>cell(2,i+1,`B${i}`))]};
assert.equal(E.panels(rowModel,8).length,2);assert.ok(E.panels(rowModel,8).every(p=>p.cells.find(c=>c.text==='Ciutat Vella').rs===2));
assert.equal((E.html(model).match(/<table /g)||[]).length,1);
assert.equal((E.html(model).match(/Conjunt seleccionat/g)||[]).length,1);
assert.ok(E.html(model).includes('#df2429'));
assert.ok(E.html(model).includes('#222933'));
assert.ok(E.html(model).includes('n&nbsp;=&nbsp;2'));
assert.ok(E.html(model,{compact:true}).includes('font-size:6pt'));
assert.ok(E.html(model,{compact:true}).includes('font-size:7.5pt'));
assert.ok(E.html(model).includes('<col width="18%"'));
assert.ok(!E.html(model).includes('<font face='));
assert.ok(!E.html(model).includes('2 respostes'));
assert.ok(E.html(model).includes('align="center"'));
assert.ok(E.html(model).includes('line-height:100%'));
assert.ok(E.html(model,{compact:true}).includes('padding:1pt 2pt'));
assert.ok(E.panels(model,10).every(p=>p.columns<=10));
assert.equal(E.panels(model,10).flatMap(p=>p.cells.filter(c=>c.r===2&&c.c>=2)).length,12);
assert.ok(!E.html(model).includes('1 excloses'));
assert.ok(E.panels(model,6).every(p=>p.columns<=6));
assert.equal(E.panels(model,6).flatMap(p=>p.cells.filter(c=>c.r===2&&c.c>=2)).length,12);
assert.ok(E.html(model).includes('background-color:#C5DDD9'));
assert.ok(E.html(model).includes('&lt;text&gt;'));
assert.ok(E.html(model).includes('mso-number-format:'));
assert.ok(E.tsv(model).includes("'=1+1"));
assert.ok(E.tsv(model).includes('• 50,0% · n = 2 · n=4'));
const withBases={...model,rows:5,cells:[...model.cells.filter(c=>c.r<2),cell(2,0,'Base (n)',{baseRow:true}),...Array.from({length:13},(_,i)=>cell(2,i+1,`${i===0?'• ':''}${100+i}\n${10+i} excloses`,{baseRow:true})),...model.cells.filter(c=>c.r>=2).map(c=>({...c,r:c.r+1}))]};
const compact=E.compactBases(withBases);
assert.equal(compact.rows,4);
assert.ok(!compact.cells.some(c=>c.baseRow));
assert.equal(compact.cells.find(c=>c.r===1&&c.c===1).columnBase,'n = • 100');
assert.ok(E.html(withBases,{compact:true}).includes('font-size:6pt'));
assert.ok(E.html(withBases).includes('n&nbsp;=&nbsp;•&nbsp;100'));
assert.ok(!E.html(withBases).includes('Base (n)'));
assert.ok(E.tsv(withBases).includes('n = • 100'));
assert.ok(!E.html(withBases).includes('10 excloses'));
assert.equal(E.compactBases(model),model);
assert.equal(E.compactBases({...withBases,cells:withBases.cells.filter(c=>!(c.r===1&&c.c===1))}).rows,5);
const withVolumes={...withBases,rows:6,cells:[
 ...withBases.cells.map(c=>c.r>=2?{...c,r:c.r+1}:c),
 cell(2,0,'Volum del perfil (persones)',{bold:true}),cell(2,1,'712.887',{volume:712887})
]};
assert.equal(E.compactBases(withVolumes).cells.find(c=>c.r===1&&c.c===1).columnBase,'n = • 100');
assert.ok(E.html(withVolumes).includes('712.887'));
assert.ok(Buffer.from(E.xlsx(withVolumes)).includes(Buffer.from('<v>712887</v>')));
assert.equal(E.background('rgba(22, 118, 109, 0.3)'),'B9D6D3');
const bytes=E.xlsx(model);assert.equal(bytes[0],0x50);assert.equal(bytes[1],0x4b);
// Extract stored ZIP entries to check the exported document rather than private writer state.
const archive=Buffer.from(bytes),files={};let offset=0;
while(archive.readUInt32LE(offset)===0x04034b50){
 const size=archive.readUInt32LE(offset+18),length=archive.readUInt16LE(offset+26),extra=archive.readUInt16LE(offset+28);
 const start=offset+30+length+extra;files[archive.subarray(offset+30,offset+30+length).toString()]=archive.subarray(start,start+size).toString();offset=start+size;
}
assert.equal(Object.keys(files).length,6);
assert.ok(files['xl/worksheets/sheet1.xml'].includes('<mergeCell ref="C7:H7"/>'));
assert.ok(files['xl/worksheets/sheet1.xml'].includes('<mergeCell ref="A7:A8"/>'));
assert.ok(files['xl/worksheets/sheet1.xml'].includes('<v>0.25</v>'));
assert.ok(files['xl/worksheets/sheet1.xml'].includes('=1+1</t>'));
assert.ok(!files['xl/worksheets/sheet1.xml'].includes('<f>'));
assert.ok(files['xl/styles.xml'].includes('FFC5DDD9'));
assert.ok(files['xl/styles.xml'].includes('formatCode="0.0%"'));
for(const decimals of [0,1,2]){
 const xlsx=Buffer.from(E.xlsx({...model,decimals}));
 const marker=Buffer.from(`formatCode="${decimals?'0.'+'0'.repeat(decimals):'0'}%"`);
 assert.ok(xlsx.includes(marker),`XLSX percent format for ${decimals} decimals`);
}
assert.ok(files['xl/worksheets/sheet1.xml'].includes('topLeftCell="C9"'));
assert.ok(E.printHTML(model,{split:true}).includes('Bloc 2 de 2'));
console.log('PASS: formatted XLSX merges, percentages, fills and freeze panes; safe copied text/HTML; print blocks preserve all columns and repeat labels.');

// Wide report tables stay whole by default, including the plain clipboard format.
const wide={...model,headerRows:1,rows:3,columns:27,fixedColumns:2,cells:[
 ...Array.from({length:27},(_,c)=>cell(0,c,'Header '+c,{bold:true})),
 ...Array.from({length:27},(_,c)=>cell(1,c,'Value '+c)),
 ...Array.from({length:27},(_,c)=>cell(2,c,'Last '+c))
]};
assert.equal((E.html(wide).match(/<table /g)||[]).length,1);
assert.ok(!E.html(wide).includes('Bloc '));
assert.equal(E.tsv(wide).split('\r\n').find(line=>line.startsWith('Value 0')).split('\t').length,27);
const split=E.reportParts(wide,{split:true});
assert.equal(split.length,Math.ceil(25/(E.MAX_COLUMNS_PER_BLOCK-2)));
assert.ok(split.every(part=>part.columns<=E.MAX_COLUMNS_PER_BLOCK));
assert.deepEqual(split.flatMap(part=>part.cells.filter(c=>c.r===1&&c.c>=2).map(c=>c.text)),Array.from({length:25},(_,i)=>'Value '+(i+2)));
assert.equal((E.html(wide,{split:true}).match(/<table /g)||[]).length,split.length);
assert.ok(E.tsv(wide,{split:true}).includes('Bloc 2 de '));
assert.ok(!E.printHTML(wide).includes('Bloc '));
assert.ok(E.html(model).includes('font-size:9pt'));
assert.ok(E.html(model).includes('padding:2pt 3pt'));
assert.ok(E.html(withBases,{compact:true}).includes('n&nbsp;=&nbsp;'));
assert.equal(E.panels(wide,0).length,1);
console.log('PASS: whole editable reports by default, optional configurable blocks, normal/compact typography and preserved bases.');

assert.throws(()=>E.panels(wide,2),/columnes fixes/);
assert.throws(()=>E.panels(wide,3.5),/enter positiu/);
// Editing the public constant changes the report output without other edits.
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../table-export.js'),'utf8');
for(const limit of [0,8,10,16]){
 const sandbox=vm.createContext({});
 vm.runInContext(source.replace('const MAX_COLUMNS_PER_BLOCK = 12;',`const MAX_COLUMNS_PER_BLOCK = ${limit};`),sandbox);
 const changed=sandbox.TableExport.reportParts(wide,{split:true});
 assert.equal(changed.length,limit?Math.ceil(25/(limit-2)):1);
 assert.equal(sandbox.TableExport.reportParts(wide).length,1);
}

// Category and sample base occupy separate paragraphs in both report densities.
const categoryHeader={...model,cells:model.cells.map(c=>c.r===1&&c.c===1?{...c,text:'Dona',columnBase:'n = 100'}:c)};
for(const compact of [false,true]){
 const header=E.html(categoryHeader,{compact}).match(/<th[^>]*>[^]*?Dona[^]*?<\/th>/)[0];
 assert.ok(/Dona<\/span><\/p><p [^>]*><nobr>n&nbsp;=&nbsp;100<\/nobr><\/p>/.test(header));
 assert.ok(header.includes('white-space:nowrap'));
 assert.ok(E.printHTML(categoryHeader,{compact}).includes('Dona</span></p><p '));
}
assert.ok(Buffer.from(E.xlsx(categoryHeader)).includes(Buffer.from('Dona\nn = 100')));

// Word must auto-fit narrow columns instead of breaking short subgroup labels.
for(const compact of [false,true])for(const text of ['Home','Dona','Total']){
 const sample={...categoryHeader,cells:categoryHeader.cells.map(c=>c.columnBase?{...c,text,columnBase:'n = 1105'}:c)};
 const markup=E.html(sample,{compact});
 assert.ok(markup.includes('table-layout:auto'));
 assert.ok(!markup.includes('mso-table-layout-alt:fixed'));
 const subgroup=markup.match(/<th[^>]*nowrap="nowrap"[^>]*>[^]*?<\/th>/)[0];
 assert.ok(subgroup.includes(text));
 assert.ok(subgroup.includes('white-space:nowrap'));
 assert.ok(subgroup.includes('<nobr>n&nbsp;=&nbsp;1105</nobr>'));
}
