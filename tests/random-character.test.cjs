'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../js/traditional/characters.js'),Random=require('../js/traditional/random-character.js');
const {Room}=require('../server/room.js'),engine=require('../server/shared-engine.js');
const male=registry.RANDOM_ID;
test('male placeholder is valid but never part of the female roster or random reveal pool',()=>{
 assert.equal(registry.has(male),true);assert.equal(registry.ids.includes(male),false);assert.equal(registry.entries.length,6);
 assert.equal(registry.get(male).name,'神秘男子');assert.equal(registry.stagePath(male,4),`assets/characters/${male}/stage-0.png`);
 const session=Random.create([male,'character-01','character-02','character-03'],()=>0);
 assert.equal(session.reveal(0,2999),null);
 const changed=session.reveal(0,8000);assert.equal(changed.characterId,'character-04');assert.equal(changed.transformationLine,'诶？我怎么变成缇娜了');assert.equal(changed.silent,true);
 assert.equal(session.reveal(0,25000),null);assert.equal(session.characterId(0),'character-04');
});
test('simultaneous hidden players reveal distinct roles that have not appeared; new matches reset',()=>{
 const session=Random.create([male,male,male,male],()=>0),revealed=[];
 for(let seat=0;seat<4;seat++)revealed.push(session.reveal(seat,25000).characterId);
 assert.equal(new Set(revealed).size,4);assert.ok(revealed.every(id=>registry.ids.includes(id)));
 assert.equal(Random.create([male,'character-01','character-02','character-03']).characterId(0),male);
});
test('server reveals at authoritative first loss, includes transformation only on the first segment and persists through reconnect',()=>{
 const r=new Room('RAND',engine);r.addPlayer({readyState:1,send(){}},'p0','Player',male);
 try{
  r.start();const initial=r.buildStateFor(0),other=new Set(initial.seats.slice(1).map(s=>s.characterId));
  assert.equal(initial.seats[0].characterId,male);assert.equal(initial.seats[0].randomPending,true);assert.equal(other.size,3);
  const g=r.match.engine;g.seats[0].points-=8000;g.seats[1].points+=8000;r.trackCumulativeLosses();
  const state=r.buildStateFor(0),chosen=state.seats[0].characterId;
  assert.equal(other.has(chosen),false);assert.equal(state.seats[0].randomPending,false);assert.equal(state.points.reduce((a,b)=>a+b,0),100000);
  assert.deepEqual(state.stagePresentation.changes.map(c=>[c.previousStage,c.stage]),[[0,1],[1,2]]);
  assert.equal(state.stagePresentation.changes[0].fromCharacterId,male);assert.equal(state.stagePresentation.changes[0].characterId,chosen);
  assert.equal(state.stagePresentation.changes[1].fromCharacterId,undefined);
  const revision=state.scoreRevision;r.addPlayer({readyState:1,send(){}},'p0','Player',male);
  assert.equal(r.buildStateFor(0).seats[0].characterId,chosen);assert.equal(r.buildStateFor(0).scoreRevision,revision);
  assert.equal(r.cumulativeLosses[0],8000);assert.equal(r.seats[0].characterId,chosen);
 }finally{r.destroy();}
});
test('two online random players use the same server choices on every client and never duplicate present bot roles',()=>{
 const r=new Room('TWO',engine);for(let i=0;i<2;i++)r.addPlayer({readyState:1,send(){}},'p'+i,'P',male);
 try{
  r.start();const initial=r.buildStateFor(0),bots=new Set(initial.seats.slice(2).map(s=>s.characterId));
  r.match.engine.seats[0].points-=8000;r.match.engine.seats[1].points-=8000;r.match.engine.seats[2].points+=16000;r.trackCumulativeLosses();
  const a=r.buildStateFor(0),b=r.buildStateFor(1);
  assert.deepEqual(a.seats.map(s=>s.characterId),b.seats.map(s=>s.characterId));
  assert.equal(new Set(a.seats.map(s=>s.characterId)).size,4);
  assert.equal(bots.has(a.seats[0].characterId),false);assert.equal(bots.has(a.seats[1].characterId),false);
  assert.equal(a.stagePresentation.changes.filter(c=>c.transformationLine).length,2);
  assert.equal(a.seats[1].hand,undefined);assert.equal(b.seats[0].hand,undefined);
 }finally{r.destroy();}
});
