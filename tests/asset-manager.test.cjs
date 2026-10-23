'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createStore}=require('../tools/asset-store.cjs'),{startServer}=require('../tools/asset-manager-server.cjs');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1cAAAAASUVORK5CYII=','base64');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'queye-assets-')),sourceRoot=path.join(root,'source'),gameRoot=path.join(root,'game');
 t.after(()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(root,{recursive:true,force:true});});
 for(const base of [sourceRoot,gameRoot])for(const prefix of ['','patch/']){const dir=path.join(base,prefix,'assets/characters');fs.mkdirSync(dir,{recursive:true});for(const f of ['roster.js','voice-catalog.json','voice-catalog.js'])fs.copyFileSync(path.join(__dirname,'../assets/characters',f),path.join(dir,f));}
 return{sourceRoot,gameRoot,store:createStore({sourceRoot,gameRoot})};
}
const image=(slot,expectedHash=null)=>({characterId:'character-01',kind:'image',slot,expectedHash,data:png.toString('base64')});
function wav(){const b=Buffer.alloc(44+16000);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(16000,40);return b;}
test('image import synchronizes four copies and backs up original bytes before overwrite',t=>{
 const f=fixture(t);f.store.importFiles({files:[image('stage-0')]});const original=png,changed=Buffer.concat([png,Buffer.from('new')]);
 const before=f.store.snapshot().characters[0].images[0];const result=f.store.importFiles({files:[{...image('stage-0',before.sha256),data:changed.toString('base64')}]});assert.equal(result.saved,4);
 for(const root of [f.sourceRoot,f.gameRoot])for(const prefix of ['','patch/'])assert.deepEqual(fs.readFileSync(path.join(root,prefix,'assets/characters/character-01/stage-0.png')),changed);
 const backup=path.join(f.sourceRoot,'release/asset-manager',result.backup);const manifest=JSON.parse(fs.readFileSync(path.join(backup,'manifest.json')));assert.equal(manifest.files.length,4);for(const item of manifest.files)assert.deepEqual(fs.readFileSync(path.join(backup,item.snapshot)),original);
});
test('invalid batch, traversal, duplicate slot and stale file are rejected without partial writes',t=>{
 const f=fixture(t);assert.throws(()=>f.store.importFiles({files:[image('stage-0'),{...image('stage-1'),data:Buffer.from('bad').toString('base64')}]}),/PNG/);assert.equal(f.store.snapshot().characters[0].images[0].exists,false);
 assert.throws(()=>f.store.importFiles({files:[image('stage-0'),image('stage-0')]}),/重复/);assert.throws(()=>f.store.importFiles({files:[{...image('stage-0'),characterId:'../escape'}]}),/角色/);
 f.store.importFiles({files:[image('stage-0')]});assert.throws(()=>f.store.importFiles({files:[image('stage-0')]}),e=>e.status===409);assert.equal(f.store.snapshot().characters[0].images[0].sha256.length,64);
});
test('a write failure rolls back earlier copies and leaves the original in the backup',t=>{
 const f=fixture(t);f.store.importFiles({files:[image('stage-0')]});const hash=f.store.snapshot().characters[0].images[0].sha256,rename=fs.renameSync;let calls=0;
 try{fs.renameSync=(...args)=>{if(++calls===2)throw Error('simulated disk failure');return rename(...args);};assert.throws(()=>f.store.importFiles({files:[{...image('stage-0',hash),data:Buffer.concat([png,Buffer.from('updated')]).toString('base64')}]}),/disk failure/);}finally{fs.renameSync=rename;}
 for(const root of [f.sourceRoot,f.gameRoot])for(const prefix of ['','patch/']){const file=path.join(root,prefix,'assets/characters/character-01/stage-0.png');assert.deepEqual(fs.readFileSync(file),png);assert.ok(fs.readdirSync(path.dirname(file)).every(name=>!name.includes('.qy-')));}
 assert.ok(f.store.history().length>=2);
});
test('voice aliases, duration, preferred format and captions stay synchronized; new character needs no assets',t=>{
 const f=fixture(t);const row=f.store.snapshot().characters[0].voices.find(v=>v.event==='stage_1');assert.equal(row.exists,false);
 f.store.importFiles({files:[{characterId:'character-01',kind:'voice',slot:'stage_1',extension:'wav',expectedHash:null,data:wav().toString('base64')}]});
 let current=f.store.snapshot();assert.equal(current.characters[0].voices.find(v=>v.event==='stage_1').durationSeconds,1);
 for(const root of [f.sourceRoot,f.gameRoot])for(const prefix of ['','patch/'])assert.deepEqual(fs.readFileSync(path.join(root,prefix,'assets/characters/character-01/voice/stage-1.wav')),wav());
 const hash=current.characters[0].voices.find(v=>v.event==='stage_1').sha256;
 f.store.importFiles({files:[{characterId:'character-01',kind:'voice',slot:'stage_1',extension:'mp3',expectedHash:hash,data:Buffer.from('ID3new-recording').toString('base64'),durationSeconds:2}]});assert.match(f.store.snapshot().characters[0].voices.find(v=>v.event==='stage_1').url,/stage_1.mp3/);
 current=f.store.snapshot();f.store.updateLine({characterId:'character-01',event:'stage_1',textZh:'新台词 <安全>',textJa:'新しい台詞',catalogHash:current.catalogHash});assert.equal(require(path.join(f.gameRoot,'assets/characters/roster.js'))[0].stageLines[1],'新台词 <安全>');assert.throws(()=>f.store.updateLine({characterId:'character-01',event:'stage_1',catalogHash:current.catalogHash}),e=>e.status===409);
 const added=f.store.addCharacter({name:'新人',tagline:'今晚同席'});assert.equal(added.characterId,'character-07');const newcomer=f.store.snapshot().characters.find(c=>c.id==='character-07');assert.equal(newcomer.voices.length,35);assert.ok(newcomer.images.every(i=>!i.exists));
});
test('local manager requires token and same origin, hides filesystem and serves current game assets',async t=>{
 const f=fixture(t);for(const name of ['asset-manager.html'])fs.copyFileSync(path.join(__dirname,'..',name),path.join(f.sourceRoot,name));
 const running=await startServer({...f,port:0});t.after(()=>new Promise(resolve=>running.server.close(resolve)));const base=new URL(running.url).origin;
 assert.equal((await fetch(base+'/api/catalog')).status,403);assert.equal((await fetch(base+'/api/catalog',{headers:{'X-QueYe-Token':running.token,Origin:'https://foreign.invalid'}})).status,403);
 const foreignHostStatus=await new Promise((resolve,reject)=>{const req=require('node:http').get(base+'/api/catalog',{headers:{'X-QueYe-Token':running.token,Host:'foreign.invalid'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(foreignHostStatus,403);
 const html=await(await fetch(running.url)).text();assert.ok(html.includes(running.token));assert.ok(!html.includes('__QY_LOCAL_TOKEN__'));
 assert.equal((await fetch(base+'/api/catalog',{headers:{'X-QueYe-Token':running.token}})).status,200);assert.equal((await fetch(base+'/.git/config')).status,404);assert.equal((await fetch(base+'/server/room.js')).status,404);
 const post=await fetch(base+'/api/import',{method:'POST',headers:{'X-QueYe-Token':running.token,'Content-Type':'application/json'},body:JSON.stringify({files:[image('stage-0')]})});assert.equal(post.status,200);assert.deepEqual(Buffer.from(await(await fetch(base+'/assets/characters/character-01/stage-0.png')).arrayBuffer()),png);
});
