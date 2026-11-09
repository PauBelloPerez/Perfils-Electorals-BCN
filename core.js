(function(root){
  'use strict';
  const normalize = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const missing = v => v==null || ['', 'na','nan','null','no disponible'].includes(normalize(v));
  const nonresponse = v => /^(ns\s*\/?\s*nc|ns|nc|no ho sap|no sap|no contesta|no respon|no sap.*contesta)$/.test(normalize(v));
  const metadata=typeof module!=='undefined'?require('./response-metadata.js'):root.RESPONSE_METADATA;
  const responseRanks=new Map(Object.entries(metadata.variables).map(([id,entry])=>[id,new Map(entry.responses.map(r=>[r.value,r.order]))]));
  const missingRanks=new Map(Object.entries(metadata.variables).map(([id,entry])=>[id,Math.min(...entry.responses.filter(r=>missing(r.value)).map(r=>r.order))]));
  const descriptionFor=id=>metadata.variables[id]?.description||'';
  function compareResponses(a,b,variable){
    const ranks=responseRanks.get(variable),aRank=ranks?.get(String(a))??Infinity,bRank=ranks?.get(String(b))??Infinity;
    return aRank===bRank?String(a).localeCompare(String(b),'ca',{numeric:true}):aRank<bRank?-1:1;
  }
  const orderedResponses=(variable,values)=>[...values].sort((a,b)=>compareResponses(a,b,variable));
  const sexesFor=sex=>sex==='compare'?orderedResponses('SEXE',['Home','Dona']):sex==='all'?['Total']:[sex];
  const GROUPINGS=[
    {id:'ID2',label:'Perfils sociodemogràfics'},
    {id:'DISTRICTE',label:'Districte'},
    {id:'EDAT',label:'Edat'},
    {id:'SEXE',label:'Sexe'},
    {id:'IDEO_3',label:'Ideologia agrupada',order:['Esquerra','Dreta','No posicionats']},
    {id:'MUNI_VOT',label:'Record de vot municipal'},
    {id:'INT_VOT',label:'Intenció de vot municipal'},
    {id:'PERFIL_POLITIC',label:'Posicionament respecte al PSC',order:['Convençuts, simpatitzants o exvotants del partit',"Satisfets d'esquerres",'Satisfets poc polititzats','No simpatitzants','Satisfets de dretes']}
  ];
  const missingGroupLabel = groupBy => groupBy==='ID2'?'Sense perfil':'Sense dada de referència';
  const profile = (v,groupBy='ID2') => missing(v)?missingGroupLabel(groupBy):String(v);
  function compareProfiles(a,b,groupBy='ID2'){
    if(a===b)return 0;
    const absent=missingGroupLabel(groupBy);
    if(responseRanks.has(groupBy)){
      const rank=v=>v===absent?(missingRanks.get(groupBy)??Infinity):(responseRanks.get(groupBy).get(v)??Infinity);
      const aRank=rank(a),bRank=rank(b);
      return aRank===bRank?a.localeCompare(b,'ca',{numeric:true}):aRank<bRank?-1:1;
    }
    if(a===absent)return 1;if(b===absent)return -1;
    const order=GROUPINGS.find(g=>g.id===groupBy)?.order||[];
    const rank=v=>order.includes(v)?order.indexOf(v):order.length;
    return rank(a)-rank(b)||a.localeCompare(b,'ca');
  }
  function parseCSV(text){
    text=text.replace(/^\uFEFF/,'');
    const first=text.split(/\r?\n/,1)[0];
    const delimiter = [';',',','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
    const records=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"') {if(quoted && text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
      else if(c===delimiter && !quoted){row.push(cell);cell='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))records.push(row);row=[];cell='';}
      else cell+=c;
    }
    if(quoted)throw Error('El CSV conté cometes sense tancar.');
    row.push(cell);if(row.some(v=>v!==''))records.push(row);
    if(records.length<2)throw Error('El CSV no conté observacions.');
    const headers=records.shift().map(v=>v.trim());
    if(new Set(headers).size!==headers.length)throw Error('Hi ha noms de columna duplicats.');
    for(const key of ['ID2','SEXE','estudi','ANY'])if(!headers.includes(key))throw Error('Falta la columna '+key+'.');
    const bad=records.findIndex(r=>r.length!==headers.length);
    if(bad!==-1)throw Error('Nombre de columnes incorrecte al registre '+(bad+2)+'.');
    return {headers,rows:records.map(r=>r.map(v=>['','NA','NaN','null'].includes(v)?null:v))};
  }
  function summarize(data,state){
    const idx=Object.fromEntries(data.headers.map((v,i)=>[v,i]));
    const groupBy=state.groupBy||'ID2',grouping=GROUPINGS.find(g=>g.id===groupBy);
    if(!grouping||idx[groupBy]===undefined)throw Error('Variable de referència no disponible: '+groupBy);
    const groupName=r=>profile(r[idx[groupBy]],groupBy);
    const selected=data.rows.filter(r=>!state.profiles||state.profiles.includes(groupName(r)));
    const valid=r=>!missing(r[idx[state.indicator]])&&(!state.excludeNS||!nonresponse(r[idx[state.indicator]]));
    const available=selected.filter(valid);
    const responses=orderedResponses(state.indicator,new Set(available.map(r=>r[idx[state.indicator]])));
    const buckets=new Map();
    for(const row of selected){const name=groupName(row);if(!buckets.has(name))buckets.set(name,[]);buckets.get(name).push(row);}
    const profiles=[...buckets.keys()].sort((a,b)=>compareProfiles(a,b,groupBy));
    const categorical=['PERFIL_POLITIC','EDAT'].includes(state.sex);
    if(categorical&&idx[state.sex]===undefined)throw Error('Variable de desglossament no disponible: '+state.sex);
    const breakdownBy=categorical?state.sex:state.sex==='all'?'':'SEXE';
    const breakdownLabel=categorical?GROUPINGS.find(g=>g.id===breakdownBy).label:breakdownBy?'Sexe':'Sense desglossar';
    const breakdownMissingLabel='Sense dada de desglossament';
    const subgroupName=r=>missing(r[idx[breakdownBy]])?breakdownMissingLabel:String(r[idx[breakdownBy]]);
    const rankLabel=v=>v===breakdownMissingLabel?missingGroupLabel(breakdownBy):v;
    const subgroups=categorical?[...new Set(selected.map(subgroupName))].sort((a,b)=>compareProfiles(rankLabel(a),rankLabel(b),breakdownBy)):sexesFor(state.sex);
    const make=(name,subgroup,source,total=false)=>{
      const totalRows=source.filter(r=>total||(categorical?subgroupName(r)===subgroup:subgroup==='Total'||r[idx.SEXE]===subgroup));
      const usable=totalRows.filter(valid);const counts=Object.fromEntries(responses.map(v=>[v,0]));
      usable.forEach(r=>counts[r[idx[state.indicator]]]++);
      return {profile:name,subgroup,sex:categorical?'Total':subgroup,total:totalRows.length,n:usable.length,missing:totalRows.length-usable.length,counts};
    };
    const groups=profiles.flatMap(p=>subgroups.map(s=>make(p,s,buckets.get(p))));
    const reference=make('Conjunt seleccionat',state.sex==='Home'||state.sex==='Dona'?state.sex:'Total',selected,categorical);
    const coverage={};for(const r of selected){const name=r[idx.estudi]??'Sense enquesta';coverage[name]??={total:0,n:0};coverage[name].total++;if(valid(r))coverage[name].n++;}
    const groupingMissing=selected.filter(r=>missing(r[idx[groupBy]])&&(reference.sex==='Total'||r[idx.SEXE]===reference.sex)).length;
    const breakdownMissing=categorical?selected.filter(r=>missing(r[idx[breakdownBy]])).length:0;
    return {groups,reference,responses,coverage,selected:reference.total,valid:reference.n,missing:reference.missing,groupBy,groupLabel:grouping.label,missingGroupLabel:missingGroupLabel(groupBy),groupingMissing,breakdownBy,breakdownLabel,subgroups,breakdownMissing,breakdownMissingLabel};
  }
  function summarizeCollection(data,state,indicators,response){
    const series=indicators.filter(id=>data.headers.includes(id)).map(id=>({id,result:summarize(data,{...state,indicator:id})}));
    if(!series.length)return null;
    const first=series[0].result;
    const combine=(getGroup)=>{
      const initial=getGroup(first);
      return {...initial,cells:Object.fromEntries(series.map(s=>{
        const g=getGroup(s.result);
        return [s.id,{n:g.n,count:g.counts[response]||0,missing:g.missing}];
      }))};
    };
    const range=key=>[Math.min(...series.map(s=>s.result[key])),Math.max(...series.map(s=>s.result[key]))];
    return {collection:true,series,response,responses:series.map(s=>s.id),groupBy:first.groupBy,groupLabel:first.groupLabel,missingGroupLabel:first.missingGroupLabel,groupingMissing:first.groupingMissing,
      breakdownBy:first.breakdownBy,breakdownLabel:first.breakdownLabel,subgroups:first.subgroups,breakdownMissing:first.breakdownMissing,breakdownMissingLabel:first.breakdownMissingLabel,
      groups:first.groups.map((_,i)=>combine(r=>r.groups[i])),reference:combine(r=>r.reference),
      selected:first.selected,valid:Math.max(...series.map(s=>s.result.valid)),validRange:range('valid'),missingRange:range('missing'),
      coverage:Object.fromEntries(Object.keys(first.coverage).map(name=>{
        const bases=series.map(s=>s.result.coverage[name].n);
        return [name,{total:first.coverage[name].total,min:Math.min(...bases),max:Math.max(...bases)}];
      }))};
  }
  const api={GROUPINGS,normalize,missing,profile,compareProfiles,compareResponses,orderedResponses,sexesFor,descriptionFor,nonresponse,parseCSV,summarize,summarizeCollection};
  if(typeof module!=='undefined')module.exports=api;else root.ProfileCore=api;
})(typeof window!=='undefined'?window:globalThis);
