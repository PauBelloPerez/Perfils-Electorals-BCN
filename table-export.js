(function(root){
  'use strict';
  const esc=v=>String(v??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const note='• n < 30: base reduïda, lectura orientativa. — Sense base de resposta.';
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
        copy.querySelectorAll('small').forEach(el=>el.prepend('\n'));
        copy.querySelectorAll('i.low-dot').forEach(el=>el.replaceWith('• '));
        const header=!!cell.closest('thead'),label=cell.tagName==='TH';
        const bg=cell.style.backgroundColor?background(cell.style.backgroundColor):header?'EAF2EE':row.classList.contains('base-row')?'F7F9F8':'FFFFFF';
        const item={r,c,text:copy.textContent.trim(),rs:cell.rowSpan||1,cs:cell.colSpan||1,bold:header||label,bg,align:cell.classList.contains('row-label')?'left':'center'};
        cells.push(item);
        for(let rr=r;rr<r+item.rs;rr++){occupied[rr]??=[];for(let cc=c;cc<c+item.cs;cc++)occupied[rr][cc]=true;}
        c+=item.cs;columns=Math.max(columns,c);
      }
    });
    return {...meta,cells,rows:rows.length,columns,headerRows:table.tHead?.rows.length||1,caption:table.caption?.textContent||'',note};
  }
  const cellStyle=cell=>`border:1px solid #d8e1de;padding:8px;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;text-align:${cell.align};font-weight:${cell.bold?'600':'400'};background-color:#${cell.bg};color:#243e35;${/^[=+@\-]/.test(cell.text)?'mso-number-format:"\\@";':''}`;
  function tableHTML(model){
    let html='<table style="border-collapse:collapse;table-layout:fixed;width:100%;font:11px Arial,sans-serif">';
    html+='<colgroup>'+Array.from({length:model.columns},(_,c)=>`<col style="width:${c===0?'180':'115'}px">`).join('')+'</colgroup><thead>';
    for(let r=0;r<model.rows;r++){
      if(r===model.headerRows)html+='</thead><tbody>';
      html+='<tr>'+model.cells.filter(c=>c.r===r).sort((a,b)=>a.c-b.c).map(cell=>{
        const tag=r<model.headerRows?'th':'td';
        return `<${tag} rowspan="${cell.rs}" colspan="${cell.cs}" style="${esc(cellStyle(cell))}">${esc(cell.text).replaceAll('\n','<br>')}</${tag}>`;
      }).join('')+'</tr>';
    }
    return html+'</tbody></table>';
  }
  function html(model){
    return `<div style="font:12px Arial,sans-serif;color:#243e35"><h2>${esc(model.title)}</h2><p>${esc(model.description)}</p><p>${esc(model.context)}</p><p>${esc(model.caption)}</p>${tableHTML(model)}<p>${esc(model.note)}</p></div>`;
  }
  function tsv(model){
    const grid=Array.from({length:model.rows},()=>Array(model.columns).fill(''));
    for(const cell of model.cells)grid[cell.r][cell.c]=cell.text.replaceAll('\n',' · ');
    const safe=value=>{let s=String(value);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return s.replaceAll('\t',' ').replaceAll('\r',' ');};
    return [safe(model.title),safe(model.context),...grid.map(row=>row.map(safe).join('\t')),safe(model.note)].join('\r\n');
  }
  // Split wide tables at group boundaries. Repeat row labels and the reference/base columns.
  function panels(model,maxColumns=8){
    const fixed=Math.min(model.fixedColumns||1,model.columns),capacity=Math.max(1,maxColumns-fixed);
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
  function printHTML(model){
    const parts=panels(model);
    return parts.map((part,i)=>`<section class="print-panel"><h2>${esc(model.title)}</h2><p>${esc(model.description)}</p><p>${esc(model.context)}</p><p>${esc(model.caption)}</p><p class="print-counter">Bloc ${i+1} de ${parts.length}</p>${tableHTML(part)}<p>${esc(model.note)}</p></section>`).join('');
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
    const cells=[...prefix.slice(0,-1).map((text,r)=>({r,c:0,text,rs:1,cs:model.columns,bold:r===0,bg:'FFFFFF',align:'left',meta:true})),...model.cells.map(c=>({...c,r:c.r+shift}))];
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
        const numeric=!cell.bold&&!cell.meta&&/^\d+(?:[,.]\d+)?%$/.test(text)?'percent':!cell.bold&&!cell.meta&&/^\d+$/.test(text)?'number':'';
        const style=styleId(cell,numeric);
        if(cell.rs>1||cell.cs>1)merges.push(`${address}:${columnName(cell.c+cell.cs-1)}${r+cell.rs}`);
        if(r>=shift&&cell.rs===1){const chars=cell.c===0?30:20;const lines=text.split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/(chars*cell.cs))),0);height=Math.max(height,lines*14+12);}
        return `<c r="${address}" s="${style}"${numeric?'':' t="inlineStr"'}>${numeric?`<v>${parseFloat(text.replace(',','.'))/(numeric==='percent'?100:1)}</v>`:`<is><t xml:space="preserve">${esc(text)}</t></is>`}</c>`;
      }).join('');
      rows.push(`<row r="${r+1}" ht="${height}" customHeight="1">${body}</row>`);
    }
    const styleXML=xml(`<styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts><fonts count="2"><font><sz val="11"/><color rgb="FF243E35"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF243E35"/><name val="Calibri"/></font></fonts><fills count="${fills.length+2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fills.map(bg=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${bg}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills><borders count="2"><border/><border>${['left','right','top','bottom'].map(side=>`<${side} style="thin"><color rgb="FFD8E1DE"/></${side}>`).join('')}</border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${styles.length}">${styles.map(s=>`<xf numFmtId="${s.format}" fontId="${s.bold?1:0}" fillId="${s.fill}" borderId="${s.border}" xfId="0" applyAlignment="1" applyFill="1" applyFont="1" applyNumberFormat="1" applyBorder="1"><alignment horizontal="${s.align}" vertical="center" wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
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
  async function copyFormatted(model,env=root){
    const markup=html(model),plain=tsv(model);
    try{
      if(env.navigator?.clipboard?.write&&env.ClipboardItem){
        await env.navigator.clipboard.write([new env.ClipboardItem({'text/html':new env.Blob([markup],{type:'text/html'}),'text/plain':new env.Blob([plain],{type:'text/plain'})})]);
        return true;
      }
    }catch{/* Denied rich writes must continue to the selection-based fallback. */}
    return copyWithSelection(markup,plain,env.document);
  }
  const api={capture,html,tsv,panels,printHTML,xlsx,background,copyWithSelection,copyFormatted};
  if(typeof module!=='undefined')module.exports=api;else root.TableExport=api;
})(typeof window!=='undefined'?window:globalThis);
