'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Room}=require('../server/room.js'),engine=require('../server/shared-engine.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function room(){const r=new Room('READY',engine);for(let i=0;i<2;i++)r.addPlayer({readyState:1,send(){}},'p'+i,'P'+i,'character-0'+(i+1));r.start();r.match.scheduleAfter=()=>{};const g=r.match.engine;g.phase='ended';g.result={type:'ron',discarder:1,winners:[{seat:0,total:1000,yakuList:[],fu:30,han:1}]};r.match.finishHand();return r;}
test('every human confirms their own authoritative settlement; bots need no confirmation',async()=>{
 const r=room();try{const g=r.match.engine,st=r.buildStateFor(0),id=st.settlementReady.id;assert.deepEqual(st.settlementReady.required,[true,true,false,false]);
  r.handleMessage({}, {type:'confirmSettlement',settlementId:id,seat:1});r.handleMessage(r.seats[1].ws,{type:'confirmSettlement',settlementId:id+1});assert.deepEqual(r.buildStateFor(0).settlementReady.confirmed,[false,false,false,false]);
  r.handleMessage(r.seats[0].ws,{type:'confirmSettlement',settlementId:id,seat:1});r.handleMessage(r.seats[0].ws,{type:'nextHand'});assert.deepEqual(r.buildStateFor(1).settlementReady.confirmed,[true,false,false,false]);assert.equal(r.match.engine,g);assert.deepEqual(Array.from(r.match.points),[26000,24000,25000,25000]);
  r._presentationPause.release();r._stagePresentation.until=Date.now();r.handleMessage(r.seats[1].ws,{type:'confirmSettlement',settlementId:id});await wait(80);assert.notEqual(r.match.engine,g);assert.equal(r.buildStateFor(0).settlementReady,null);
  const current=r.match.engine;r.handleMessage(r.seats[1].ws,{type:'confirmSettlement',settlementId:id});await wait(40);assert.equal(r.match.engine,current);
  current.phase='ended';current.result={type:'ron',discarder:1,winners:[{seat:0,total:1000,yakuList:[],fu:30,han:1}]};r.buildStateFor(0);r.match.finishHand();assert.equal(r.buildStateFor(0).settlementReady.id,id+1);r.handleMessage(r.seats[0].ws,{type:'confirmSettlement',settlementId:id});assert.equal(r.buildStateFor(0).settlementReady.confirmed[0],false);
 }finally{r.destroy();}
});
test('confirmation survives reconnect, does not bypass presentation pause, and destroy cancels pending advance',async()=>{
 const r=room();try{const id=r.buildStateFor(0).settlementReady.id,g=r.match.engine;r.handleMessage(r.seats[0].ws,{type:'confirmSettlement',settlementId:id});r.removeConnection(r.seats[0].ws);const replacement={readyState:1,send(){}};r.addPlayer(replacement,'p0','P0');assert.equal(r.buildStateFor(0).settlementReady.confirmed[0],true);
  r.handleMessage(r.seats[1].ws,{type:'confirmSettlement',settlementId:id});await wait(80);assert.equal(r.match.engine,g);assert.ok(r._settlementAdvance);r.destroy();await wait(80);assert.equal(r.match.engine,g);
 }finally{r.destroy();}
});
