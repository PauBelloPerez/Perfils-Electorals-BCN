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
  function validateVolumes(sources){
    const seen=new Set();
    const validate=(fields,people)=>{
      const position=core.politicalProfile(fields.at(-1));
      const key=JSON.stringify([...fields.slice(0,-1),position?.id]);
      if(seen.has(key)||!fields.every(v=>typeof v==='string'&&v)||!position||!Number.isSafeInteger(people)||people<0){
        throw Error('Hi ha volums de perfil duplicats o no vàlids.');
      }
      seen.add(key);
    };
    for(const [profile,position,people] of sources.withoutSex)validate([profile,position],people);
    for(const [profile,sex,position,people] of sources.withSex){
      if(sex!=='Dona'&&sex!=='Home')throw Error('Hi ha volums amb una categoria de sexe no vàlida.');
      validate([profile,sex,position],people);
    }
    return sources;
  }
  function volumeIndex(sources,composition){
    const index=new Map();
    if(!sources)return index;
    const {withoutSex,withSex}=sources;
    const add=(groupBy,breakdownBy,profile,subgroup,people)=>{
      const key=JSON.stringify([groupBy,breakdownBy,profile,subgroup]);
      index.set(key,(index.get(key)??0)+people);
    };
    for(const [profile,position,people] of withoutSex){
      const bloc=core.politicalBloc(position,composition);
      if(!bloc)continue;
      add('ID2','',profile,'Total',people);
      add('ID2','PERFIL_POLITIC',profile,position,people);
      add('ID2','BLOC_POLITIC',profile,bloc,people);
      add('PERFIL_POLITIC','',position,'Total',people);
    }
    for(const [profile,sex,position,people] of withSex){
      const bloc=core.politicalBloc(position,composition);
      if(!bloc)continue;
      add('ID2','SEXE',profile,sex,people);
      add('ID2','BLOC_POLITIC_SEXE',profile,core.politicalSubgroup(sex,bloc),people);
      add('PERFIL_POLITIC','SEXE',position,sex,people);
    }
    return index;
  }
  function volumesFor(index,result){
    const volumes=new Map();
    for(const group of result.groups){
      const key=JSON.stringify([result.groupBy,result.breakdownBy,group.profile,group.subgroup]);
      if(index.has(key))volumes.set(group,index.get(key));
    }
    const classified=result.groups.filter(g=>g.profile!==result.missingGroupLabel&&g.subgroup!==result.breakdownMissingLabel);
    if(volumes.size&&classified.every(g=>volumes.has(g))){
      volumes.set(result.reference,[...volumes.values()].reduce((total,value)=>total+value,0));
    }
    return volumes;
  }
  async function loadVolumes(fetcher=fetch){
    const response=await fetcher('./data/volum-perfils.json',{cache:'no-store'});
    return response.ok?validateVolumes(await response.json()):null;
  }
  const api={decode,loadDefault,loadVolumes,volumeIndex,volumesFor};
  if(typeof module!=='undefined')module.exports=api;else root.ProfileData=api;
})(typeof window!=='undefined'?window:globalThis);
