'use strict';
const C=ProfileCore, $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ca-ES',{maximumFractionDigits:tableOptions.decimals,minimumFractionDigits:tableOptions.decimals}).format(n);
const num=n=>new Intl.NumberFormat('ca-ES').format(n);
const colors={Home:'#16766d',Dona:'#d78a56',Total:'#65879a'};
const withDescription=item=>{
  const description=C.descriptionFor(item.id);
  return description?{...item,description,warning:item.warning?.startsWith('Variable sense descripció')?'':item.warning}:item;
};
let data=null, catalog=window.INDICATORS.map(withDescription), result, view='chart', response='', loadSequence=0;
let state={indicator:'PRIMER_PROBLEMA',groupBy:'ID2',sex:'compare',excludeNS:false,profiles:null};
const mentionSet={id:'__MENCIO_PROBLEMA',label:'Menció problema · tots els problemes',group:'Preocupacions ciutadanes',description:'Compara tots els problemes en una sola taula. Tria Sí o No per veure el percentatge de cada resposta, amb una base pròpia per indicador.'};
const usageSet={
  id:'__US_SERVEIS',
  label:'Ús: Tots els serveis',
  group:'Serveis i espai públic',
  description:'Compara l’ús dels serveis municipals, amb una base pròpia per servei.',
  responses:['Utilitza','No utilitza'],
  exportLabel:'Ús de serveis municipals',
  indicators:[
    'US_APARCA','US_BUS','US_VERD','US_METRO','US_TRAM','US_BICING','US_ESPORT',
    'US_CSS','US_CULT','US_FESTESPOP','US_MERCAT','US_BIBLIO','US_CC','US_SIAC'
  ]
};
const managementSet={
  id:'__GESTIO_AMBITS',
  label:'Valoració de la gestió: tots els àmbits',
  group:'Gestió municipal',
  description:'Compara la valoració de l’actuació de l’Ajuntament en cada àmbit. Tria la resposta que vols mostrar, amb una base pròpia per àmbit.',
  responses:['Fan Molt','Fan Ni Molt Ni Poc','No Fan Res'],
  exportLabel:'Valoració de la gestió per àmbits',
  indicators:[
    'cat_gestio_aju_circulacio','cat_gestio_aju_espaipublic','cat_gestio_aju_incivisme',
    'cat_gestio_aju_transportpublic','cat_gestio_aju_seguretat','cat_gestio_aju_pobresa',
    'cat_gestio_aju_habitatge','cat_gestio_aju_immigracio','cat_gestio_aju_clima','cat_gestio_aju_turisme'
  ],
  rowLabels:{
    cat_gestio_aju_circulacio:'Circulació',
    cat_gestio_aju_espaipublic:'Manteniment de l’espai públic',
    cat_gestio_aju_incivisme:'Civisme',
    cat_gestio_aju_transportpublic:'Transport públic',
    cat_gestio_aju_seguretat:'Seguretat',
    cat_gestio_aju_pobresa:'Lluita contra la pobresa',
    cat_gestio_aju_habitatge:'Accés a l’habitatge',
    cat_gestio_aju_immigracio:'Immigració',
    cat_gestio_aju_clima:'Canvi climàtic',
    cat_gestio_aju_turisme:'Gestió del turisme'
  }
};
const collectionSets=[mentionSet,usageSet,managementSet];
const activeCollection=()=>collectionSets.find(item=>item.id===state.indicator);
const isCollection=()=>Boolean(activeCollection());
const mentionIndicators=()=>data.headers.filter(id=>id.startsWith('MENCIO_TEMES_'));
const mentionLabel=id=>id.slice('MENCIO_TEMES_'.length).replaceAll('_',' ');
const collectionIndicators=item=>item===mentionSet?mentionIndicators():item.indicators.filter(id=>data.headers.includes(id));
const collectionRowLabel=id=>activeCollection()?.rowLabels?.[id]||(activeCollection()===mentionSet?mentionLabel(id):(catalog.find(item=>item.id===id)?.label||id).replace(/^Ús:\s*/, ''));
const tableOptions={orientation:'columns',grouped:true,heat:true,counts:true,reference:true,decimals:1,volumePosition:'first'};
let volumeData=new Map();
const volumesFor=summary=>volumeData.size?ProfileData.volumesFor(volumeData,summary):volumeData;
try{
  const saved=JSON.parse(localStorage.getItem('perfils-table-options')||'{}');
  if(['columns','rows'].includes(saved.orientation))tableOptions.orientation=saved.orientation;
  if(saved.volumePosition==='last')tableOptions.volumePosition='last';
  if([0,1,2].includes(saved.decimals))tableOptions.decimals=saved.decimals;
  for(const key of ['grouped','heat','counts','reference'])if(typeof saved[key]==='boolean')tableOptions[key]=saved[key];
}catch{/* Preferences are optional when browser storage is unavailable. */}
const option=(value,label)=>`<option value="${esc(value)}">${esc(label??value)}</option>`;
const politicalMode=()=>C.POLITICAL_BREAKDOWNS.find(mode=>mode.id===state.sex);
const activeScope=()=>politicalMode()?state.scope:null;
function scopeLabel(){
  const scope=activeScope();
  return scope?`${scope.study} · ${scope.year||'Tots els anys'}`:'Totes les enquestes i tots els anys';
}
function setupPoliticalScopes(){
  const studyIndex=data.headers.indexOf('estudi'),yearIndex=data.headers.indexOf('ANY'),politicalIndex=data.headers.indexOf('PERFIL_POLITIC');
  const studies=new Map();
  const classified=new Map();
  for(const row of data.rows){
    const study=row[studyIndex],year=row[yearIndex],profile=row[politicalIndex];
    if(!classified.has(profile))classified.set(profile,Boolean(C.politicalBloc(profile)));
    if(C.missing(study)||!classified.get(profile))continue;
    if(!studies.has(study))studies.set(study,new Set());
    if(!C.missing(year))studies.get(study).add(year);
  }
  const scopes=[...studies].sort(([a],[b])=>a.localeCompare(b,'ca'));
  $('political-scope').innerHTML=option('','Totes les enquestes i tots els anys')+scopes.map(([study,years])=>
    `<optgroup label="${esc(study)}">${option(JSON.stringify({study}),`${study} · Tots els anys`)}${[...years].sort().map(year=>option(JSON.stringify({study,year}),`${study} · ${year}`)).join('')}</optgroup>`).join('');
}
const labelResponse=v=>state.indicator===mentionSet.id?(v==='1'?'Sí':v==='0'?'No':v):state.indicator.startsWith('MENCIO_TEMES_')?(v==='1'?'Sí, el menciona':v==='0'?'No el menciona':v):String(v).replaceAll('_',' ');
function dimensions(){
  const sexes=C.sexesFor('compare');
  const hasPolitics=data.headers.includes('PERFIL_POLITIC');
  const broader=C.GROUPINGS.filter(g=>['PERFIL_POLITIC','EDAT'].includes(g.id));
  const breakdownOptions=[...broader,...C.POLITICAL_BREAKDOWNS].map(({id,label})=>{
    const available=broader.some(g=>g.id===id)?data.headers.includes(id):hasPolitics;
    return `<option value="${id}" ${available?'':'disabled'}>${esc(label)}${available?'':' · no disponible'}</option>`;
  }).join('');
  $('sex').innerHTML=option('all','Total, sense desglossar')+option('compare',sexes.join(' i '))+sexes.map(s=>option(s,'Només '+s)).join('')+breakdownOptions;
  $('sex').value=state.sex;
  $('group-by').innerHTML=C.GROUPINGS.map(g=>`<option value="${g.id}" ${data.headers.includes(g.id)?'':'disabled'}>${esc(g.label)}${data.headers.includes(g.id)?'':' · no disponible'}</option>`).join('');
  $('group-by').value=state.groupBy;
  referenceCategories();
}
function referenceCategories(){
  const profiles=[...new Set(data.rows.map(r=>C.profile(r[data.headers.indexOf(state.groupBy)],state.groupBy)))].sort((a,b)=>C.compareProfiles(a,b,state.groupBy));
  const visible=politicalMode()&&state.groupBy==='ID2'?profiles.filter(p=>p!=='Sense perfil'):profiles;
  const selected=visible.filter(p=>!state.profiles||state.profiles.includes(p));
  const summarize=count=>{$('profile-summary').textContent=count===visible.length?'Totes les categories':`${count} categories seleccionades`;};
  $('profile-options').innerHTML='<button id="all-profiles" class="icon-button">Selecciona tots</button> · <button id="none-profiles" class="icon-button">Desmarca tots</button>'+visible.map(p=>`<label><input type="checkbox" value="${esc(p)}" ${selected.includes(p)?'checked':''}>${esc(p)}</label>`).join('');
  const update=()=>{const checked=[...$('profile-options').querySelectorAll('input:checked')].map(el=>el.value);state.profiles=checked.length===visible.length?null:checked;summarize(checked.length);render();};
  $('profile-options').onchange=update;
  $('all-profiles').onclick=()=>{$('profile-options').querySelectorAll('input').forEach(el=>el.checked=true);update();};
  $('none-profiles').onclick=()=>{$('profile-options').querySelectorAll('input').forEach(el=>el.checked=false);update();};
  summarize(selected.length);
}
function navigation(){
  const query=C.normalize($('search').value);
  const groups=new Map();
  const entries=[...collectionSets.filter(item=>collectionIndicators(item).length),...catalog];
  entries.filter(v=>(collectionSets.includes(v)||data.headers.includes(v.id))&&C.normalize(v.label+' '+v.description+' '+v.id+' '+v.group).includes(query)).forEach(v=>{if(!groups.has(v.group))groups.set(v.group,[]);groups.get(v.group).push(v);});
  $('catalog').innerHTML=[...groups].map(([group,vars])=>`<details ${query||vars.some(v=>v.id===state.indicator)?'open':''}><summary>${esc(group)}<span class="count">${vars.length}</span></summary>${vars.map(v=>`<button data-id="${esc(v.id)}" class="${v.id===state.indicator?'active':''}" ${v.id===state.indicator?'aria-current="true"':''}>${esc(v.label)}</button>`).join('')}</details>`).join('')||'<p class="empty">Cap indicador coincideix amb la cerca.</p>';
  $('catalog').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{state.indicator=btn.dataset.id;response='';if([usageSet.id,managementSet.id].includes(state.indicator)){tableOptions.orientation='columns';$('table-orientation').value='columns';}navigation();render();});
}
function render(){
  const collection=isCollection();
  const item=collection?activeCollection():catalog.find(v=>v.id===state.indicator);
  if(!item)return;
  const collectionResponses=item.responses||['1','0'];
  if(collection&&!collectionResponses.includes(response))response=collectionResponses[0];
  result=collection?C.summarizeCollection(data,state,collectionIndicators(item),response):C.summarize(data,state);
  if(collection){result.collectionLabel=item.exportLabel||'Menció problema';result.responseLabel=labelResponse(response);}
  $('analysis-title').textContent=result.groupLabel;
  $('political-controls').hidden=!politicalMode();
  $('grouping-note').hidden=false;
  if(politicalMode()){
    const required=[...(state.groupBy==='ID2'?['ID2']:[]),'bloc polític',...(politicalMode().bySex?['sexe']:[])];
    const baseNote=collection?' Consulta la base de cada indicador.':` ${num(result.groups.length)} combinacions · ${num(result.groups.filter(g=>g.n===0).length)} sense base · ${num(result.groups.filter(g=>g.n>0&&g.n<30).length)} amb n < 30.`;
    $('grouping-note').textContent=`${scopeLabel()} · ${num(result.politicalExcluded)} registres fora del creuament per manca de ${new Intl.ListFormat('ca',{type:'disjunction'}).format(required)}.${baseNote}`;
  }else{
    $('grouping-note').textContent=`Referència: ${result.groupLabel} (${result.groupBy}). ${num(result.groupingMissing)} registres seleccionats sense dada de referència, agrupats a «${result.missingGroupLabel}». Desglossament: ${result.breakdownLabel}.${['PERFIL_POLITIC','EDAT'].includes(result.breakdownBy)?` ${num(result.breakdownMissing)} registres a «${result.breakdownMissingLabel}».`:''}`;
  }
  $('breadcrumb').textContent=item.group;
  $('indicator-title').textContent=item.label;
  $('description').textContent=item.description;
  $('variable-warning').hidden=!item.warning;
  $('variable-warning').textContent=item.warning;
  $('selected-n').textContent=num(result.selected);
  const range=values=>values[0]===values[1]?num(values[0]):`${num(values[0])}–${num(values[1])}`;
  $('valid-n').previousElementSibling.textContent=collection?'Amb dada per indicador (mín.–màx.)':'Respostes amb dada';
  $('missing-n').previousElementSibling.textContent=collection?'Excloses per indicador (mín.–màx.)':'Sense dada / excloses';
  $('valid-n').textContent=collection?range(result.validRange):num(result.valid);
  $('missing-n').textContent=collection?range(result.missingRange):num(result.missing);
  if(!collection&&!result.responses.includes(response))response=result.responses[0]??'';
  const choices=collection?collectionResponses:result.responses;
  $('response').innerHTML=choices.map(v=>option(v,labelResponse(v))).join('');
  $('response').value=response;$('response').disabled=!choices.length;
  $('source-badge').textContent=`${data.source} · ${num(data.rows.length)} registres`;
  $('source-text').textContent=`Fitxer: ${data.source}. ${num(data.rows.length)} registres i ${data.headers.length} variables. Indicador: ${state.indicator}. Referència: ${result.groupLabel} (${result.groupBy}). Desglossament: ${result.breakdownLabel}. ${scopeLabel()}.`;
  $('coverage').innerHTML=Object.entries(result.coverage).map(([name,c])=>`<span>${esc(name)}: ${collection?range([c.min,c.max]):c.n}/${c.total} amb dada${collection?' per indicador':''}</span>`).join('');
  if($('multi-panel').open)renderMulti();
  if(!collection)renderChart();renderTable();setView(view);
}
function renderChart(){
  $('response-title').textContent=labelResponse(response)||'Sense respostes per a aquesta selecció';
  const palette=['#16766d','#bb5b18','#5269b0','#945397','#79912d','#65879a'];
  const breakdownCategories=C.orderedResponses(result.breakdownBy,new Set(data.rows.map(row=>row[data.headers.indexOf(result.breakdownBy)]).filter(v=>!C.missing(v))));
  const color=s=>politicalMode()?palette[result.subgroups.indexOf(s)]:['PERFIL_POLITIC','EDAT'].includes(result.breakdownBy)?(s===result.breakdownMissingLabel?'#7d8581':palette[breakdownCategories.indexOf(s)%palette.length]):colors[s];
  $('legend').innerHTML=result.subgroups.map(s=>`<span><i style="background:${color(s)}"></i>${esc(s)}</span>`).join('');
  const ref=result.reference, value=ref.n?fmt((ref.counts[response]||0)/ref.n*100)+'%':'—';
  $('reference').innerHTML=`<div class="reference"><span>Conjunt seleccionat · ${esc(ref.subgroup)}</span><span><b>${value}</b> &nbsp; ${num(ref.counts[response]||0)} de ${num(ref.n)} respostes</span></div>`;
  const profiles=[...new Set(result.groups.map(g=>g.profile))];
  $('chart').innerHTML=result.valid?profiles.map(p=>`<div class="chart-row"><div class="profile-name">${esc(p)}</div><div class="bars">${result.groups.filter(g=>g.profile===p).map(g=>{
    const n=g.counts[response]||0,pct=g.n?n/g.n*100:0;
    return `<div class="bar-line" role="img" aria-label="${esc(p)}, ${esc(g.subgroup)}: ${g.n?fmt(pct)+' per cent':'sense base'}, ${n} de ${g.n} respostes"><div class="bar" style="width:${pct}%;background:${color(g.subgroup)}"></div><span class="bar-label" style="--pct:${pct}%">${g.n&&g.n<30?'<i class="low-dot"></i>':''}${g.n?fmt(pct)+'%':'—'} <small>n=${g.n}</small></span></div>`;
  }).join('')}</div></div>`).join(''):'<div class="empty">No hi ha respostes amb aquesta selecció.<br>Prova un altre indicador, grup de referència o desglossament.</div>';
}
function renderTable(){
  const volumes=volumesFor(result);
  $('table-volume-control').hidden=!volumes.size;
  const positions=$('table-volume-position');
  positions.innerHTML=tableOptions.orientation==='columns'?option('first','A dalt')+option('last','A baix'):option('first','A l’inici')+option('last','Al final');
  positions.value=tableOptions.volumePosition;
  $('table').innerHTML=ProfileTable.render(result,{...tableOptions,volumes},isCollection()?collectionRowLabel:labelResponse);
  for(const id of ['export-xlsx','export-copy','export-image','export-pdf','export'])$(id).disabled=!result.valid;
  $('export-status').textContent='';
}
function exportSnapshot(){
  const category=state.profiles?state.profiles.join(', '):'Totes les categories';
  return TableExport.capture($('table').querySelector('table'),{
    title:$('indicator-title').textContent+(isCollection()?' · '+labelResponse(response):''),
    description:$('description').textContent,
    context:`Referència: ${result.groupLabel}. Desglossament: ${result.breakdownLabel}. Selecció: ${category}. ${state.sex==='Home'||state.sex==='Dona'?'Només '+state.sex+'. ':''}Sense ponderar. NS/NC ${state.excludeNS?'exclosos':'inclosos'}. ${scopeLabel()}. Font: ${data.source}.`,
    fixedColumns:tableOptions.orientation==='columns'?(tableOptions.reference?2:1):(isCollection()?2:3),decimals:tableOptions.decimals
  });
}
function saveTable(){
  try{
    const blob=new Blob([TableExport.xlsx(exportSnapshot())],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`taula_${state.groupBy}_${result.breakdownBy||'TOTAL'}_${state.indicator}.xlsx`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('export-status').textContent='Excel preparat amb el format de la taula.';
  }catch(error){$('export-status').textContent=error.message;}
}
const reportOptions=()=>({compact:$('export-density').value==='compact',split:$('export-blocks').checked});
async function copyImage(){
  $('export-image').disabled=true;
  try{
    const pending=TableImage.png(exportSnapshot(),reportOptions());
    // Observe a rejection even if ClipboardItem construction fails first.
    pending.catch(()=>{});
    if(navigator.clipboard?.write&&window.ClipboardItem){
      try{
        await navigator.clipboard.write([new ClipboardItem({'image/png':pending})]);
        $('export-status').textContent='Imatge copiada. Enganxa-la a Word i ajusta’n la mida.';
        return;
      }catch{/* Download the same PNG when image clipboard writes are unavailable. */}
    }
    const blob=await pending,url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`taula_${state.indicator}.png`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('export-status').textContent='S’ha descarregat la imatge PNG perquè el navegador no ha permès copiar-la. Insereix-la al document.';
  }catch(error){$('export-status').textContent=error.message||'No s’ha pogut preparar la imatge.';}
  finally{$('export-image').disabled=!result?.valid;}
}
async function copyTable(){
  $('export-copy').disabled=true;
  try{
    const snapshot=exportSnapshot(),options=reportOptions();
    if(await TableExport.copyFormatted(snapshot,window,options)){
      $('export-status').textContent='Taula copiada amb format. Enganxa-la a Excel, Word o un document.';
    }else manualCopy(snapshot,options);
  }catch(error){$('export-status').textContent=error.message||'No s’ha pogut preparar la taula.';}
  finally{$('export-copy').disabled=!result?.valid;}
}
function selectCopyTable(){
  const container=$('copy-table');container.focus({preventScroll:true});
  const range=document.createRange();range.selectNodeContents(container);
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  $('copy-status').textContent='Taula seleccionada. Prem Ctrl+C (o ⌘C al Mac) i enganxa-la al document de destinació.';
}
function manualCopy(snapshot,options=reportOptions()){
  try{
    $('copy-table').innerHTML=TableExport.html(snapshot||exportSnapshot(),options);
    $('copy-preview').showModal();selectCopyTable();
    $('export-status').textContent='Pots copiar la taula seleccionada amb Ctrl+C sense activar permisos.';
  }catch(error){$('export-status').textContent=error.message;}
}
function previewTable(){
  try{$('export-pages').innerHTML=TableExport.printHTML(exportSnapshot(),reportOptions());$('export-preview').showModal();}
  catch(error){$('export-status').textContent=error.message;}
}
function setView(next){view=isCollection()?'table':next;$('chart-view').hidden=view!=='chart';$('table-view').hidden=view!=='table';$('response-control').hidden=view!=='chart'&&!isCollection();$('chart-tab').disabled=isCollection();$('chart-tab').title=isCollection()?'La vista conjunta es presenta en taula':'';$('chart-tab').setAttribute('aria-pressed',view==='chart');$('table-tab').setAttribute('aria-pressed',view==='table');}
function exportCSV(){
  const lines=[['conjunt','indicador','descripcio','variable_referencia','referencia','enquesta','any','ponderacio','exclou_ns_nc','perfil','sexe','variable_desglossament','desglossament','subgrup','resposta','recompte','base','percentatge','excloses']];
  const series=isCollection()?result.series:[{id:state.indicator,result}];
  const scope=activeScope();
  for(const s of series)for(const g of [s.result.reference,...s.result.groups])for(const v of isCollection()?[response]:s.result.responses)lines.push([isCollection()?result.collectionLabel:'',s.id,catalog.find(i=>i.id===s.id)?.description||mentionLabel(s.id),result.groupBy,result.groupLabel,scope?.study||'Totes',scope?.year||'Tots','Sense ponderar',state.excludeNS?'Sí':'No',g.profile,g.sex,result.breakdownBy,result.breakdownLabel,g.subgroup,isCollection()?labelResponse(v):v,g.counts[v]||0,g.n,g.n?fmt((g.counts[v]||0)/g.n*100):'',g.missing]);
  const safe=v=>{v=String(v??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
  const blob=new Blob(['\uFEFF'+lines.map(row=>row.map(safe).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`perfils_${state.groupBy}_${result.breakdownBy||'TOTAL'}_${state.indicator}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function reset(){if(!data)return;state={indicator:data.headers.includes('PRIMER_PROBLEMA')?'PRIMER_PROBLEMA':catalog.find(v=>data.headers.includes(v.id)).id,groupBy:'ID2',sex:'compare',excludeNS:false,profiles:null};response='';$('search').value='';$('sex').value='compare';$('political-scope').value='';$('exclude-ns').checked=false;$('profile-details').open=false;dimensions();navigation();render();}
$('search').oninput=navigation;
$('percentage-decimals').value=String(tableOptions.decimals);
$('percentage-decimals').onchange=()=>{
  const decimals=Number($('percentage-decimals').value);
  if(![0,1,2].includes(decimals))return;
  tableOptions.decimals=decimals;
  try{localStorage.setItem('perfils-table-options',JSON.stringify(tableOptions));}catch{}
  if(data)render();
};
for(const key of ['orientation','grouped','heat','counts','reference']){
  const control=$('table-'+key);
  if(key==='orientation')control.value=tableOptions[key];else control.checked=tableOptions[key];
  control.onchange=()=>{
    tableOptions[key]=key==='orientation'?control.value:control.checked;
    try{localStorage.setItem('perfils-table-options',JSON.stringify(tableOptions));}catch{}
    renderTable();
  };
}
const volumeControls=[$('table-volume-position'),$('multi-volume-position')];
for(const control of volumeControls){
  control.value=tableOptions.volumePosition;
  control.onchange=()=>{
    tableOptions.volumePosition=control.value;
    for(const select of volumeControls)select.value=control.value;
    try{localStorage.setItem('perfils-table-options',JSON.stringify(tableOptions));}catch{}
    if(!data)return;
    renderTable();
    if($('multi-panel').open)renderMulti();
  };
}
$('sex').onchange=()=>{state.sex=$('sex').value;referenceCategories();render();};
$('political-scope').onchange=()=>{const value=$('political-scope').value;state.scope=value?JSON.parse(value):null;render();};
$('group-by').onchange=()=>{state.groupBy=$('group-by').value;state.profiles=null;$('profile-details').open=false;referenceCategories();render();};
$('exclude-ns').onchange=()=>{state.excludeNS=$('exclude-ns').checked;render();};
$('response').onchange=()=>{response=$('response').value;if(isCollection())render();else renderChart();};
$('chart-tab').onclick=()=>setView('chart');$('table-tab').onclick=()=>setView('table');$('export').onclick=exportCSV;$('reset').onclick=reset;
$('export-xlsx').onclick=saveTable;$('export-copy').onclick=copyTable;$('export-pdf').onclick=previewTable;
$('export-image').onclick=copyImage;
$('copy-select').onclick=selectCopyTable;
$('copy-close').onclick=()=>{$('copy-preview').close();window.getSelection()?.removeAllRanges();};
$('export-print').onclick=()=>window.print();$('export-close').onclick=()=>$('export-preview').close();
const multiIds=new Set(), omittedMentions=new Set(), multiCache=new Map();
const builtInModels=[
  {name:'Gestió, evolució i futur',ids:['VAL_GESTIO','EVO1A_BARRI','FUTUR_BARRI','EVO1A_BCN','FUTUR_BCN']},
  {name:'Gestió i futur',ids:['VAL_GESTIO','FUTUR_BCN','FUTUR_BARRI']},
  {name:'Problemes de la ciutat',ids:['PRIMER_PROBLEMA',mentionSet.id]},
  {name:'Gestió per àmbits',ids:managementSet.indicators},
  {name:'Ús de serveis municipals',ids:usageSet.indicators}
];
const modelPreference='perfils-indicator-models';
const savedModels=[];
try{
  const stored=JSON.parse(localStorage.getItem(modelPreference)??'[]');
  if(Array.isArray(stored))savedModels.push(...stored.filter(model=>typeof model?.name==='string'&&model.name.trim()
    &&Array.isArray(model.ids)&&model.ids.every(id=>typeof id==='string')
    &&Array.isArray(model.omitted)&&model.omitted.every(id=>typeof id==='string')));
}catch{/* The defaults remain available when browser storage cannot be read. */}
let multiFilterKey='';
function multiSelection(ids=multiIds,omitted=omittedMentions){
  const mentions=new Set(ids.has(mentionSet.id)?mentionIndicators().filter(id=>!omitted.has(id)):[]);
  const indicators=new Set([...ids].flatMap(id=>id===mentionSet.id?[...mentions]:[id]).filter(id=>data.headers.includes(id)));
  return {indicators,mentions};
}
function modelOptions(selected=''){
  const modelGroup=(label,models,prefix)=>models.length?`<optgroup label="${label}">${models.map((model,i)=>{
    const {indicators}=multiSelection(new Set(model.ids),new Set(model.omitted));
    return `<option value="${prefix}-${i}"${indicators.size?'':' disabled'}>${esc(model.name)}${indicators.size?'':' · no disponible'}</option>`;
  }).join('')}</optgroup>`:'';
  $('multi-model').innerHTML=option('','Tria un model')+modelGroup('Models inicials',builtInModels,'builtin')+modelGroup('Models desats en aquest navegador',savedModels,'saved');
  $('multi-model').value=selected;
}
function multiOptions(){
  const query=C.normalize($('multi-search').value);
  const {indicators,mentions}=multiSelection();
  const allMentions=mentionIndicators().length;
  const selectedOnly=$('multi-selected-only').checked;
  const available=catalog.filter(v=>data.headers.includes(v.id));
  if(allMentions)available.unshift(mentionSet);
  const items=available.filter(v=>(!selectedOnly||(v===mentionSet?mentions.size:indicators.has(v.id)))&&C.normalize([v.label,v.group,v.id].join(' ')).includes(query));
  const options=$('multi-options');
  options.innerHTML=items.map(v=>{
    const checked=v===mentionSet?mentions.size===allMentions:indicators.has(v.id);
    return `<label><input type="checkbox" value="${esc(v.id)}"${checked?' checked':''}>${esc(v.label)}</label>`;
  }).join('')||(selectedOnly&&!query?'Cap indicador seleccionat':'Cap coincidència');
  const mentionToggle=options.querySelectorAll('input')[0];
  if(mentionToggle?.value===mentionSet.id)mentionToggle.indeterminate=mentions.size>0&&mentions.size<allMentions;
}
function renderMulti(){
  const key=JSON.stringify([state.groupBy,state.sex,state.profiles,state.excludeNS,activeScope()]);
  if(key!==multiFilterKey){multiCache.clear();multiFilterKey=key;}
  const {indicators,mentions:mentionIds}=multiSelection();
  const mentionResponse=$('multi-mention-response').value;
  $('multi-mention-control').hidden=!mentionIds.size;
  $('multi-count').textContent=`${indicators.size} indicadors seleccionats`;
  $('multi-model-save').hidden=!indicators.size;
  $('multi-export').disabled=!indicators.size;
  $('multi-volume-control').hidden=true;
  if(!indicators.size){$('multi-table').innerHTML='';return;}
  let blocks,volume='',body='';
  for(const id of indicators){
    if(!multiCache.has(id))multiCache.set(id,C.summarize(data,{...state,indicator:id}));
    const summary=multiCache.get(id),groups=[summary.reference,...summary.groups];
    if(!blocks){
      blocks=ProfileTable.profileBlocks(groups,{grouped:true,reference:true});
      volume=ProfileTable.volumeRow(groups,volumesFor(summary),2);
    }
    const fromMentionSet=mentionIds.has(id);
    const label=fromMentionSet?`Menció: ${mentionLabel(id)}`:catalog.find(v=>v.id===id).label;
    const responses=fromMentionSet?[mentionResponse]:summary.responses;
    body+=`<tbody><tr class="base-row"><th class="row-label" scope="rowgroup" rowspan="${responses.length+1}">${esc(label)}</th><th>Base (n)</th>${groups.map(g=>`<td>${politicalMode()&&g.n>0&&g.n<30?'<i class="low-dot" aria-label="Base reduïda"></i>':''}${g.n}</td>`).join('')}</tr>`;
    for(const value of responses){
      const label=id.startsWith('MENCIO_TEMES_')?({'0':'No','1':'Sí'}[value]??value):String(value).replaceAll('_',' ');
      body+=`<tr><th scope="row">${esc(label)}</th>${groups.map(g=>{
        if(!g.n)return '<td>—</td>';
        const share=(g.counts[value]??0)/g.n;
        return `<td data-share="${share}">${fmt(share*100)}%</td>`;
      }).join('')}</tr>`;
    }
    body+='</tbody>';
  }
  const columns=ProfileTable.columnGroups(blocks,2);
  const head=ProfileTable.columnHeaders(blocks,['Indicador','Categoria'],undefined,'multi');
  $('multi-volume-control').hidden=!volume;
  if(volume){
    const section=`<tbody>${volume}</tbody>`;
    body=tableOptions.volumePosition==='last'?body+section:section+body;
  }
  $('multi-table').innerHTML=`<table class="results-table columns"><caption>Percentatges sobre la base de cada indicador i perfil.${volume?' Volums de referència dels fitxers Excel.':''}</caption>${columns}<thead>${head}</thead>${body}</table>`;
}
$('multi-search').oninput=multiOptions;
$('multi-selected-only').onchange=multiOptions;
$('multi-mention-response').onchange=renderMulti;
$('multi-options').onchange=event=>{
  const input=event.target;
  const {value,checked}=input;
  if(checked)multiIds.add(value);else multiIds.delete(value);
  if(value===mentionSet.id)omittedMentions.clear();
  else if(checked)omittedMentions.delete(value);
  else if(multiIds.has(mentionSet.id)&&value.startsWith('MENCIO_TEMES_'))omittedMentions.add(value);
  $('multi-model').value='';
  $('multi-model-status').textContent='';
  multiOptions();
  renderMulti();
  const next=[...$('multi-options').querySelectorAll('input')].find(candidate=>candidate.value===value);
  (next??$('multi-selected-only')).focus?.();
};
$('multi-model').onchange=()=>{
  const [type,index]=$('multi-model').value.split('-');
  const model=(type==='builtin'?builtInModels:savedModels)[index];
  if(!model)return;
  const available=model.ids.filter(id=>id===mentionSet.id?mentionIndicators().length:data.headers.includes(id));
  const omitted=new Set(model.omitted);
  if(!multiSelection(new Set(available),omitted).indicators.size)return;
  multiIds.clear();
  for(const id of available)multiIds.add(id);
  omittedMentions.clear();
  for(const id of omitted)omittedMentions.add(id);
  $('multi-search').value='';
  const missing=model.ids.length-available.length;
  $('multi-model-status').textContent=missing===0?'':missing===1?'S’ha omès un indicador que no és al fitxer.':`S’han omès ${missing} indicadors que no són al fitxer.`;
  multiOptions();
  renderMulti();
};
$('multi-model-form').onsubmit=event=>{
  event.preventDefault();
  const input=$('multi-model-name'),name=input.value.trim();
  if(!name||!multiSelection().indicators.size)return;
  const status=$('multi-model-status');
  if([...builtInModels,...savedModels].some(model=>C.normalize(model.name)===C.normalize(name))){
    status.textContent='Ja hi ha un model amb aquest nom. Tria’n un altre.';
    input.focus?.();
    return;
  }
  savedModels.push({name,ids:[...multiIds],omitted:[...omittedMentions]});
  modelOptions(`saved-${savedModels.length-1}`);
  input.value='';
  $('multi-model-save').open=false;
  $('multi-model').focus?.();
  try{
    localStorage.setItem(modelPreference,JSON.stringify(savedModels));
    status.textContent='Model desat en aquest navegador.';
  }catch{
    status.textContent='Model disponible fins que recarreguis la pàgina.';
  }
};
$('multi-panel').ontoggle=()=>{if(data&&$('multi-panel').open)renderMulti();};
$('multi-export').onclick=()=>{
  const model=TableExport.capture($('multi-table').querySelector('table'),{
    title:'Taula de diversos indicadors',description:'Base vàlida per indicador, perfil i subgrup.',
    context:`${result.groupLabel} · ${result.breakdownLabel} · ${scopeLabel()} · NS/NC ${state.excludeNS?'exclosos':'inclosos'} · Sense ponderar · ${data.source}`,
    fixedColumns:2,decimals:tableOptions.decimals
  });
  const link=document.createElement('a');
  link.href=URL.createObjectURL(new Blob([TableExport.xlsx(model)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  link.download='taula_diversos_indicadors.xlsx';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
};
function adoptData(next){
  const unknown=next.headers.filter(k=>!['ID2','SEXE','estudi','ANY'].includes(k)&&!catalog.some(v=>v.id===k));
  catalog=[...catalog,...unknown.map(id=>({id,label:id.replaceAll('_',' '),description:C.descriptionFor(id)||'Descripció pendent de completar.',group:'Altres indicadors',warning:C.descriptionFor(id)?'':'Variable nova sense descripció al diccionari.'}))];
  data=next;
  setupPoliticalScopes();
  multiIds.clear();
  omittedMentions.clear();
  multiCache.clear();
  $('multi-search').value='';
  $('multi-selected-only').checked=false;
  $('multi-model-status').textContent='';
  $('multi-model-save').open=false;
  $('multi-mention-response').value='1';
  $('multi-panel').hidden=false;
  modelOptions();
  multiOptions();
  document.querySelectorAll('.filters,.workspace,.technical').forEach(el=>el.hidden=false);
  $('search').disabled=false;$('reset').disabled=false;
  reset();
}
$('upload').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  const request=++loadSequence;
  $('message').hidden=false;$('message').textContent='Llegint el fitxer…';
  try{
    await new Promise(resolve=>setTimeout(resolve,30));
    const next=ProfileData.decode(await file.arrayBuffer(),file.name,catalog.map(v=>v.id));
    if(request!==loadSequence)return;
    adoptData(next);$('message').textContent=`S’han carregat ${num(data.rows.length)} registres. El fitxer es processa en aquest navegador. Recarrega la pàgina per tornar a llegir data.csv.`;
  }catch(error){if(request===loadSequence)$('message').textContent='No s’ha carregat el fitxer: '+error.message;}
  if(request===loadSequence)event.target.value='';
};
async function start(){
  const request=++loadSequence;
  $('message').hidden=false;
  if(location.protocol==='file:'){
    $('message').textContent='Selecciona data.csv amb «Carrega un CSV». Per carregar-lo automàticament, obre aquesta carpeta amb el servidor local (npm start).';
    return;
  }
  $('message').textContent='Carregant data.csv…';
  try{
    const [next,volumes]=await Promise.all([
      ProfileData.loadDefault(catalog.map(v=>v.id)),
      ProfileData.loadVolumes().catch(()=>new Map())
    ]);
    if(request!==loadSequence)return;
    volumeData=volumes;
    adoptData(next);$('message').hidden=true;
  }catch(error){
    if(request!==loadSequence)return;
    $('source-badge').textContent='Sense dades carregades';
    $('message').textContent=error instanceof TypeError?'No s’ha pogut accedir a data.csv. Comprova que el servidor local estigui actiu o utilitza «Carrega un CSV».':error.message;
  }
}
start();
