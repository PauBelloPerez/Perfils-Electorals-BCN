(function(root){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function profileBlocks(groups,{grouped,reference}){
    const blocks=[];
    groups.forEach((g,i)=>{
      // Keep the selected total separate even if an imported profile has the same label.
      const previous=blocks.at(-1);
      if(grouped&&previous&&previous.profile===g.profile&&!(reference&&i===1))previous.groups.push({g,i});
      else blocks.push({profile:g.profile,groups:[{g,i}]});
    });
    return blocks;
  }
  function columnHeaders(blocks,labels,headerBase=()=>'',prefix='table'){
    const bySex=blocks.some(b=>b.groups.some(({g})=>g.bloc&&g.sex!=='Total'));
    const fixed=labels.map((label,i)=>`<th rowspan="${bySex?3:2}" scope="col"${i===0?' class="row-label"':''}>${esc(label)}</th>`).join('');
    const profiles=blocks.map((b,j)=>`<th id="${prefix}-profile-${j}" scope="colgroup" colspan="${b.groups.length}" class="profile-heading group-start">${esc(b.profile)}</th>`).join('');
    const subgroup=(entry,parents,css,label,rowspan=1)=>{
      const {g,i}=entry;
      return `<th id="${prefix}-subgroup-${i}" headers="${parents}" scope="col" class="${css}"${rowspan>1?` rowspan="${rowspan}"`:''}>${esc(label)}${headerBase(g)}</th>`;
    };
    let middle='',bottom='';
    blocks.forEach((block,j)=>{
      const parent=`${prefix}-profile-${j}`;
      if(!bySex||!block.groups[0].g.bloc){
        middle+=block.groups.map((entry,k)=>subgroup(entry,parent,k===0?'group-start':'',entry.g.subgroup??entry.g.sex,bySex?2:1)).join('');
        return;
      }
      const sexGroups=new Map();
      for(const entry of block.groups){
        if(!sexGroups.has(entry.g.sex))sexGroups.set(entry.g.sex,[]);
        sexGroups.get(entry.g.sex).push(entry);
      }
      let first=true;
      for(const [sex,entries] of sexGroups){
        const id=`${prefix}-sex-${entries[0].i}`;
        const start=first?'group-start':'sex-start';
        middle+=`<th id="${id}" headers="${parent}" colspan="${entries.length}" class="sex-heading ${start}">${esc(sex)}</th>`;
        bottom+=entries.map((entry,k)=>subgroup(entry,`${parent} ${id}`,k===0?start:'',entry.g.bloc)).join('');
        first=false;
      }
    });
    return `<tr>${fixed}${profiles}</tr><tr>${middle}</tr>${bySex?`<tr>${bottom}</tr>`:''}`;
  }
  function columnGroups(blocks,fixed){
    return `<colgroup span="${fixed}"></colgroup>`+blocks.map(b=>`<colgroup span="${b.groups.length}"></colgroup>`).join('');
  }
  function render(result,options,labelResponse){
    const decimals=[0,1,2].includes(options.decimals)?options.decimals:1;
    const fmt=n=>new Intl.NumberFormat('ca-ES',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}).format(n);
    if(!result.valid)return '<div class="empty">No hi ha dades per a aquesta selecció.</div>';
    const groups=options.reference?[result.reference,...result.groups]:result.groups;
    const blocks=profileBlocks(groups,options);
    const base=g=>`${g.n>0&&g.n<30?'<i class="low-dot" aria-label="Base reduïda"></i>':''}${g.n}<small>${g.missing} excloses</small>`;
    const commonBase=g=>{
      const cells=Object.values(g.cells);
      return cells.every(c=>c.n===cells[0].n)?cells[0].n:null;
    };
    const headerBase=g=>{
      if(!result.collection)return '';
      const n=commonBase(g);
      return '<small class="header-base">'+(n===null?'n variable':'n='+n)+'</small>';
    };
    const cell=(g,v,headers)=>{
      const c=result.collection?g.cells[v]:{n:g.n,count:g.counts[v],missing:g.missing};
      const p=c.n?c.count/c.n:0;
      const showBase=result.collection&&result.politicalExcluded!=null&&commonBase(g)===null;
      return `<td headers="${headers}"${result.collection?` title="Base de ${c.n} respostes vàlides · ${c.missing} excloses"`:''}${options.heat&&c.n?` style="background-color:rgba(22,118,109,${p*.30})"`:''}>${result.collection&&c.n>0&&c.n<30?'<i class="low-dot" aria-label="Base reduïda"></i>':''}${c.n?fmt(p*100)+'%':'—'}${options.counts?`<small>${c.count} respostes</small>`:''}${showBase?`<small>n = ${c.n}</small>`:''}</td>`;
    };
    let head,body;
    if(options.orientation==='columns'){
      head=columnHeaders(blocks,[result.collection?'Indicador':'Resposta'],headerBase);
      body=result.collection?'':`<tr class="base-row"><th id="table-base" scope="row" class="row-label">Base (n)</th>${groups.map((g,i)=>`<td headers="table-base table-subgroup-${i}">${base(g)}</td>`).join('')}</tr>`;
      body+=result.responses.map((v,r)=>`<tr><th id="table-answer-${r}" scope="row" class="row-label">${esc(labelResponse(v))}</th>${groups.map((g,i)=>cell(g,v,`table-answer-${r} table-subgroup-${i}`)).join('')}</tr>`).join('');
    }else{
      head=`<tr><th scope="col" class="row-label">Categoria</th><th scope="col">${esc(result.breakdownLabel||'Sexe')}</th>${result.collection?'':'<th scope="col">Base (n)</th>'}${result.responses.map((v,r)=>`<th id="table-answer-${r}" scope="col">${esc(labelResponse(v))}</th>`).join('')}</tr>`;
      body=blocks.map((b,j)=>b.groups.map(({g,i},k)=>`<tr>${k===0?`<th id="table-profile-${j}" scope="${b.groups.length>1?'rowgroup':'row'}" rowspan="${b.groups.length}" class="row-label">${esc(b.profile)}</th>`:''}<th id="table-subgroup-${i}" headers="table-profile-${j}" scope="row">${esc(g.subgroup??g.sex)}${headerBase(g)}</th>${result.collection?'':`<td headers="table-subgroup-${i}">${base(g)}</td>`}${result.responses.map((v,r)=>cell(g,v,`table-profile-${j} table-subgroup-${i} table-answer-${r}`)).join('')}</tr>`).join('')).join('');
    }
    const caption=`Referència: ${esc(result.groupLabel||'Perfils sociodemogràfics')}. ${result.collection?`${esc(result.collectionLabel||'Menció problema')} · Resposta: ${esc(result.responseLabel||(result.response==='1'?'Sí':'No'))}. Base pròpia per indicador, grup i subgrup. Els percentatges dels indicadors no han de sumar 100%.`:'Percentatges dins de cada grup i subgrup.'} Desglossament: ${esc(result.breakdownLabel||'Sexe')}.${options.counts?' Recompte sota cada percentatge.':''}${options.heat?' Color més intens = percentatge més alt (escala comuna de 0 a 100%).':''}`;
    const columns=options.orientation==='columns'?columnGroups(blocks,1):'';
    return `<table class="results-table ${options.orientation}"><caption>${caption}</caption>${columns}<thead>${head}</thead><tbody>${body}</tbody></table>`;
  }
  const api={render,profileBlocks,columnHeaders,columnGroups};
  if(typeof module!=='undefined')module.exports=api;else root.ProfileTable=api;
})(typeof window!=='undefined'?window:globalThis);
