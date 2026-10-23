'use strict';
const http=require('node:http'),net=require('node:net'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
async function startFriendServer({root=path.resolve(__dirname,'..'),port=8770}={}){
 root=fs.realpathSync(root);const backendScript=path.join(root,'server/index.js');require.resolve('ws',{paths:[path.join(root,'server')]});
 const child=spawn(process.execPath,['-e',`const {wss}=require(${JSON.stringify(backendScript)});wss.on('listening',()=>process.send({port:wss.address().port}));`,'--','queye-friend-backend-'+process.pid],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});
 let stderr='',closed=false;child.stderr.on('data',b=>stderr+=b);
 const backendPort=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('对局服务启动超时'));},10000);child.once('message',msg=>{clearTimeout(timer);resolve(msg.port);});child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',()=>{clearTimeout(timer);reject(Error('对局服务启动失败：'+stderr.slice(0,300)));});});
 const sockets=new Set(),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff':'font/woff','.woff2':'font/woff2'};
 const fail=(res,status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message);};
 const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){fail(res,405,'只提供游戏页面与对局连接');return;}
  let relative;try{relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'traditional.html';}catch(_){fail(res,400,'地址无效');return;}
  if(relative==='healthz'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify({ok:true,service:'queye-friends'}));return;}
  if(relative==='ws'){fail(res,426,'请使用 WebSocket 连接');return;}
  const ext=path.extname(relative);if(!types[ext]||!(/^(?:traditional\.html|index\.html|(?:assets|js|css)\/[^\\]+)$/.test(relative))||relative.split('/').some(x=>x.startsWith('.'))||relative==='js/asset-manager.js'){fail(res,404,'找不到此页面');return;}
  try{
   const file=fs.realpathSync(path.resolve(root,relative));if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile()){fail(res,404,'找不到此文件');return;}
   let data=fs.readFileSync(file);if(relative==='traditional.html')data=Buffer.from(data.toString('utf8').replace('</head>','<meta name="queye-server-path" content="/ws"></head>'));
   const headers={'Content-Type':types[ext],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Length':data.length};
   if(['.wav','.mp3','.ogg'].includes(ext)&&req.headers.range){const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!range){fail(res,416,'范围无效');return;}const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;if(start>end||start>=data.length){fail(res,416,'范围无效');return;}headers['Content-Range']=`bytes ${start}-${end}/${data.length}`;data=data.subarray(start,end+1);headers['Content-Length']=data.length;headers['Accept-Ranges']='bytes';res.writeHead(206,headers);}else res.writeHead(200,headers);
   res.end(req.method==='HEAD'?undefined:data);
  }catch(_){fail(res,404,'素材尚未提供');}
 });
 server.on('upgrade',(req,socket,head)=>{
  let allowed=false;try{allowed=new URL(req.url,'http://localhost').pathname==='/ws'&&(!req.headers.origin||new URL(req.headers.origin).host===req.headers.host);}catch(_){}
  if(!allowed){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  const upstream=net.connect(backendPort,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});
  upstream.once('connect',()=>{upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`+req.rawHeaders.reduce((s,value,i)=>s+(i%2?value+'\r\n':value+': '),'')+'\r\n');if(head.length)upstream.write(head);socket.pipe(upstream).pipe(socket);});
 });
 const stop=()=>{if(closed)return Promise.resolve();closed=true;for(const socket of sockets)socket.destroy();child.kill();return new Promise(resolve=>server.close(resolve));};
 child.on('exit',()=>{if(!closed)void stop();});
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}catch(e){await stop();throw e;}
 return{server,stop,backendPid:child.pid,url:`http://127.0.0.1:${server.address().port}/traditional.html`};
}
module.exports={startFriendServer};
