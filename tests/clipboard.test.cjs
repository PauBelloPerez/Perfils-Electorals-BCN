const assert=require('node:assert/strict'),E=require('../table-export.js');
const model={title:'Taula',description:'Test',context:'Sense ponderar',caption:'Base',note:'n < 30',rows:1,columns:1,headerRows:1,cells:[{r:0,c:0,text:'Habitatge',rs:1,cs:1,bg:'FFFFFF',bold:true,align:'left'}]};
function environment({modern='reject',legacy=true,throwLegacy=false,event=true}={}){
 const writes=[],restored=[],listeners=new Map(),saved={cloneRange(){return this;}},selection={rangeCount:1,getRangeAt:()=>saved,removeAllRanges(){},addRange:r=>restored.push(r)};
 let removed=false,focused=false,commands=0;
 const container={style:{},focus(){},remove(){removed=true;}};
 const doc={getSelection:()=>selection,activeElement:{focus(){focused=true;}},createElement:()=>container,querySelector:()=>null,body:{appendChild(){}},createRange:()=>({selectNodeContents(){}}),addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),execCommand:()=>{
  commands++;if(throwLegacy)throw Error('Blocked');
  if(event)listeners.get('copy')({clipboardData:{setData:(type,value)=>writes.push([type,value])},preventDefault(){}});
  return legacy;
 }};
 const env={document:doc,Blob:class{constructor(parts,options){this.parts=parts;this.type=options.type;}},ClipboardItem:class{constructor(data){this.data=data;}},navigator:modern==='absent'?{}:{clipboard:{write:async items=>{if(modern==='reject')throw Error('NotAllowedError');writes.push(items);}}}};
 return {env,writes,checkClean(){assert.ok(removed);assert.ok(focused);assert.equal(listeners.size,0);assert.equal(restored.at(-1),saved);},commands:()=>commands};
}
(async()=>{
 const modern=environment({modern:'ok'});assert.equal(await E.copyFormatted(model,modern.env),true);assert.equal(modern.commands(),0);
 assert.deepEqual(Object.keys(modern.writes[0][0].data),['text/html','text/plain']);
 for(const mode of ['reject','absent']){
  const test=environment({modern:mode});assert.equal(await E.copyFormatted(model,test.env),true);test.checkClean();
  assert.equal(test.writes[0][0],'text/html');assert.ok(test.writes[0][1].includes('Habitatge'));assert.equal(test.writes[1][0],'text/plain');
 }
 for(const options of [{legacy:false},{throwLegacy:true},{event:false}]){
  const test=environment(options);assert.equal(await E.copyFormatted(model,test.env),false);test.checkClean();
 }
 const noAPI=environment({modern:'absent'});delete noAPI.env.document.execCommand;
 assert.equal(await E.copyFormatted(model,noAPI.env),false);
 assert.equal(await E.copyFormatted(model,{}),false);
 console.log('PASS: rich clipboard success, denied/absent API fallback, failed commands request manual copy, focus/selection restored and temporary content removed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
