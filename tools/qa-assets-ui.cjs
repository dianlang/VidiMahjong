'use strict';
// Real local API plus DOM fixture. No real browser, file picker or audio decoding claim.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('../.qa-deps/node_modules/jsdom'),{startServer}=require('./asset-manager-server.cjs');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'queye-asset-ui-'));let running,dom;
 try{
  for(const prefix of ['','patch/']){const dir=path.join(temp,prefix,'assets/characters');fs.mkdirSync(dir,{recursive:true});for(const name of ['roster.js','voice-catalog.json','voice-catalog.js'])fs.copyFileSync(path.join('assets/characters',name),path.join(dir,name));}
  fs.copyFileSync('asset-manager.html',path.join(temp,'asset-manager.html'));running=await startServer({sourceRoot:temp,gameRoot:temp,port:0});const base=new URL(running.url).origin;
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));dom=new JSDOM(await(await fetch(running.url)).text(),{url:running.url,runScripts:'outside-only',virtualConsole:vc});const w=dom.window,d=w.document;
  w.fetch=(url,opts)=>fetch(base+url,opts);w.HTMLMediaElement.prototype.pause=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.eval(fs.readFileSync('js/asset-manager.js','utf8'));const until=async f=>{for(let i=0;i<100;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('DOM update timeout');};
  await until(()=>d.querySelectorAll('#characters button').length===7);assert.equal(d.querySelectorAll('#images .missing').length,6);assert.equal(d.querySelectorAll('.voice-card').length,35);
  const text=d.querySelector('.voice-card textarea');text.value='待保存 <img src=x onerror=alert(1)>';text.dispatchEvent(new w.Event('input'));d.getElementById('search').value='开局';d.getElementById('search').dispatchEvent(new w.Event('input'));assert.equal(d.querySelector('.voice-card textarea').value,text.value);assert.equal(d.querySelectorAll('.voice-card img').length,0);
  [...d.querySelectorAll('.voice-card button')].find(b=>b.textContent==='保存台词').click();await until(()=>d.getElementById('message').textContent.includes('台词已保存'));assert.ok(running.store.snapshot().characters[0].voices.find(v=>v.event==='match_start').textZh.includes('<img'));
  d.getElementById('add').click();assert.equal(d.getElementById('add-dialog').open,true);d.getElementById('new-name').value='新角色';d.getElementById('new-tagline').value='今夜同席';d.getElementById('add-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await until(()=>d.getElementById('name').textContent==='新角色');assert.equal(d.querySelectorAll('#characters button').length,8);assert.equal(d.querySelectorAll('#images .missing').length,6);assert.ok(d.querySelectorAll('#backups li').length>0);
  assert.deepEqual(errors,[]);console.log('Asset manager DOM/API PASS: character list, 35 voice events, missing slots, safe draft preservation, subtitle save/backup and seventh character creation.');
 }finally{dom?.window.close();if(running)await new Promise(resolve=>running.server.close(resolve));assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
