'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Pause=require('../js/traditional/match-pause.js');
const {Room}=require('../server/room.js');
const engine=require('../server/shared-engine.js');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('pause defers bots, rejects human actions and resumes once',async()=>{
 const calls=[];const match={_gen:0,_lastProgressAt:0,tick(){calls.push('tick');},humanDiscard(){calls.push('human');},emit(){this._lastProgressAt=Date.now();},stop(){this._gen++;}};
 const pause=Pause.attach(match);pause.holdUntil(Date.now()+1000);match.tick();match.tick();match.humanDiscard();match.emit();
 assert.deepEqual(calls,[]);assert.equal(match._lastProgressAt,Number.MAX_SAFE_INTEGER);pause.release();await wait(20);assert.deepEqual(calls,['tick']);
 match.humanDiscard();assert.deepEqual(calls,['tick','human']);match.stop();
});
test('stopping a paused match discards deferred work',async()=>{
 let count=0;const match={_gen:0,tick(){count++;},stop(){this._gen++;}};const pause=Pause.attach(match);pause.holdUntil(Date.now()+1000);match.tick();match.stop();pause.release();await wait(20);assert.equal(count,0);
});
test('server computes one shared intermission from authoritative cumulative losses',()=>{
 const room=new Room('SHOW',engine);for(let i=0;i<4;i++)room.addPlayer({readyState:1,send(){}},`p${i}`,`P${i}`,`character-0${i+1}`);
 try{
  room.start();room.match.engine.seats[0].points-=3000;room.match.engine.seats[1].points+=3000;room.trackCumulativeLosses();
  const a=room.buildStateFor(0),b=room.buildStateFor(1);
  assert.deepEqual(a.stagePresentation.changes,[{seat:0,previousStage:0,stage:1}]);assert.equal(a.stagePresentation.revision,b.stagePresentation.revision);assert.ok(a.stagePresentation.remainingMs>Pause.DURATION_MS-1000);assert.ok(a.stagePresentation.remainingMs<=Pause.DURATION_MS);
  assert.equal(a.seats[1].hand,undefined);assert.equal(b.seats[0].hand,undefined);
  const count=room.match.engine.seats[0].hand.length;room.handleMessage(room.seats[0].ws,{type:'discard',tile:room.match.engine.seats[0].hand[0]});assert.equal(room.match.engine.seats[0].hand.length,count);
  const revision=a.stagePresentation.revision;room.trackCumulativeLosses();assert.equal(room.buildStateFor(0).stagePresentation.revision,revision);
  room._presentationPause.release();room.match.engine.seats[0].points+=3000;room.match.engine.seats[1].points-=3000;room.trackCumulativeLosses();assert.equal(room.cumulativeLosses[0],3000);assert.equal(room.buildStateFor(0).stagePresentation.changes.some(c=>c.seat===0),false);
 }finally{room.destroy();}
});
test('real LocalMatch timer is deferred through the adapter without changing engine files',async()=>{
 const match=new engine.LocalMatch({isHuman:[false,false,false,false],onChange(){}});const pause=Pause.attach(match);
 try{
  match.startHand();const before=JSON.stringify(match.engine.seats.map(s=>({hand:s.hand,discards:s.discards,points:s.points})));
  pause.holdUntil(Date.now()+2000);await wait(650);assert.equal(JSON.stringify(match.engine.seats.map(s=>({hand:s.hand,discards:s.discards,points:s.points}))),before);
  pause.release();await wait(30);assert.notEqual(JSON.stringify(match.engine.seats.map(s=>({hand:s.hand,discards:s.discards,points:s.points}))),before);
 }finally{match.stop();}
});
test('hand-end publishes existing final payments before loss tracking and delays stage show for count-up',()=>{
 const room=new Room('PAY',engine);for(let i=0;i<4;i++)room.addPlayer({readyState:1,send(){}},`p${i}`,'P',`character-0${i+1}`);
 try{
  room.start();const g=room.match.engine;g.phase='ended';g.result={type:'ron',discarder:0,winners:[{seat:1,total:8000}]};room.match.finishHand();
  const state=room.buildStateFor(0);assert.deepEqual(Array.from(state.points),[17000,33000,25000,25000]);assert.deepEqual(Array.from(state.seats,s=>s.points),[17000,33000,25000,25000]);
  assert.deepEqual(state.cumulativeLosses,[8000,0,0,0]);assert.equal(state.stagePresentation.changes[0].stage,2);assert.ok(state.stagePresentation.delayMs>1000);assert.equal(state.settlement.before[0],25000);assert.equal(state.settlement.after[0],17000);
  room.handleMessage(room.seats[0].ws,{type:'nextHand'});assert.equal(room.match.handNumber,1);
  room.match.finishHand();assert.deepEqual(Array.from(room.match.points),[17000,33000,25000,25000]);assert.equal(room.match._queYeSettlement.id,1);
 }finally{room.destroy();}
});
