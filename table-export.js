(function(root){
  'use strict';
  // EDITA ESTE VALOR para probar el ancho de los bloques (incluye columnas fijas).
  // Solo se aplica al activar «Divideix en blocs». 0 = nunca dividir.
  const MAX_COLUMNS_PER_BLOCK = 12;
  const esc=v=>String(v??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const note='';
  function background(value){
    const m=/rgba?\(([^)]+)\)/.exec(value||'');
    if(!m)return 'FFFFFF';
    const parts=m[1].split(',').map(Number),alpha=parts[3]??1;
    return parts.slice(0,3).map(v=>Math.round(v*alpha+255*(1-alpha)).toString(16).padStart(2,'0')).join('').toUpperCase();
  }
  // Capture the rendered table, including hidden chart-view tables, not a second calculation.
  function capture(table,meta){
    if(!table)throw Error('No hi ha cap taula amb dades per exportar.');
    const occupied=[],cells=[],rows=[...table.rows];let columns=0;
    rows.forEach((row,r)=>{
      occupied[r]??=[];let c=0;
      for(const cell of row.cells){
        while(occupied[r][c])c++;
        const copy=cell.cloneNode(true);
        // Keep the base separate from the category, including collection headers.
        const baseElement=copy.querySelector('.header-base');
        const columnBase=baseElement?.textContent.trim();
        baseElement?.remove();
        copy.querySelectorAll('small').forEach(el=>el.prepend('\n'));
        copy.querySelectorAll('i.low-dot').forEach(el=>el.replaceWith('• '));
        const header=!!cell.closest('thead'),label=cell.tagName==='TH';
        const bg=cell.style.backgroundColor?background(cell.style.backgroundColor):header?'EAF2EE':row.classList.contains('base-row')?'F7F9F8':'FFFFFF';
        const item={r,c,text:copy.textContent.trim(),rs:cell.rowSpan||1,cs:cell.colSpan||1,bold:header||label,bg,align:cell.classList.contains('row-label')?'left':'center',baseRow:row.classList.contains('base-row')};
        if(cell.dataset?.share!==undefined)item.share=Number(cell.dataset.share);
        if(cell.dataset?.volume!==undefined)item.volume=Number(cell.dataset.volume);
        if(columnBase)item.columnBase=columnBase;
        cells.push(item);
        for(let rr=r;rr<r+item.rs;rr++){occupied[rr]??=[];for(let cc=c;cc<c+item.cs;cc++)occupied[rr][cc]=true;}
        c+=item.cs;columns=Math.max(columns,c);
      }
    });
    return {...meta,cells,rows:rows.length,columns,headerRows:table.tHead?.rows.length||1,caption:table.caption?.textContent||'',note};
  }
  const cellStyle=cell=>`border:1px solid #d8e1de;padding:8px;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;text-align:${cell.align};font-weight:${cell.bold?'600':'400'};background-color:#${cell.bg};color:#243e35;${/^[=+@\-]/.test(cell.text)?'mso-number-format:"\\@";':''}`;
  function tableHTML(model,word=false,options={}){
    const font=options.compact?7.5:9,small=options.compact?6:7;
    // Continue each upper category boundary through its subheaders and data.
    const groupStarts=new Set(model.cells.filter(cell=>cell.r===0&&cell.c>0).map(cell=>cell.c));
    let html=word?`<table width="100%" border="0" cellpadding="1" cellspacing="0" style="width:100%;border-collapse:collapse;table-layout:auto;font:${font}pt Arial,sans-serif;mso-cellspacing:0;mso-padding-alt:1pt 2pt 1pt 2pt">`:'<table style="border-collapse:collapse;table-layout:fixed;width:100%;font:11px Arial,sans-serif">';
    const widths=Array.from({length:model.columns},(_,c)=>model.columns===1?100:c===0?18:82/(model.columns-1));
    html+='<colgroup>'+Array.from({length:model.columns},(_,c)=>word?`<col width="${widths[c]}%" style="width:${widths[c]}%">`:`<col style="width:${c===0?'180':'115'}px">`).join('')+'</colgroup><thead>';
    for(let r=0;r<model.rows;r++){
      if(r===model.headerRows)html+='</thead><tbody>';
      html+='<tr>'+model.cells.filter(c=>c.r===r).sort((a,b)=>a.c-b.c).map(cell=>{
        const tag=r<model.headerRows?'th':'td';
        const align='center';
        const noWrap=word&&Boolean(cell.columnBase)&&!/[\s\n]/.test(cell.text)&&cell.text.length<=20;
        const width=widths.slice(cell.c,cell.c+cell.cs).reduce((a,b)=>a+b,0);
        const separator=groupStarts.has(cell.c)?'border-left:0.5pt solid #aeb7c3;mso-border-left-alt:solid #aeb7c3 0.5pt;':'';
        const style=word?`width:${width}%;border-bottom:1px solid #d9dde1;${separator}padding:${options.compact?'1pt 2pt':'2pt 3pt'};vertical-align:middle;word-break:normal;word-wrap:normal;overflow-wrap:normal;${noWrap?'white-space:nowrap;':''}text-align:${align};font-weight:${cell.bold?'bold':'normal'};background-color:#${r<model.headerRows?'222933':cell.c===0?'F1F2F4':cell.bg};color:${r<model.headerRows?'#ffffff':'#202833'};${/^[=+@\-]/.test(cell.text)?'mso-number-format:"\\@";':''}`:cellStyle(cell);
        const lines=cell.text.split('\n');
        const contents=word?lines.map((line,i)=>{
          const count=/^(\d+) respostes$/.exec(line.trim());
          const excluded=/^(\d+) excloses$/.test(line.trim());
          if(excluded)return '';
          const base=/^n\s*=\s*(\d+)(?:\s*·.*)?$/i.exec(line.trim());
          const value=count?`n&nbsp;=&nbsp;${count[1]}`:base?`n&nbsp;=&nbsp;${base[1]}`:esc(line);
          return `<span style="font-family:Arial;font-size:${i?small:font}pt;mso-ansi-font-size:${i?small:font}pt;line-height:100%;${noWrap?'white-space:nowrap;':''}">${value}</span>`;
        }).filter(Boolean).join('<br>'):esc(cell.text).replaceAll('\n','<br>');
        // Auto-fit and nowrap on short subgroup headers keep Home/Dona and bases intact.
        // Separate paragraphs keep the category
        // above its base even when the column is wide enough for both.
        const base=word&&cell.columnBase?`<p align="${align}" style="display:block;margin:0;mso-margin-top-alt:0;mso-margin-bottom-alt:0;line-height:100%;font-family:Arial;font-size:${small}pt;mso-ansi-font-size:${small}pt;font-weight:normal;white-space:nowrap;text-align:${align};color:${r<model.headerRows?'#ffffff':'#53616b'}"><nobr>${esc(cell.columnBase).replaceAll(' ','&nbsp;')}</nobr></p>`:'';
        return `<${tag} rowspan="${cell.rs}" colspan="${cell.cs}" ${word?`width="${width}%"${noWrap?' nowrap="nowrap"':''}`:''} align="${esc(word?align:cell.align)}" valign="middle" style="${esc(style)}"><p align="${esc(word?align:cell.align)}" style="display:block;margin:0;mso-margin-top-alt:0;mso-margin-bottom-alt:0;line-height:100%;font:${word?font:9}pt Arial,sans-serif;text-align:${esc(word?align:cell.align)}">${contents}</p>${base}</${tag}>`;
      }).join('')+'</tr>';
    }
    return html+(model.rows<=model.headerRows?'</thead>':'</tbody>')+'</table>';
  }
  // A column-layout table has one common denominator per group. Collections have
  // independent bases in each cell, so they intentionally have no base row.
  function compactBases(model){
    const baseRow=model.cells.find(c=>c.baseRow)?.r;
    if(baseRow===undefined||baseRow<model.headerRows||baseRow>model.headerRows+1)return model;
    if(baseRow>model.headerRows&&!model.cells.some(c=>c.r===model.headerRows&&c.volume!==undefined))return model;
    const cells=model.cells.filter(c=>c.r!==baseRow).map(c=>({...c}));
    for(const base of model.cells.filter(c=>c.baseRow&&c.c>0)){
      const header=cells.find(c=>c.r<model.headerRows&&c.r+c.rs===model.headerRows&&c.c===base.c&&c.cs===1);
      if(!header)return model;
      const count=base.text.split('\n')[0].trim();
      header.columnBase='n = '+count;
    }
    cells.forEach(c=>{if(c.r>baseRow)c.r--;});
    return {...model,cells,rows:model.rows-1};
  }
  function reportParts(model,options={}){
    const prepared=compactBases(model);
    return options.split?panels(prepared,MAX_COLUMNS_PER_BLOCK):[prepared];
  }
  function html(model,options={}){
    const parts=reportParts(model,options);
    return `<div style="font:9pt Arial,sans-serif;color:#202833"><h2 style="margin:0 0 4pt;font:bold 13pt Arial;color:#df2429">${esc(model.title)}</h2><p style="margin:0 0 4pt;font:8pt Arial">${esc(model.context)}</p>${model.description&&model.description!==model.title?`<p style="margin:4pt 0;font:8pt Arial">${esc(model.description)}</p>`:''}${parts.map((part,i)=>`${parts.length>1?`<p style="margin:4pt 0;font:bold 8pt Arial">Bloc ${i+1} de ${parts.length}</p>`:''}${tableHTML(part,true,options)}<p style="margin:2pt 0">&nbsp;</p>`).join('')}<p style="margin:3pt 0;font:7pt Arial">${esc(model.caption)}</p><p style="margin:3pt 0;font:7pt Arial">${esc(model.note)}</p></div>`;
  }
  function tsv(model,options={}){
    const safe=value=>{let s=String(value);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return s.replaceAll('\t',' ').replaceAll('\r',' ');};
    const parts=reportParts(model,options);
    const tables=parts.flatMap((part,i)=>{
      const grid=Array.from({length:part.rows},()=>Array(part.columns).fill(''));
      for(const cell of part.cells)grid[cell.r][cell.c]=cell.text.split('\n').filter(line=>!/^\d+ excloses$/.test(line.trim())).map(line=>line.replace(/^(\d+) respostes$/,'n = $1').replace(/^(n\s*=\s*\d+)\s*·.*$/,'$1')).join(' · ')+(cell.columnBase?' · '+cell.columnBase:'');
      return [...(parts.length>1?[`Bloc ${i+1} de ${parts.length}`]:[]),...grid.map(row=>row.map(safe).join('\t')),''];
    });
    return [safe(model.title),safe(model.context),...tables,safe(model.caption),safe(model.note)].join('\r\n');
  }
  // Split wide tables at group boundaries. Repeat row labels and the reference/base columns.
  function panels(model,maxColumns=MAX_COLUMNS_PER_BLOCK){
    if(!Number.isInteger(maxColumns)||maxColumns<0)throw Error('MAX_COLUMNS_PER_BLOCK ha de ser un enter positiu o 0.');
    if(maxColumns===0||model.columns<=maxColumns)return [model];
    const fixed=Math.min(model.fixedColumns||1,model.columns);
    if(maxColumns<=fixed)throw Error(`El límit ha de superar les ${fixed} columnes fixes d’aquesta taula.`);
    const capacity=maxColumns-fixed;
    const chunks=[];let start=fixed;
    while(start<model.columns){
      const heading=model.cells.find(c=>c.r===0&&c.c===start);
      const width=Math.min(heading?.cs||1,model.columns-start);
      for(let offset=0;offset<width;offset+=capacity)chunks.push(Array.from({length:Math.min(capacity,width-offset)},(_,i)=>start+offset+i));
      start+=width;
    }
    const batches=[];let current=[];
    for(const chunk of chunks){if(current.length+chunk.length>capacity){batches.push(current);current=[];}current.push(...chunk);}
    if(current.length)batches.push(current);if(!batches.length)batches.push([]);
    return batches.map(batch=>{
      const selected=[...Array.from({length:fixed},(_,i)=>i),...batch],cells=[];
      for(const cell of model.cells){
        const covered=selected.filter(c=>c>=cell.c&&c<cell.c+cell.cs);
        if(covered.length)cells.push({...cell,c:selected.indexOf(covered[0]),cs:covered.length});
      }
      return {...model,columns:selected.length,cells};
    });
  }
  function printHTML(model,options={}){
    const parts=reportParts(model,options);
    return parts.map((part,i)=>`<section class="print-panel">${html(part,{...options,split:false})}${parts.length>1?`<p class="print-counter">Bloc ${i+1} de ${parts.length}</p>`:''}</section>`).join('');
  }
  const columnName=index=>{let name='';for(let n=index+1;n;n=Math.floor((n-1)/26))name=String.fromCharCode(65+(n-1)%26)+name;return name;};
  // Small uncompressed ZIP writer: standard XLSX parts, no network or runtime dependencies.
  function zip(files){
    const encoder=new TextEncoder(),parts=[],central=[];let offset=0;
    const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
    const crc=bytes=>{let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;};
    for(const [name,content] of Object.entries(files)){
      const filename=encoder.encode(name),data=encoder.encode(content),checksum=crc(data);
      const local=new Uint8Array(30+filename.length),lv=new DataView(local.buffer);
      lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint16(12,33,true);
      lv.setUint32(14,checksum,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,filename.length,true);local.set(filename,30);
      const entry=new Uint8Array(46+filename.length),cv=new DataView(entry.buffer);
      cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(14,33,true);
      cv.setUint32(16,checksum,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,filename.length,true);cv.setUint32(42,offset,true);entry.set(filename,46);
      parts.push(local,data);central.push(entry);offset+=local.length+data.length;
    }
    const centralSize=central.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);
    ev.setUint32(0,0x06054b50,true);ev.setUint16(8,central.length,true);ev.setUint16(10,central.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
    const all=[...parts,...central,end],bytes=new Uint8Array(offset+centralSize+22);let position=0;
    for(const part of all){bytes.set(part,position);position+=part.length;}return bytes;
  }
  function xlsx(model){
    const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const xml=body=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+body;
    const prefix=[model.title,model.description,model.context,model.caption,model.note,''],shift=prefix.length;
    const cells=[...prefix.slice(0,-1).map((text,r)=>({r,c:0,text,rs:1,cs:model.columns,bold:r===0,bg:'FFFFFF',align:'left',meta:true})),...model.cells.map(c=>({...c,text:c.text+(c.columnBase?'\n'+c.columnBase:''),r:c.r+shift}))];
    const fills=['FFFFFF'],styles=[],styleMap=new Map(),merges=[];
    const styleId=(cell,numeric)=>{
      if(!fills.includes(cell.bg))fills.push(cell.bg);
      const spec={bold:!!cell.bold,fill:fills.indexOf(cell.bg)+2,align:cell.align,format:numeric==='percent'?164:0,border:cell.meta?0:1};
      const key=JSON.stringify(spec);if(!styleMap.has(key)){styleMap.set(key,styles.length);styles.push(spec);}return styleMap.get(key);
    };
    const rows=[];
    for(let r=0;r<model.rows+shift;r++){
      const entries=cells.filter(c=>c.r===r).sort((a,b)=>a.c-b.c);
      let height=r<shift?[28,34,42,52,24,10][r]:24;
      const body=entries.map(cell=>{
        const address=columnName(cell.c)+(r+1),text=String(cell.text);
        const numeric=Number.isFinite(cell.volume)?'number':!cell.bold&&!cell.meta&&/^\d+(?:[,.]\d+)?%$/.test(text)?'percent':!cell.bold&&!cell.meta&&/^\d+$/.test(text)?'number':'';
        const style=styleId(cell,numeric);
        if(cell.rs>1||cell.cs>1)merges.push(`${address}:${columnName(cell.c+cell.cs-1)}${r+cell.rs}`);
        if(r>=shift&&cell.rs===1){const chars=cell.c===0?30:20;const lines=text.split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/(chars*cell.cs))),0);height=Math.max(height,lines*14+12);}
        return `<c r="${address}" s="${style}"${numeric?'':' t="inlineStr"'}>${numeric?`<v>${cell.volume??cell.share??(parseFloat(text.replace(',','.'))/(numeric==='percent'?100:1))}</v>`:`<is><t xml:space="preserve">${esc(text)}</t></is>`}</c>`;
      }).join('');
      rows.push(`<row r="${r+1}" ht="${height}" customHeight="1">${body}</row>`);
    }
    const styleXML=xml(`<styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="${[0,1,2].includes(model.decimals)?'0'+(model.decimals?'.'+'0'.repeat(model.decimals):'')+'%':'0.0%'}"/></numFmts><fonts count="2"><font><sz val="11"/><color rgb="FF243E35"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF243E35"/><name val="Calibri"/></font></fonts><fills count="${fills.length+2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fills.map(bg=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${bg}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills><borders count="2"><border/><border>${['left','right','top','bottom'].map(side=>`<${side} style="thin"><color rgb="FFD8E1DE"/></${side}>`).join('')}</border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${styles.length}">${styles.map(s=>`<xf numFmtId="${s.format}" fontId="${s.bold?1:0}" fillId="${s.fill}" borderId="${s.border}" xfId="0" applyAlignment="1" applyFill="1" applyFont="1" applyNumberFormat="1" applyBorder="1"><alignment horizontal="${s.align}" vertical="center" wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    const fixed=Math.min(model.fixedColumns||1,model.columns-1),frozen=shift+model.headerRows;
    const sheet=xml(`<worksheet xmlns="${ns}"><dimension ref="A1:${columnName(model.columns-1)}${model.rows+shift}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane xSplit="${fixed}" ySplit="${frozen}" topLeftCell="${columnName(fixed)}${frozen+1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols>${Array.from({length:model.columns},(_,i)=>`<col min="${i+1}" max="${i+1}" width="${i===0?34:22}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData>${merges.length?`<mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`:''}<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape"/></worksheet>`);
    return zip({
      '[Content_Types].xml':xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
      '_rels/.rels':xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
      'xl/workbook.xml':xml(`<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="Taula" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'Taula'!$${shift+1}:$${frozen}</definedName></definedNames></workbook>`),
      'xl/_rels/workbook.xml.rels':xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`),
      'xl/styles.xml':styleXML,'xl/worksheets/sheet1.xml':sheet
    });
  }
  function copyWithSelection(markup,plain,doc=root.document){
    if(!doc?.execCommand)return false;
    const selection=doc.getSelection(),active=doc.activeElement,ranges=[];
    if(!selection)return false;
    for(let i=0;i<selection.rangeCount;i++)ranges.push(selection.getRangeAt(i).cloneRange());
    const container=doc.createElement('div');container.contentEditable='true';
    container.style.cssText='position:fixed;left:-10000px;top:0;width:900px;background:white;';
    container.innerHTML=markup;let handled=false;
    const onCopy=event=>{
      if(!event.clipboardData)return;
      try{event.clipboardData.setData('text/html',markup);event.clipboardData.setData('text/plain',plain);event.preventDefault();handled=true;}catch{/* Let the browser copy the selection if custom formats fail. */}
    };
    try{
      (doc.querySelector('dialog[open]')||doc.body).appendChild(container);
      container.focus({preventScroll:true});const range=doc.createRange();range.selectNodeContents(container);
      selection.removeAllRanges();selection.addRange(range);doc.addEventListener('copy',onCopy);
      return doc.execCommand('copy')&&handled;
    }catch{return false;}
    finally{
      doc.removeEventListener('copy',onCopy);container.remove();
      active?.focus?.({preventScroll:true});selection.removeAllRanges();
      for(const range of ranges){try{selection.addRange(range);}catch{/* The old selection may have been removed. */}}
    }
  }
  async function copyFormatted(model,env=root,options={}){
    const markup=html(model,options),plain=tsv(model,options);
    try{
      if(env.navigator?.clipboard?.write&&env.ClipboardItem){
        await env.navigator.clipboard.write([new env.ClipboardItem({'text/html':new env.Blob([markup],{type:'text/html'}),'text/plain':new env.Blob([plain],{type:'text/plain'})})]);
        return true;
      }
    }catch{/* Denied rich writes must continue to the selection-based fallback. */}
    return copyWithSelection(markup,plain,env.document);
  }
  const api={MAX_COLUMNS_PER_BLOCK,reportParts,capture,compactBases,html,tsv,panels,printHTML,xlsx,background,copyWithSelection,copyFormatted};
  if(typeof module!=='undefined')module.exports=api;else root.TableExport=api;
})(typeof window!=='undefined'?window:globalThis);
