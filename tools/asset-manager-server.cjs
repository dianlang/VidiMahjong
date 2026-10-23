'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createStore,inside}=require('./asset-store.cjs');
function startServer({sourceRoot,gameRoot=sourceRoot,port=8766,token=crypto.randomBytes(24).toString('hex')}){
 const store=createStore({sourceRoot,gameRoot});let pending=Promise.resolve();
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host,actual=server.address().port,allowed=new Set([`127.0.0.1:${actual}`,`localhost:${actual}`]);
  if(!allowed.has(host)){json(res,403,{error:'只允许本机访问'});return;}
  const origin=req.headers.origin;if(origin&&!new Set([...allowed].map(h=>'http://'+h)).has(origin)){json(res,403,{error:'来源无效'});return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch(_){json(res,400,{error:'地址无效'});return;}
  if(pathname.startsWith('/api/')){
   if(req.headers['x-queye-token']!==token){json(res,403,{error:'请从本机素材管理页面操作'});return;}
   try{
    if(req.method==='GET'&&pathname==='/api/catalog'){json(res,200,store.snapshot());return;}
    if(req.method==='GET'&&pathname==='/api/backups'){json(res,200,{backups:store.history()});return;}
    if(req.method!=='POST'){json(res,404,{error:'找不到此功能'});return;}
    let bytes=0;const chunks=[];
    for await(const chunk of req){bytes+=chunk.length;if(bytes>80*1024*1024){const e=new Error('单次导入总大小请小于 80 MB');e.status=413;throw e;}chunks.push(chunk);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch(_){const e=new Error('提交的数据无法读取');e.status=400;throw e;}
    const action={'/api/import':()=>store.importFiles(body),'/api/lines':()=>store.updateLine(body),'/api/characters':()=>store.addCharacter(body),'/api/sync':()=>store.sync()}[pathname];
    if(!action){json(res,404,{error:'找不到此功能'});return;}
    const result=pending.then(action);pending=result.catch(()=>{});json(res,200,await result);
   }catch(e){json(res,e.status||500,{error:e.status?e.message:'保存失败，原文件已保留；请检查目录是否可写。'});}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){json(res,405,{error:'请求方式无效'});return;}
  const relative=pathname==='/'?'asset-manager.html':pathname.slice(1);
  if(!/^(?:asset-manager\.html|traditional\.html|index\.html|(?:assets|css|js)\/[^\\]+)$/.test(relative)||relative.split('/').some(part=>part==='..'||part.startsWith('.'))){json(res,404,{error:'找不到此文件'});return;}
  try{
   const root=relative.startsWith('assets/')?store.gameRoot:store.sourceRoot,file=inside(root,relative);
   if(!fs.existsSync(file)||!fs.statSync(file).isFile()){json(res,404,{error:'素材尚未提供'});return;}
   const extension=path.extname(file),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.json':'application/json; charset=utf-8'};
   let body=fs.readFileSync(file);if(relative==='asset-manager.html')body=Buffer.from(body.toString('utf8').replace('__QY_LOCAL_TOKEN__',token));
   res.writeHead(200,{'Content-Type':types[extension]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'X-Frame-Options':'DENY'});res.end(req.method==='HEAD'?undefined:body);
  }catch(_){json(res,404,{error:'找不到此文件'});}
 });
 return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve({server,store,token,url:`http://127.0.0.1:${server.address().port}/asset-manager.html`}));});
}
if(require.main===module){
 const ownRoot=path.resolve(__dirname,'..');let options={sourceRoot:ownRoot,gameRoot:ownRoot};
 const config=path.join(ownRoot,'asset-manager.local.json');if(fs.existsSync(config))Object.assign(options,JSON.parse(fs.readFileSync(config,'utf8')));
 const args=process.argv.slice(2);for(let i=0;i<args.length;i++){if(args[i]==='--source-root')options.sourceRoot=path.resolve(args[++i]);else if(args[i]==='--game-root')options.gameRoot=path.resolve(args[++i]);else if(args[i]==='--port')options.port=Number(args[++i]);else if(args[i]!=='--open')throw new Error('Unknown option');}
 startServer(options).then(({url})=>{console.log('雀夜素材管理已启动：'+url);console.log('每次保存都会同步当前游戏与补丁，并备份旧文件。关闭此窗口可停止管理服务。');
  if(args.includes('--open')){const {spawn}=require('node:child_process');const child=process.platform==='win32'?spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{detached:true,stdio:'ignore',windowsHide:true}):spawn('xdg-open',[url],{detached:true,stdio:'ignore'});child.on('error',()=>{});child.unref();}
 }).catch(e=>{console.error('素材管理无法启动：'+e.message);process.exitCode=1;});
}
module.exports={startServer};
