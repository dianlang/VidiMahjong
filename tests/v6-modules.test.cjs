'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const registry=require('../js/traditional/characters.js');
const roster=require('../assets/characters/roster.js');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
test('one registry supports an additional character on browser and room server',()=>{
  const entries=[...roster,{id:'character-07',name:'新角色'}];
  const context={QueYeCharacterRoster:entries};vm.runInNewContext(read('js/traditional/characters.js'),context);
  const r=context.QueYeCharacters;assert.equal(r.ids.length,7);assert.equal(r.get('character-07').name,'新角色');assert.equal(r.stagePath('character-07',3),'assets/characters/character-07/stage-3.png');
  const roomContext={module:{exports:{}},require:id=>{if(id==='./stage-presentation.js')return require('../server/stage-presentation.js');if(id==='./voice-events.js')return require('../server/voice-events.js');if(id==='./riichi-actions.js')return require('../server/riichi-actions.js');assert.equal(id,'../js/traditional/characters.js');return r;}};
  vm.runInNewContext(read('server/room.js'),roomContext);const room=new roomContext.module.exports.Room('TEST',{});
  room.addPlayer({},'p1','First','character-07');assert.equal(room.seats[0].characterId,'character-07');
  room.addPlayer({},'p2','Second','character-999');assert.equal(room.seats[1].characterId,null);
  room.addPlayer({},'p1','First','../../bad');assert.equal(room.seats[0].characterId,'character-07');
});
test('registry rejects duplicate IDs, traversal and invalid names, and provides missing lines',()=>{
  assert.throws(()=>registry.create([...roster,roster[0]]),/duplicate/);
  assert.throws(()=>registry.create([{id:'../bad',name:'坏路径'}]),/Invalid/);
  assert.throws(()=>registry.create([{id:'character-07',name:''}]),/Invalid/);
  const r=registry.create([{id:'character-07',name:'七 & 八'}]);assert.equal(r.get().stageLines[4],'这局还没结束，继续吧。');assert.equal(r.normalize('unknown'),'character-07');assert.equal(r.stagePath('unknown',999),'assets/characters/character-07/stage-4.png');assert.equal(r.escapeHTML('<img>'),'&lt;img&gt;');
});
test('catalog includes exactly the yaku names emitted by the fixed engine',()=>{
  const context={};vm.runInNewContext(read('js/traditional/yaku-catalog.js')+'\nthis.catalog=QUEYE_YAKU_CATALOG;',context);
  const yaku=read('js/traditional/yaku.js');
  const names=[...new Set([...yaku.matchAll(/name:\s*'([^']+)'/g)].map(m=>m[1]))];
  assert.match(yaku,/Yakuhai/);names.push('Yakuhai');names.sort();
  assert.deepEqual(Array.from(context.catalog,y=>y.key).sort(),names);assert.equal(names.length,30);
});
function musicFixture(){
  const events={},audioEvents={};let audio,button;
  class Audio{constructor(src){audio=this;this.src=src;this.paused=true;this.currentTime=0;this.plays=0;this.loads=0;}addEventListener(n,f){audioEvents[n]=f;}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}load(){this.loads++;}}
  const stored={};const context={Audio,localStorage:{getItem:k=>stored[k],setItem:(k,v)=>stored[k]=v},document:{hidden:false,addEventListener:(n,f)=>events[n]=f,createElement:()=>button={setAttribute(){},addEventListener(n,f){this[n]=f;}},querySelector:()=>({prepend(){}})}};
  vm.runInNewContext(read('js/traditional/bgm.js'),context);events.DOMContentLoaded();
  return {audio,button,state:riichi=>events['queye:table-state']({detail:{riichi}}),fail:()=>audioEvents.error(),pointer:()=>events.pointerdown(),stored};
}
test('riichi changes BGM once, next hand restores it, missing track falls back',()=>{
  const f=musicFixture();f.pointer();f.audio.currentTime=12;f.state(true);assert.match(f.audio.src,/riichi.mp3$/);assert.equal(f.audio.loads,1);
  f.state(true);assert.equal(f.audio.loads,1);f.fail();assert.match(f.audio.src,/table.mp3$/);f.state(true);assert.equal(f.audio.loads,2);
  f.state(false);assert.equal(f.audio.loads,2);
  const g=musicFixture();g.state(true);g.state(false);assert.match(g.audio.src,/table.mp3$/);assert.equal(g.audio.loads,2);
});
test('muting remains effective through riichi and re-enabling retries music',()=>{
  const f=musicFixture();f.pointer();f.button.click();const count=f.audio.plays;f.state(true);assert.equal(f.audio.plays,count);assert.equal(f.audio.paused,true);assert.equal(f.stored['queye-bgm'],'off');f.button.click();assert.equal(f.audio.paused,false);assert.match(f.audio.src,/riichi.mp3$/);
});
test('all runtime module files and assets match canonical patch sources',()=>{
 for(const dir of ['js/traditional','css'])for(const name of fs.readdirSync('patch/'+dir))assert.equal(read(dir+'/'+name),read('patch/'+dir+'/'+name));
 for(const name of fs.readdirSync('patch/server'))assert.equal(read('server/'+name),read('patch/server/'+name));
 const tiles=fs.readdirSync('assets/tiles/Regular').filter(p=>p.endsWith('.svg'));assert.equal(tiles.length,34);
 assert.match(read('assets/tiles/LICENSE.md'),/public domain/);
 for(const tile of tiles){const text=read('assets/tiles/Regular/'+tile);assert.match(text,/<svg/);assert.doesNotMatch(text,/<script|(?:href|src)=["'](?:https?:|data:)/i);}
 const scripts=[...read('traditional.html').matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);assert.ok(scripts.indexOf('assets/characters/roster.js')<scripts.indexOf('js/traditional/zh-custom.js'));for(const p of scripts)assert.ok(fs.existsSync(p),p);
});
