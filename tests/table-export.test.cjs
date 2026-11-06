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
const parts=E.panels(model);
assert.equal(parts.length,2);assert.ok(parts.every(p=>p.columns===8));
assert.deepEqual(parts.map(p=>p.cells.find(c=>c.r===0&&c.c===2).text),['Ciutat Vella','Eixample']);
assert.ok(parts.every(p=>p.cells.some(c=>c.text==='Conjunt seleccionat')));
assert.equal(parts.flatMap(p=>p.cells.filter(c=>c.r===2&&c.c>=2)).length,12);
const oversized={...model,columns:14,fixedColumns:1,cells:[cell(0,0,'Resposta',{rs:2}),cell(0,1,'Grup gran',{cs:13}),...model.cells.filter(c=>c.r>0)]};
assert.equal(E.panels(oversized).length,2);
assert.ok(E.panels(oversized).every(p=>p.cells.some(c=>c.text==='Grup gran')));
const rowModel={...model,columns:9,fixedColumns:3,headerRows:1,rows:3,cells:[...Array.from({length:9},(_,i)=>cell(0,i,`H${i}`,{bold:true})),cell(1,0,'Ciutat Vella',{rs:2}),...Array.from({length:8},(_,i)=>cell(1,i+1,`A${i}`)),...Array.from({length:8},(_,i)=>cell(2,i+1,`B${i}`))]};
assert.equal(E.panels(rowModel).length,2);assert.ok(E.panels(rowModel).every(p=>p.cells.find(c=>c.text==='Ciutat Vella').rs===2));
assert.ok(E.html(model).includes('colspan="6"'));
assert.ok(E.html(model).includes('background-color:#C5DDD9'));
assert.ok(E.html(model).includes('&lt;text&gt;'));
assert.ok(E.html(model).includes('mso-number-format:'));
assert.ok(E.tsv(model).includes("'=1+1"));
assert.ok(E.tsv(model).includes('• 50,0% · 2 respostes · n=4 · 1 excloses'));
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
assert.ok(files['xl/worksheets/sheet1.xml'].includes('topLeftCell="C9"'));
assert.ok(E.printHTML(model).includes('Bloc 2 de 2'));
console.log('PASS: formatted XLSX merges, percentages, fills and freeze panes; safe copied text/HTML; print blocks preserve all columns and repeat labels.');
