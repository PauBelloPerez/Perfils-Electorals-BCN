(function(root){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>new Intl.NumberFormat('ca-ES',{maximumFractionDigits:1,minimumFractionDigits:1}).format(n);
  function render(result,options,labelResponse){
    if(!result.valid)return '<div class="empty">No hi ha dades per a aquesta selecció.</div>';
    const groups=options.reference?[result.reference,...result.groups]:result.groups;
    const blocks=[];
    groups.forEach((g,i)=>{
      // The reference is its own block even if an imported profile has the same name.
      const previous=blocks.at(-1);
      if(options.grouped&&previous&&previous.profile===g.profile&&!(options.reference&&i===1))previous.groups.push({g,i});
      else blocks.push({profile:g.profile,groups:[{g,i}]});
    });
    const base=g=>`${g.n>0&&g.n<30?'<i class="low-dot" aria-label="Base reduïda"></i>':''}${g.n}<small>${g.missing} excloses</small>`;
    const cell=(g,v,headers)=>{
      const c=result.collection?g.cells[v]:{n:g.n,count:g.counts[v],missing:g.missing};
      const p=c.n?c.count/c.n:0;
      return `<td headers="${headers}"${options.heat&&c.n?` style="background-color:rgba(22,118,109,${p*.30})"`:''}>${result.collection&&c.n>0&&c.n<30?'<i class="low-dot" aria-label="Base reduïda"></i>':''}${c.n?fmt(p*100)+'%':'—'}${options.counts?`<small>${c.count} respostes</small>`:''}${result.collection?`<small>n=${c.n} · ${c.missing} excloses</small>`:''}</td>`;
    };
    let head,body;
    if(options.orientation==='columns'){
      head=`<tr><th id="table-response" rowspan="2" scope="col" class="row-label">${result.collection?'Indicador':'Resposta'}</th>${blocks.map((b,j)=>`<th id="table-profile-${j}" scope="colgroup" colspan="${b.groups.length}" class="profile-heading group-start">${esc(b.profile)}</th>`).join('')}</tr><tr>${blocks.map((b,j)=>b.groups.map(({g,i},k)=>`<th id="table-sex-${i}" headers="table-profile-${j}" scope="col" class="${k===0?'group-start':''}">${esc(g.sex)}</th>`).join('')).join('')}</tr>`;
      body=result.collection?'':`<tr class="base-row"><th id="table-base" scope="row" class="row-label">Base (n)</th>${groups.map((g,i)=>`<td headers="table-base table-sex-${i}">${base(g)}</td>`).join('')}</tr>`;
      body+=result.responses.map((v,r)=>`<tr><th id="table-answer-${r}" scope="row" class="row-label">${esc(labelResponse(v))}</th>${groups.map((g,i)=>cell(g,v,`table-answer-${r} table-sex-${i}`)).join('')}</tr>`).join('');
    }else{
      head=`<tr><th scope="col" class="row-label">Categoria</th><th scope="col">Sexe</th>${result.collection?'':'<th scope="col">Base (n)</th>'}${result.responses.map((v,r)=>`<th id="table-answer-${r}" scope="col">${esc(labelResponse(v))}</th>`).join('')}</tr>`;
      body=blocks.map((b,j)=>b.groups.map(({g,i},k)=>`<tr>${k===0?`<th id="table-profile-${j}" scope="${b.groups.length>1?'rowgroup':'row'}" rowspan="${b.groups.length}" class="row-label">${esc(b.profile)}</th>`:''}<th id="table-sex-${i}" headers="table-profile-${j}" scope="row">${esc(g.sex)}</th>${result.collection?'':`<td headers="table-sex-${i}">${base(g)}</td>`}${result.responses.map((v,r)=>cell(g,v,`table-profile-${j} table-sex-${i} table-answer-${r}`)).join('')}</tr>`).join('')).join('');
    }
    const caption=`Referència: ${esc(result.groupLabel||'Perfils sociodemogràfics')}. ${result.collection?`Menció problema · Resposta: ${result.response==='1'?'Sí':'No'}. Base pròpia per indicador, grup i sexe. Els percentatges dels problemes no han de sumar 100%.`:'Percentatges dins de cada grup i sexe.'}${options.counts?' Recompte sota cada percentatge.':''}${options.heat?' Color més intens = percentatge més alt (escala comuna de 0 a 100%).':''}`;
    return `<table class="results-table ${options.orientation}"><caption>${caption}</caption><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }
  if(typeof module!=='undefined')module.exports={render};else root.ProfileTable={render};
})(typeof window!=='undefined'?window:globalThis);
