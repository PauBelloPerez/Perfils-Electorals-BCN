'use strict';
const C=ProfileCore, $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ca-ES',{maximumFractionDigits:1,minimumFractionDigits:1}).format(n);
const num=n=>new Intl.NumberFormat('ca-ES').format(n);
const colors={Home:'#16766d',Dona:'#d78a56',Total:'#65879a'};
const withDescription=item=>{
  const description=C.descriptionFor(item.id);
  return description?{...item,description,warning:item.warning?.startsWith('Variable sense descripció')?'':item.warning}:item;
};
let data=null, catalog=window.INDICATORS.map(withDescription), result, view='chart', response='', loadSequence=0;
let state={indicator:'PRIMER_PROBLEMA',groupBy:'ID2',sex:'compare',excludeNS:false,profiles:null};
const mentionSet={id:'__MENCIO_PROBLEMA',label:'Menció problema · tots els problemes',group:'Preocupacions ciutadanes',description:'Compara tots els problemes en una sola taula. Tria Sí o No per veure el percentatge de cada resposta, amb una base pròpia per indicador.'};
const isCollection=()=>state.indicator===mentionSet.id;
const mentionIndicators=()=>data.headers.filter(id=>id.startsWith('MENCIO_TEMES_'));
const mentionLabel=id=>id.slice('MENCIO_TEMES_'.length).replaceAll('_',' ');
const tableOptions={orientation:'columns',grouped:true,heat:true,counts:true,reference:true};
try{
  const saved=JSON.parse(localStorage.getItem('perfils-table-options')||'{}');
  if(['columns','rows'].includes(saved.orientation))tableOptions.orientation=saved.orientation;
  for(const key of ['grouped','heat','counts','reference'])if(typeof saved[key]==='boolean')tableOptions[key]=saved[key];
}catch{/* Preferences are optional when browser storage is unavailable. */}
const option=(value,label)=>`<option value="${esc(value)}">${esc(label??value)}</option>`;
const labelResponse=v=>isCollection()?(v==='1'?'Sí':v==='0'?'No':v):state.indicator.startsWith('MENCIO_TEMES_')?(v==='1'?'Sí, el menciona':v==='0'?'No el menciona':v):String(v).replaceAll('_',' ');
function dimensions(){
  const sexes=C.sexesFor('compare');
  $('sex').innerHTML=option('all','Total, sense desglossar')+option('compare',sexes.join(' i '))+sexes.map(s=>option(s,'Només '+s)).join('')+C.GROUPINGS.filter(g=>['PERFIL_POLITIC','EDAT'].includes(g.id)).map(g=>`<option value="${g.id}" ${data.headers.includes(g.id)?'':'disabled'}>${g.label}${data.headers.includes(g.id)?'':' · no disponible'}</option>`).join('');
  $('sex').value=state.sex;
  $('group-by').innerHTML=C.GROUPINGS.map(g=>`<option value="${g.id}" ${data.headers.includes(g.id)?'':'disabled'}>${esc(g.label)}${data.headers.includes(g.id)?'':' · no disponible'}</option>`).join('');
  $('group-by').value=state.groupBy;
  referenceCategories();
}
function referenceCategories(){
  const profiles=[...new Set(data.rows.map(r=>C.profile(r[data.headers.indexOf(state.groupBy)],state.groupBy)))].sort((a,b)=>C.compareProfiles(a,b,state.groupBy));
  $('profile-options').innerHTML='<button id="all-profiles" class="icon-button">Selecciona tots</button> · <button id="none-profiles" class="icon-button">Desmarca tots</button>'+profiles.map(p=>`<label><input type="checkbox" value="${esc(p)}" checked>${esc(p)}</label>`).join('');
  const update=()=>{state.profiles=[...$('profile-options').querySelectorAll('input:checked')].map(el=>el.value);$('profile-summary').textContent=state.profiles.length===profiles.length?'Totes les categories':`${state.profiles.length} categories seleccionades`;render();};
  $('profile-options').onchange=update;
  $('all-profiles').onclick=()=>{$('profile-options').querySelectorAll('input').forEach(el=>el.checked=true);update();};
  $('none-profiles').onclick=()=>{$('profile-options').querySelectorAll('input').forEach(el=>el.checked=false);update();};
  $('profile-summary').textContent='Totes les categories';
}
function navigation(){
  const query=C.normalize($('search').value);
  const groups=new Map();
  const entries=mentionIndicators().length?[mentionSet,...catalog]:catalog;
  entries.filter(v=>(v.id===mentionSet.id||data.headers.includes(v.id))&&C.normalize(v.label+' '+v.description+' '+v.id+' '+v.group).includes(query)).forEach(v=>{if(!groups.has(v.group))groups.set(v.group,[]);groups.get(v.group).push(v);});
  $('catalog').innerHTML=[...groups].map(([group,vars])=>`<details ${query||vars.some(v=>v.id===state.indicator)?'open':''}><summary>${esc(group)}<span class="count">${vars.length}</span></summary>${vars.map(v=>`<button data-id="${esc(v.id)}" class="${v.id===state.indicator?'active':''}" ${v.id===state.indicator?'aria-current="true"':''}>${esc(v.label)}</button>`).join('')}</details>`).join('')||'<p class="empty">Cap indicador coincideix amb la cerca.</p>';
  $('catalog').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{state.indicator=btn.dataset.id;response='';navigation();render();});
}
function render(){
  const collection=isCollection();
  const item=collection?mentionSet:catalog.find(v=>v.id===state.indicator);
  if(!item)return;
  if(collection&&!['1','0'].includes(response))response='1';
  result=collection?C.summarizeCollection(data,state,mentionIndicators(),response):C.summarize(data,state);
  $('analysis-title').textContent=result.groupLabel;
  $('grouping-note').hidden=false;
  $('grouping-note').textContent=`Referència: ${result.groupLabel} (${result.groupBy}). ${num(result.groupingMissing)} registres seleccionats sense dada de referència, agrupats a «${result.missingGroupLabel}». Desglossament: ${result.breakdownLabel}.${['PERFIL_POLITIC','EDAT'].includes(result.breakdownBy)?` ${num(result.breakdownMissing)} registres a «${result.breakdownMissingLabel}».`:''}`;
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
  const choices=collection?['1','0']:result.responses;
  $('response').innerHTML=choices.map(v=>option(v,labelResponse(v))).join('');
  $('response').value=response;$('response').disabled=!choices.length;
  $('source-badge').textContent=`${data.source} · ${num(data.rows.length)} registres`;
  $('source-text').textContent=`Fitxer: ${data.source}. ${num(data.rows.length)} registres i ${data.headers.length} variables. Indicador: ${state.indicator}. Referència: ${result.groupLabel} (${result.groupBy}). Desglossament: ${result.breakdownLabel}. Totes les enquestes i tots els anys conjuntament.`;
  $('coverage').innerHTML=Object.entries(result.coverage).map(([name,c])=>`<span>${esc(name)}: ${collection?range([c.min,c.max]):c.n}/${c.total} amb dada${collection?' per indicador':''}</span>`).join('');
  if(!collection)renderChart();renderTable();setView(view);
}
function renderChart(){
  $('response-title').textContent=labelResponse(response)||'Sense respostes per a aquesta selecció';
  const palette=['#16766d','#bb5b18','#5269b0','#945397','#79912d','#65879a'];
  const breakdownCategories=C.orderedResponses(result.breakdownBy,new Set(data.rows.map(row=>row[data.headers.indexOf(result.breakdownBy)]).filter(v=>!C.missing(v))));
  const color=s=>['PERFIL_POLITIC','EDAT'].includes(result.breakdownBy)?(s===result.breakdownMissingLabel?'#7d8581':palette[breakdownCategories.indexOf(s)%palette.length]):colors[s];
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
  $('table').innerHTML=ProfileTable.render(result,tableOptions,isCollection()?mentionLabel:labelResponse);
  for(const id of ['export-xlsx','export-copy','export-pdf','export'])$(id).disabled=!result.valid;
  $('export-status').textContent='';
}
function exportSnapshot(){
  const category=state.profiles?state.profiles.join(', '):'Totes les categories';
  return TableExport.capture($('table').querySelector('table'),{
    title:$('indicator-title').textContent+(isCollection()?' · '+labelResponse(response):''),
    description:$('description').textContent,
    context:`Referència: ${result.groupLabel}. Desglossament: ${result.breakdownLabel}. Selecció: ${category}. ${state.sex==='Home'||state.sex==='Dona'?'Només '+state.sex+'. ':''}Sense ponderar. NS/NC ${state.excludeNS?'exclosos':'inclosos'}. Tots els anys i enquestes. Font: ${data.source}.`,
    fixedColumns:tableOptions.orientation==='columns'?(tableOptions.reference?2:1):(isCollection()?2:3)
  });
}
function saveTable(){
  try{
    const blob=new Blob([TableExport.xlsx(exportSnapshot())],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`taula_${state.groupBy}_${result.breakdownBy||'TOTAL'}_${state.indicator}.xlsx`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('export-status').textContent='Excel preparat amb el format de la taula.';
  }catch(error){$('export-status').textContent=error.message;}
}
async function copyTable(){
  $('export-copy').disabled=true;
  try{
    const snapshot=exportSnapshot();
    if(await TableExport.copyFormatted(snapshot)){
      $('export-status').textContent='Taula copiada amb format. Enganxa-la a Excel, Word o un document.';
    }else manualCopy(snapshot);
  }catch(error){$('export-status').textContent=error.message||'No s’ha pogut preparar la taula.';}
  finally{$('export-copy').disabled=!result?.valid;}
}
function selectCopyTable(){
  const container=$('copy-table');container.focus({preventScroll:true});
  const range=document.createRange();range.selectNodeContents(container);
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  $('copy-status').textContent='Taula seleccionada. Prem Ctrl+C (o ⌘C al Mac) i enganxa-la al document de destinació.';
}
function manualCopy(snapshot){
  try{
    $('copy-table').innerHTML=TableExport.html(snapshot||exportSnapshot());
    $('copy-preview').showModal();selectCopyTable();
    $('export-status').textContent='Pots copiar la taula seleccionada amb Ctrl+C sense activar permisos.';
  }catch(error){$('export-status').textContent=error.message;}
}
function previewTable(){
  try{$('export-pages').innerHTML=TableExport.printHTML(exportSnapshot());$('export-preview').showModal();}
  catch(error){$('export-status').textContent=error.message;}
}
function setView(next){view=isCollection()?'table':next;$('chart-view').hidden=view!=='chart';$('table-view').hidden=view!=='table';$('response-control').hidden=view!=='chart'&&!isCollection();$('chart-tab').disabled=isCollection();$('chart-tab').title=isCollection()?'La vista conjunta es presenta en taula':'';$('chart-tab').setAttribute('aria-pressed',view==='chart');$('table-tab').setAttribute('aria-pressed',view==='table');}
function exportCSV(){
  const lines=[['conjunt','indicador','descripcio','variable_referencia','referencia','enquesta','any','ponderacio','exclou_ns_nc','perfil','sexe','variable_desglossament','desglossament','subgrup','resposta','recompte','base','percentatge','excloses']];
  const series=isCollection()?result.series:[{id:state.indicator,result}];
  for(const s of series)for(const g of [s.result.reference,...s.result.groups])for(const v of isCollection()?[response]:s.result.responses)lines.push([isCollection()?'Menció problema':'',s.id,catalog.find(i=>i.id===s.id)?.description||mentionLabel(s.id),result.groupBy,result.groupLabel,'Totes','Tots','Sense ponderar',state.excludeNS?'Sí':'No',g.profile,g.sex,result.breakdownBy,result.breakdownLabel,g.subgroup,isCollection()?labelResponse(v):v,g.counts[v]||0,g.n,g.n?((g.counts[v]||0)/g.n*100).toFixed(4).replace('.',','):'',g.missing]);
  const safe=v=>{v=String(v??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
  const blob=new Blob(['\uFEFF'+lines.map(row=>row.map(safe).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`perfils_${state.groupBy}_${result.breakdownBy||'TOTAL'}_${state.indicator}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function reset(){if(!data)return;state={indicator:data.headers.includes('PRIMER_PROBLEMA')?'PRIMER_PROBLEMA':catalog.find(v=>data.headers.includes(v.id)).id,groupBy:'ID2',sex:'compare',excludeNS:false,profiles:null};response='';$('search').value='';$('sex').value='compare';$('exclude-ns').checked=false;$('profile-details').open=false;dimensions();navigation();render();}
$('search').oninput=navigation;
for(const key of ['orientation','grouped','heat','counts','reference']){
  const control=$('table-'+key);
  if(key==='orientation')control.value=tableOptions[key];else control.checked=tableOptions[key];
  control.onchange=()=>{
    tableOptions[key]=key==='orientation'?control.value:control.checked;
    try{localStorage.setItem('perfils-table-options',JSON.stringify(tableOptions));}catch{}
    renderTable();
  };
}
$('sex').onchange=()=>{state.sex=$('sex').value;render();};
$('group-by').onchange=()=>{state.groupBy=$('group-by').value;state.profiles=null;$('profile-details').open=false;referenceCategories();render();};
$('exclude-ns').onchange=()=>{state.excludeNS=$('exclude-ns').checked;render();};
$('response').onchange=()=>{response=$('response').value;if(isCollection())render();else renderChart();};
$('chart-tab').onclick=()=>setView('chart');$('table-tab').onclick=()=>setView('table');$('export').onclick=exportCSV;$('reset').onclick=reset;
$('export-xlsx').onclick=saveTable;$('export-copy').onclick=copyTable;$('export-pdf').onclick=previewTable;
$('copy-select').onclick=selectCopyTable;
$('copy-close').onclick=()=>{$('copy-preview').close();window.getSelection()?.removeAllRanges();};
$('export-print').onclick=()=>window.print();$('export-close').onclick=()=>$('export-preview').close();
function adoptData(next){
  const unknown=next.headers.filter(k=>!['ID2','SEXE','estudi','ANY'].includes(k)&&!catalog.some(v=>v.id===k));
  catalog=[...catalog,...unknown.map(id=>({id,label:id.replaceAll('_',' '),description:C.descriptionFor(id)||'Descripció pendent de completar.',group:'Altres indicadors',warning:C.descriptionFor(id)?'':'Variable nova sense descripció al diccionari.'}))];
  data=next;
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
    const next=await ProfileData.loadDefault(catalog.map(v=>v.id));
    if(request!==loadSequence)return;
    adoptData(next);$('message').hidden=true;
  }catch(error){
    if(request!==loadSequence)return;
    $('source-badge').textContent='Sense dades carregades';
    $('message').textContent=error instanceof TypeError?'No s’ha pogut accedir a data.csv. Comprova que el servidor local estigui actiu o utilitza «Carrega un CSV».':error.message;
  }
}
start();
