'use strict';
// Actual ordered script loading, with one deliberately delayed or missing resource.
const {JSDOM,VirtualConsole}=require('../.qa-deps/node_modules/jsdom');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture(missing=false){
 let release;const gate=new Promise(r=>release=r),errors=[];
 const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://localhost').pathname.slice(1);if(missing&&rel==='js/i18n.js'){res.writeHead(404);res.end();return;}try{const data=fs.readFileSync(path.resolve(rel));res.setHeader('Content-Type',rel.endsWith('.css')?'text/css':rel.endsWith('.js')?'application/javascript':'text/html');if(rel==='js/traditional/friend-entry.js')gate.then(()=>res.end(data));else res.end(data);}catch(_){res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fs.readFileSync('traditional.html','utf8'),{url:'http://127.0.0.1:'+server.address().port+'/traditional.html',resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.Audio=class{constructor(src){this.src=src;}play(){return Promise.resolve();}pause(){}load(){}addEventListener(){}removeAttribute(){}};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};}});
 const loaded=new Promise(r=>dom.window.addEventListener('load',r,{once:true})),d=dom.window.document;
 try{
  await wait(60);assert.equal(d.getElementById('btn-mode-local').textContent,'本地对局');assert.equal(d.getElementById('btn-mode-online').textContent,'在线联机');assert.equal(d.getElementById('btn-mode-local').disabled,true);assert.equal(d.getElementById('qy-page-load').hidden,false);
  release();await loaded;
  assert.equal(dom.window.QueYePageReady,!missing);assert.equal(d.getElementById('btn-mode-local').disabled,missing);assert.equal(d.getElementById('qy-page-load').hidden,!missing);
  if(missing){assert.equal(d.querySelector('[data-qy-page-retry]').hidden,false);assert.match(d.getElementById('qy-page-load').textContent,/重新加载/);}else{assert.deepEqual(errors,[]);d.getElementById('btn-mode-local').click();assert.equal(d.getElementById('setup-screen').classList.contains('hidden'),false);}
 }finally{release();dom.window.close();await new Promise(r=>server.close(r));}
}
(async()=>{await fixture();await fixture(true);console.log('Page loading DOM PASS: readable Chinese before delayed scripts, controls wait for readiness, successful initialization and missing-resource retry.');})().catch(e=>{console.error(e);process.exitCode=1;});
