'use strict';
const C=ProfileCore, $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ca-ES',{maximumFractionDigits:1,minimumFractionDigits:1}).format(n);
const num=n=>new Intl.NumberFormat('ca-ES').format(n);
const colors={Home:'#16766d',Dona:'#d78a56',Total:'#65879a'};
let data=null, catalog=window.INDICATORS, result, view='chart', response='', loadSequence=0;
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
  $('grouping-note').textContent=`Referència: ${result.groupLabel} (${result.groupBy}). ${num(result.groupingMissing)} registres seleccionats sense dada de referència, agrupats a «${result.missingGroupLabel}».`;
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
  if(!collection&&!result.responses.includes(response))response=state.indicator.startsWith('MENCIO_TEMES_')&&result.responses.includes('1')?'1':[...result.responses].sort((a,b)=>result.reference.counts[b]-result.reference.counts[a])[0]??'';
  const choices=collection?['1','0']:result.responses;
  $('response').innerHTML=choices.map(v=>option(v,labelResponse(v))).join('');
  $('response').value=response;$('response').disabled=!choices.length;
  $('source-badge').textContent=`${data.source} · ${num(data.rows.length)} registres`;
  $('source-text').textContent=`Fitxer: ${data.source}. ${num(data.rows.length)} registres i ${data.headers.length} variables. Indicador: ${state.indicator}. Referència: ${result.groupLabel} (${result.groupBy}). Totes les enquestes i tots els anys conjuntament.`;
  $('coverage').innerHTML=Object.entries(result.coverage).map(([name,c])=>`<span>${esc(name)}: ${collection?range([c.min,c.max]):c.n}/${c.total} amb dada${collection?' per indicador':''}</span>`).join('');
  if(!collection)renderChart();renderTable();setView(view);
}
function renderChart(){
  $('response-title').textContent=labelResponse(response)||'Sense respostes per a aquesta selecció';
  const sexes=state.sex==='compare'?['Home','Dona']:state.sex==='all'?['Total']:[state.sex];
  $('legend').innerHTML=sexes.map(s=>`<span><i style="background:${colors[s]}"></i>${s}</span>`).join('');
  const ref=result.reference, value=ref.n?fmt((ref.counts[response]||0)/ref.n*100)+'%':'—';
  $('reference').innerHTML=`<div class="reference"><span>Conjunt seleccionat · ${esc(ref.sex)}</span><span><b>${value}</b> &nbsp; ${num(ref.counts[response]||0)} de ${num(ref.n)} respostes</span></div>`;
  const profiles=[...new Set(result.groups.map(g=>g.profile))];
  $('chart').innerHTML=result.valid?profiles.map(p=>`<div class="chart-row"><div class="profile-name">${esc(p)}</div><div class="bars">${result.groups.filter(g=>g.profile===p).map(g=>{
    const n=g.counts[response]||0,pct=g.n?n/g.n*100:0;
    return `<div class="bar-line" role="img" aria-label="${esc(p)}, ${g.sex}: ${g.n?fmt(pct)+' per cent':'sense base'}, ${n} de ${g.n} respostes"><div class="bar ${g.sex.toLowerCase()}" style="width:${pct}%"></div><span class="bar-label" style="--pct:${pct}%">${g.n&&g.n<30?'<i class="low-dot"></i>':''}${g.n?fmt(pct)+'%':'—'} <small>n=${g.n}</small></span></div>`;
  }).join('')}</div></div>`).join(''):'<div class="empty">No hi ha respostes amb aquesta selecció.<br>Prova un altre indicador, grup de referència o desglossament per sexe.</div>';
}
function renderTable(){
  $('table').innerHTML=ProfileTable.render(result,tableOptions,isCollection()?mentionLabel:labelResponse);
}
function setView(next){view=isCollection()?'table':next;$('chart-view').hidden=view!=='chart';$('table-view').hidden=view!=='table';$('response-control').hidden=view!=='chart'&&!isCollection();$('chart-tab').disabled=isCollection();$('chart-tab').title=isCollection()?'La vista conjunta es presenta en taula':'';$('chart-tab').setAttribute('aria-pressed',view==='chart');$('table-tab').setAttribute('aria-pressed',view==='table');}
function exportCSV(){
  const lines=[['conjunt','indicador','descripcio','variable_referencia','referencia','enquesta','any','ponderacio','exclou_ns_nc','perfil','sexe','resposta','recompte','base','percentatge','excloses']];
  const series=isCollection()?result.series:[{id:state.indicator,result}];
  for(const s of series)for(const g of [s.result.reference,...s.result.groups])for(const v of isCollection()?[response]:s.result.responses)lines.push([isCollection()?'Menció problema':'',s.id,catalog.find(i=>i.id===s.id)?.description||mentionLabel(s.id),result.groupBy,result.groupLabel,'Totes','Tots','Sense ponderar',state.excludeNS?'Sí':'No',g.profile,g.sex,isCollection()?labelResponse(v):v,g.counts[v]||0,g.n,g.n?((g.counts[v]||0)/g.n*100).toFixed(4).replace('.',','):'',g.missing]);
  const safe=v=>{v=String(v??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
  const blob=new Blob(['\uFEFF'+lines.map(row=>row.map(safe).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`perfils_${state.groupBy}_${state.indicator}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
function adoptData(next){
  const unknown=next.headers.filter(k=>!['ID2','SEXE','estudi','ANY'].includes(k)&&!catalog.some(v=>v.id===k));
  catalog=[...catalog,...unknown.map(id=>({id,label:id.replaceAll('_',' '),description:'Descripció pendent de completar.',group:'Altres indicadors',warning:'Variable nova sense descripció al diccionari.'}))];
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
