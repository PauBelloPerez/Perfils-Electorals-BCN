const assert=require('node:assert/strict');
const {decode,loadDefault}=require('../data-loader.js');
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
}
run().catch(error=>{console.error(error);process.exitCode=1;});
