const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({TableExport:require('../table-export.js')});
vm.runInContext(fs.readFileSync(require.resolve('../table-image.js'),'utf8'),context);
const cell=(r,c,text,extra={})=>({r,c,text,rs:1,cs:1,bg:'FFFFFF',bold:false,...extra});
const model={title:'Ús de serveis',context:'Sense ponderar',description:'Prova',caption:'Base pròpia',note:'',rows:4,headerRows:2,columns:3,fixedColumns:1,cells:[
 cell(0,0,'Resposta',{rs:2,bold:true}),cell(0,1,'Grup',{cs:2,bold:true}),
 cell(1,1,'Dona',{bold:true}),cell(1,2,'Home',{bold:true}),
 cell(2,0,'Base (n)',{baseRow:true}),cell(2,1,'120\n5 excloses',{baseRow:true}),cell(2,2,'110\n2 excloses',{baseRow:true}),
 cell(3,0,'Biblioteca'),cell(3,1,'25,0%\n30 respostes',{bg:'C5DDD9'}),cell(3,2,'10,0%\n11 respostes')
]};
function documentMock({nullContext=false,nullBlob=false}={}){
 const texts=[],rects=[];
 const ctx={font:'',measureText:s=>({width:Array.from(s).length*7}),scale(){},fillRect(...args){rects.push(args);},strokeRect(){},fillText(text,x,y){texts.push({text,x,y});}};
 const canvas={getContext:()=>nullContext?null:ctx,toBlob:callback=>callback(nullBlob?null:{type:'image/png'})};
 return {doc:{createElement:()=>canvas},canvas,texts,rects};
}
(async()=>{
 const original=JSON.stringify(model),normal=documentMock();
 assert.equal((await context.TableImage.png(model,{},normal.doc)).type,'image/png');
 const texts=normal.texts.map(t=>t.text);
 for(const value of ['Ús de serveis','Grup','Dona','Home','Biblioteca','25,0%','n = 30','n = 120','n = 110'])assert.ok(texts.includes(value),value);
 assert.ok(!texts.some(t=>t.includes('excloses')||t.includes('Base (n)')));
 assert.equal(JSON.stringify(model),original);
 const compact=documentMock();await context.TableImage.png(model,{compact:true},compact.doc);
 assert.ok(compact.canvas.height<normal.canvas.height);
 const wide={...model,rows:2,headerRows:1,columns:27,fixedColumns:2,cells:[...Array.from({length:27},(_,c)=>cell(0,c,'H'+c,{bold:true})),...Array.from({length:27},(_,c)=>cell(1,c,'V'+c))]};
 const whole=documentMock(),split=documentMock();
 await context.TableImage.png(wide,{},whole.doc);await context.TableImage.png(wide,{split:true},split.doc);
 assert.ok(split.canvas.width<whole.canvas.width);
 assert.ok(split.texts.some(t=>t.text.startsWith('Bloc 2 de ')));
 for(let c=0;c<27;c++)assert.ok(split.texts.some(t=>t.text==='V'+c));
 const tallLabel={...model,cells:model.cells.map(c=>c.r===0&&c.c===0?{...c,text:'Label '.repeat(150)}:c)},wrapped=documentMock();
 await context.TableImage.png(tallLabel,{},wrapped.doc);
 assert.ok(wrapped.canvas.height>normal.canvas.height);
 assert.ok(wrapped.texts.every(t=>Number.isFinite(t.x)&&Number.isFinite(t.y)&&t.y<wrapped.canvas.height/2));
 await assert.rejects(()=>context.TableImage.png(model,{},documentMock({nullContext:true}).doc),/navegador/);
 await assert.rejects(()=>context.TableImage.png(model,{},documentMock({nullBlob:true}).doc),/crear la imatge/);
 await assert.rejects(()=>context.TableImage.png({...wide,columns:200},{},documentMock().doc),/massa ampla/);
 console.log('PASS: image drawing preserves text, merged headers, bases, all block columns and source model; compact size, wrapping and canvas failures.');
})().catch(error=>{console.error(error);process.exitCode=1;});
