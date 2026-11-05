const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8'};
const publicFiles=new Set(['index.html','styles.css','catalog.js','core.js','data-loader.js','table.js','app.js','data.csv']);
const server = http.createServer((req,res)=>{
  let target;
  try { target = path.resolve(root, '.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)); } catch {res.writeHead(400).end();return;}
  if (!target.startsWith(root+path.sep) && target!==root) {res.writeHead(403).end();return;}
  if(target===root) target=path.join(root,'index.html');
  if(!publicFiles.has(path.relative(root,target))){res.writeHead(404).end('No trobat');return;}
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end('No trobat');return;} res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
});
server.listen(Number(process.env.PORT)||5173,'127.0.0.1',()=>console.log('Perfils electorals: http://127.0.0.1:'+server.address().port));
