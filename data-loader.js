(function(root){
  'use strict';
  const core=typeof module!=='undefined'?require('./core.js'):root.ProfileCore;
  function decode(buffer,source,knownIndicators){
    let text;
    try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
    catch{throw Error('El CSV ha de tenir codificació UTF-8.');}
    const data=core.parseCSV(text);
    if(!knownIndicators.some(id=>data.headers.includes(id)))throw Error('No hi ha cap indicador conegut al fitxer.');
    return {...data,source};
  }
  async function loadDefault(knownIndicators,fetcher=fetch){
    const response=await fetcher('./data.csv',{cache:'no-store'});
    if(!response.ok){
      if(response.status===404)throw Error('No s’ha trobat data.csv. Afegeix-lo a la mateixa carpeta que index.html o selecciona’l amb «Carrega un CSV».');
      throw Error(`No s’ha pogut llegir data.csv (HTTP ${response.status}).`);
    }
    return decode(await response.arrayBuffer(),'data.csv',knownIndicators);
  }
  if(typeof module!=='undefined')module.exports={decode,loadDefault};else root.ProfileData={decode,loadDefault};
})(typeof window!=='undefined'?window:globalThis);
