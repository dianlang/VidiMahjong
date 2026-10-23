'use strict';
// Fetch only the official release and require its published SHA-256 digest.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const root=path.resolve(__dirname,'..'),directory=path.join(root,'.local-tools');fs.mkdirSync(directory,{recursive:true});
 const target=path.join(directory,'cloudflared-windows-amd64.exe'),manifest=path.join(directory,'cloudflared-release.json');
 if(fs.existsSync(target)&&fs.existsSync(manifest)){try{const saved=JSON.parse(fs.readFileSync(manifest,'utf8'));if(/^https:\/\/github\.com\/cloudflare\/cloudflared\/releases\/download\//.test(saved.url)&&crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')===saved.sha256){console.log('已校验本机官方连接工具 '+saved.version+'。');return;}}catch(_){} }
 const response=await fetch('https://api.github.com/repos/cloudflare/cloudflared/releases/latest',{headers:{'User-Agent':'QueYe-friend-test'}});if(!response.ok)throw Error('无法查询官方下载：'+response.status);const release=await response.json();
 const asset=release.assets.find(a=>a.name==='cloudflared-windows-amd64.exe');if(!asset||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))throw Error('官方文件缺少可验证哈希，已停止下载');
 console.log('正在下载 Cloudflare 官方临时连接工具 '+release.tag_name+'……');let bytes;
 try{const binary=await fetch(asset.url,{headers:{'User-Agent':'QueYe-friend-test',Accept:'application/octet-stream'},signal:AbortSignal.timeout(180000)});if(!binary.ok||!binary.headers.get('content-type')?.includes('octet-stream'))throw Error('官方接口未返回安装文件');bytes=Buffer.from(await binary.arrayBuffer());}catch(_){const binary=await fetch(asset.browser_download_url,{signal:AbortSignal.timeout(180000)});if(!binary.ok)throw Error('下载失败：'+binary.status);bytes=Buffer.from(await binary.arrayBuffer());}
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==asset.digest.slice(7))throw Error('下载校验失败，原文件未替换');fs.writeFileSync(target+'.download',bytes);fs.renameSync(target+'.download',target);fs.writeFileSync(manifest,JSON.stringify({version:release.tag_name,sha256:asset.digest.slice(7),url:asset.browser_download_url},null,2));console.log('下载及 SHA-256 校验完成。');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
