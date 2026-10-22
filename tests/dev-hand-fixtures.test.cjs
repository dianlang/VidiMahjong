'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {LocalMatch}=require('../server/shared-engine.js');
const fixtures=require('../js/traditional/dev-hand-fixtures.js');
test('specified local winners use genuine engine ron/tsumo settlement for all test presets',()=>{
 for(const preset of ['chinitsu','chiitoitsu','kokushi'])for(const winType of ['ron','tsumo'])for(let winner=0;winner<4;winner++){
  const match=new LocalMatch({isHuman:[true,true,true,true],onChange(){}});
  try{
   match.startHand();const result=fixtures.win(match,{winner,from:(winner+1)%4,winType,preset});assert.equal(result.type,winType);assert.equal(match.engine.phase,'ended');
   assert.equal(match.points.reduce((a,b)=>a+b,0)+match.riichiSticksOnTable*1000,100000);
   assert.ok(match.points[winner]>25000);assert.deepEqual(Array.from(match.engine.seats,s=>s.points),Array.from(match.points));
   if(winType==='ron')assert.equal(result.winners[0].seat,winner);else assert.equal(result.seat,winner);
   assert.ok(match._queYeSettlement);
  }finally{match.stop();}
 }
});
test('same-seat ron is rejected before changing a local game',()=>{
 const match=new LocalMatch({isHuman:[true,true,true,true],onChange(){}});try{match.startHand();const before=JSON.stringify(match.engine.seats);assert.throws(()=>fixtures.win(match,{winner:0,from:0}),/不能相同/);assert.equal(JSON.stringify(match.engine.seats),before);}finally{match.stop();}
});
