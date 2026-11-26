const assert=require('node:assert/strict');
const {decode,loadDefault,loadVolumes,volumesFor}=require('../data-loader.js');
const {summarize}=require('../core.js');
const volumeSources=require('../data/volum-perfils.json');
const csv='\uFEFFID2;SEXE;estudi;ANY;PRIMER_PROBLEMA\r\nPerfil de prova;Home;Enquesta de prova;2026;Habitatge\r\n';
const raw=new TextEncoder().encode(csv).buffer;
async function run(){
 const loaded=await loadDefault(['PRIMER_PROBLEMA'],async(url,options)=>{
  assert.equal(url,'./data.csv');assert.equal(options.cache,'no-store');
  return {ok:true,arrayBuffer:async()=>raw};
 });
 assert.equal(loaded.source,'data.csv');assert.equal(loaded.rows.length,1);
 assert.equal(loaded.rows[0][4],'Habitatge');
 assert.equal(decode(raw,'manual.csv',['PRIMER_PROBLEMA']).source,'manual.csv');
 await assert.rejects(loadDefault(['PRIMER_PROBLEMA'],async()=>({ok:false,status:404})),/No s’ha trobat data.csv/);
 await assert.rejects(loadDefault(['PRIMER_PROBLEMA'],async()=>({ok:false,status:403})),/HTTP 403/);
 assert.throws(()=>decode(raw,'data.csv',['unknown']),/cap indicador conegut/);
 assert.throws(()=>decode(new Uint8Array([255]).buffer,'data.csv',['PRIMER_PROBLEMA']),/UTF-8/);
 assert.throws(()=>decode(new TextEncoder().encode('<html>Sign in</html>').buffer,'data.csv',['PRIMER_PROBLEMA']),/observacions/);
 const noProfile='SEXE;estudi;ANY;PRIMER_PROBLEMA\nHome;test;2026;Habitatge';
 assert.throws(()=>decode(new TextEncoder().encode(noProfile).buffer,'data.csv',['PRIMER_PROBLEMA']),/ID2/);
 console.log('PASS: automatic data.csv loading, manual loading, UTF-8, missing file, HTTP errors and schema validation.');

 const index=await loadVolumes(async url=>{
  assert.equal(url,'./data/volum-perfils.json');
  return {ok:true,json:async()=>volumeSources};
 });
 const profile='Estrangers sense estudis establerts';
 const fixture={headers:loaded.headers,rows:[
  [profile,'Home','Test','2026','Habitatge'],[profile,'Dona','Test','2026','Inseguretat'],
  [null,'Dona','Test','2026','Habitatge']
 ]};
 fixture.headers=[...fixture.headers,'PERFIL_POLITIC'];
 fixture.rows[0].push("Satisfets d'esquerres");
 fixture.rows[1].push('No simpatitzants');
 fixture.rows[2].push(null);
 const summary=mode=>summarize(fixture,{groupBy:'ID2',sex:mode,indicator:'PRIMER_PROBLEMA'});
 const cross=summary('BLOC_POLITIC_SEXE');
 const bySex=volumesFor(index,cross);
 assert.equal(bySex.get(cross.groups.find(g=>g.sex==='Home'&&g.bloc==='Bloc d’esquerres')),4747);
 assert.equal(bySex.get(cross.groups.find(g=>g.sex==='Home'&&g.bloc==='Resta de perfils polítics')),19632);
 assert.equal(bySex.get(cross.reference),54227);
 const withoutSex=summary('BLOC_POLITIC');
 assert.equal(volumesFor(index,withoutSex).get(withoutSex.reference),54229);
 const noBreakdown=summary('all');
 assert.equal(volumesFor(index,noBreakdown).get(noBreakdown.reference),54229);
 assert.equal(volumesFor(index,noBreakdown).has(noBreakdown.groups.find(g=>g.profile==='Sense perfil')),false);
 const missingCombination={...cross,groups:[...cross.groups,{profile:'Unmapped',subgroup:'Dona'}]};
 assert.equal(volumesFor(index,missingCombination).has(cross.reference),false);
 await assert.rejects(loadVolumes(async()=>({ok:true,json:async()=>({withoutSex:[volumeSources.withoutSex[0],volumeSources.withoutSex[0]],withSex:[]})})),/duplicats/);
 console.log('PASS: published profile volumes, independent source totals, political blocks, missing groups and duplicate validation.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
