'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const library=require('../server/shared-engine.js'),Rules=require('../js/traditional/riichi-rules.js');
function game(hand=['m1','m2','m3','m4','m5','m6','p1','p2','p3','s1','s2','s3','wE','dR'],drawn='dR'){
 const g=new library.RiichiEngine({dealerSeat:0,roundWind:'wE',isBot:[false,true,true,true]});g.currentSeat=0;g.phase='discard';g.turnDrawnTile=drawn;g.seats[0].hand=hand.slice();return g;
}
test('riichi offers only discards that leave a genuine wait and pays once on confirmation',()=>{
 const g=game(),events=[];assert.equal(g.canDeclareRiichi(0),true);assert.ok(g.riichiDiscardOptions(0).includes('dR'));assert.equal(g.riichiDiscardOptions(0).includes('m1'),false);
 const match={engine:g,emit:e=>events.push(e.type),scheduleAfter(){}};
 assert.equal(Rules.declareAndDiscard(match,0,'m1'),false);assert.equal(g.seats[0].points,25000);
 assert.equal(Rules.declareAndDiscard(match,0,'dR'),true);assert.equal(g.seats[0].points,24000);assert.equal(g.seats[0].discards[0].riichiDeclaration,true);assert.deepEqual(events,['riichi','discarded']);
 assert.equal(Rules.declareAndDiscard(match,0,'wE'),false);assert.equal(g.seats[0].points,24000);
});
test('locked riichi hand rejects an old tile without any mutation, and accepts only the draw',()=>{
 const g=game();Rules.declareAndDiscard({engine:g,emit(){},scheduleAfter(){}},0,'dR');g.phase='discard';g.turnDrawnTile='m9';g.seats[0].hand.push('m9');
 const before=JSON.stringify(g.seats[0]);assert.equal(g.canDiscard('m1'),false);assert.throws(()=>g.discard('m1'),/Illegal discard/);assert.equal(JSON.stringify(g.seats[0]),before);
 g.discard('m9');assert.equal(g.lastDiscard.tile,'m9');assert.equal(g.seats[0].hand.includes('m1'),true);
});
test('duplicate drawn tiles are removed one at a time when finding declaration options',()=>{
 const g=game(['m1','m2','m3','m4','m5','m6','p1','p2','p3','s1','s2','wE','wE','wE'],'wE');assert.ok(g.riichiDiscardOptions(0).includes('wE'));assert.equal(g.riichiWaitsForDiscard(0,'wE').includes('s3'),true);
});
test('bot does not declare riichi when its forced discard would not leave tenpai',()=>{
 const g=game(['m1','m2','m4','m5','m6','p1','p2','p3','s1','s2','s3','wE','m9','m3'],'m3');
 assert.ok(g.riichiDiscardOptions(0).includes('m9'));assert.equal(g.riichiDiscardOptions(0).includes('m3'),false);assert.equal(library.chooseBotRiichi(g,0),false);
});
test('online server validates the seat, selected declaration discard and later hand lock',()=>{
 const {Room}=require('../server/room.js'),room=new Room('LOCK',library);
 for(let i=0;i<4;i++)room.addPlayer({readyState:1,send(){}},`p${i}`,'P',`character-0${i+1}`);
 try{
  room.start();const g=room.match.engine,fixture=game();g.seats[0].hand=fixture.seats[0].hand;g.phase='discard';g.currentSeat=0;g.turnDrawnTile='dR';
  room.handleMessage(room.seats[1].ws,{type:'riichi',tile:'dR'});assert.equal(g.seats[0].riichi,false);
  room.handleMessage(room.seats[0].ws,{type:'riichi',tile:'m1'});assert.equal(g.seats[0].points,25000);
  room.handleMessage(room.seats[0].ws,{type:'riichi',tile:'dR'});assert.equal(g.seats[0].points,24000);assert.equal(g.seats[0].riichi,true);assert.equal(g.lastDiscard.tile,'dR');
  g.phase='discard';g.currentSeat=0;g.turnDrawnTile='m9';g.seats[0].hand.push('m9');const before=JSON.stringify(g.seats[0]);room.handleMessage(room.seats[0].ws,{type:'discard',tile:'m1'});assert.equal(JSON.stringify(g.seats[0]),before);
  assert.equal(room.buildStateFor(1).you.seat,1);assert.equal(room.buildStateFor(1).riichiDiscardOptions.length,0);
 }finally{room.destroy();}
});
