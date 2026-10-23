'use strict';
const path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process'),{startFriendServer}=require('./friend-server.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..'),directory=path.join(root,'.local-tools'),sessionFile=path.join(directory,'friend-session.json');fs.mkdirSync(directory,{recursive:true});
 if(fs.existsSync(sessionFile)){try{const previous=JSON.parse(fs.readFileSync(sessionFile,'utf8'));if(previous.root===root){process.kill(previous.pid,0);const reply=await fetch('http://127.0.0.1:8770/healthz',{signal:AbortSignal.timeout(2000)});if(reply.ok&&(await reply.json()).service==='queye-friends'){console.log('试玩已经运行：'+(previous.publicUrl||'http://127.0.0.1:8770/traditional.html'));console.log('要结束试玩，请双击 stop-friend-test.bat。');return;}}}catch(_){} }
 const running=await startFriendServer({root});let tunnel=null,stopping=false;
 const session={root,pid:process.pid,backendPid:running.backendPid,tunnelPid:null,startedAt:new Date().toISOString(),publicUrl:null};const save=()=>fs.writeFileSync(sessionFile,JSON.stringify(session,null,2));save();
 async function stop(){if(stopping)return;stopping=true;tunnel?.kill();await running.stop();try{if(JSON.parse(fs.readFileSync(sessionFile,'utf8')).pid===process.pid)fs.rmSync(sessionFile,{force:true});}catch(_){} }
 process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
 console.log('雀夜本机试玩已启动：'+running.url);console.log('关闭此窗口或按 Ctrl+C 会结束临时试玩与房间。');
 if(!process.argv.includes('--tunnel'))return;
 const exe=path.join(root,'.local-tools/cloudflared-windows-amd64.exe');if(!fs.existsSync(exe)){await stop();throw Error('请先运行 tools/download-cloudflared.cjs 下载连接工具。');}
 tunnel=spawn(exe,['--no-autoupdate','tunnel','--url',new URL(running.url).origin,'--protocol','http2'],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});
 session.tunnelPid=tunnel.pid;save();let shown=false,buffer='';const output=chunk=>{const text=chunk.toString();buffer=(buffer+text).slice(-16000);const found=buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);if(found&&!shown){shown=true;session.publicUrl=found[0]+'/traditional.html';save();console.log('\n朋友试玩地址：'+session.publicUrl);console.log('朋友打开后选择好友对局；你创建房间，把房间号或邀请链接发给朋友即可。\n');}if(/Registered tunnel connection/.test(text))console.log('外网连接已建立，可以打开试玩地址。');if(/ERR|error|failed/i.test(text))process.stderr.write(text);};
 tunnel.stdout.on('data',output);tunnel.stderr.on('data',output);tunnel.once('error',e=>{console.error('临时连接启动失败：'+e.message);void stop();});tunnel.once('exit',code=>{if(!stopping){console.error('临时连接已结束（'+code+'）。');void stop();}});
})().catch(e=>{console.error('试玩无法启动：'+e.message);process.exitCode=1;});
