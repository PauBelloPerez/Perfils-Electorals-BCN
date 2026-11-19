(function(root){
  'use strict';
  // Draw text and cells directly: no external images, fonts or network requests.
  async function png(model,options={},doc=root.document){
    const canvas=doc.createElement('canvas'),ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Aquest navegador no pot preparar la imatge.');
    const parts=root.TableExport.reportParts(model,options),font=options.compact?12:14;
    const padding=options.compact?6:10,lineHeight=font*1.3,margin=24;
    const widths=part=>Array.from({length:part.columns},(_,c)=>c===0?250:140);
    const width=Math.max(720,...parts.map(part=>widths(part).reduce((a,b)=>a+b,0)))+margin*2;
    if(width*2>16000)throw Error('La imatge és massa ampla. Activa «Divideix en blocs» o selecciona menys columnes.');
    const wrap=(value,maxWidth)=>{
      const lines=[];
      for(const paragraph of String(value||'').split('\n')){
        let line='';
        for(const word of paragraph.split(/\s+/)){
          const next=line?line+' '+word:word;
          if(ctx.measureText(next).width<=maxWidth){line=next;continue;}
          if(line){lines.push(line);line='';}
          // Long labels must wrap too; no text is truncated.
          for(const ch of Array.from(word)){
            if(line&&ctx.measureText(line+ch).width>maxWidth){lines.push(line);line='';}
            line+=ch;
          }
        }
        lines.push(line);
      }
      return lines;
    };
    const operations=[];let y=margin;
    const paragraph=(value,size,color,bold=false)=>{
      if(!value)return;
      ctx.font=`${bold?'bold ':''}${size}px Arial`;
      const lines=wrap(value,width-margin*2);
      operations.push({text:lines,x:margin,y,size,color,bold});
      y+=lines.length*size*1.3+10;
    };
    paragraph(model.title,22,'#df2429',true);
    paragraph(model.context,12,'#53616b');
    if(model.description!==model.title)paragraph(model.description,12,'#53616b');
    parts.forEach((part,index)=>{
      if(parts.length>1)paragraph(`Bloc ${index+1} de ${parts.length}`,14,'#202833',true);
      const cols=widths(part),xs=[margin];cols.forEach(w=>xs.push(xs.at(-1)+w));
      const heights=Array(part.rows).fill(lineHeight+padding*2);
      const cells=part.cells.map(cell=>{
        ctx.font=`${cell.bold?'bold ':''}${font}px Arial`;
        const text=cell.text.replaceAll('\x07','•').split('\n').filter(line=>!/^\d+ excloses$/.test(line.trim())).map(line=>line.replace(/^(\d+) respostes$/,'n = $1')).join('\n');
        const lines=wrap(text+(cell.columnBase?'\n'+cell.columnBase:''),xs[cell.c+cell.cs]-xs[cell.c]-padding*2);
        return {...cell,lines};
      });
      // Resolve rowspans after ordinary cells so merged labels always fit.
      for(const cell of [...cells].sort((a,b)=>a.rs-b.rs)){
        const needed=cell.lines.length*lineHeight+padding*2;
        const current=heights.slice(cell.r,cell.r+cell.rs).reduce((a,b)=>a+b,0);
        if(needed>current)heights[cell.r+cell.rs-1]+=needed-current;
      }
      const ys=[y];heights.forEach(h=>ys.push(ys.at(-1)+h));
      for(const cell of cells){
        const header=cell.r<part.headerRows;
        operations.push({cell,x:xs[cell.c],y:ys[cell.r],width:xs[cell.c+cell.cs]-xs[cell.c],height:ys[cell.r+cell.rs]-ys[cell.r],bg:header?'#222933':cell.c===0?'#F1F2F4':'#'+cell.bg,color:header?'#ffffff':'#202833'});
      }
      y=ys.at(-1)+20;
    });
    paragraph(model.caption,11,'#53616b');paragraph(model.note,11,'#53616b');
    const height=Math.ceil(y+margin),scale=2;
    if(height*scale>30000||width*height*scale*scale>60000000)throw Error('La imatge és massa gran. Redueix la selecció o copia la taula editable.');
    canvas.width=width*scale;canvas.height=height*scale;ctx.scale(scale,scale);
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.textBaseline='top';
    for(const op of operations){
      if(op.cell){
        ctx.fillStyle=op.bg;ctx.fillRect(op.x,op.y,op.width,op.height);
        ctx.strokeStyle='#d9dde1';ctx.lineWidth=.5;ctx.strokeRect(op.x,op.y,op.width,op.height);
        ctx.font=`${op.cell.bold?'bold ':''}${font}px Arial`;ctx.fillStyle=op.color;
        op.cell.lines.forEach((line,i)=>ctx.fillText(line,op.x+(op.width-ctx.measureText(line).width)/2,op.y+(op.height-op.cell.lines.length*lineHeight)/2+i*lineHeight));
      }else{
        ctx.font=`${op.bold?'bold ':''}${op.size}px Arial`;ctx.fillStyle=op.color;
        op.text.forEach((line,i)=>ctx.fillText(line,op.x,op.y+i*op.size*1.3));
      }
    }
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No s’ha pogut crear la imatge.')),'image/png'));
  }
  root.TableImage={png};
})(typeof window!=='undefined'?window:globalThis);
