'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Voices=require('../js/traditional/voice-events.js'),engine=require('../server/shared-engine.js');
const {Room}=require('../server/room.js'),Hands=require('../js/traditional/dev-hand-fixtures.js');
function room(){
 const r=new Room('VOICE',engine);for(let i=0;i<4;i++)r.addPlayer({readyState:1,send(){}},`p${i}`,'Player',`character-0${i+1}`);
 r.start();r.match.scheduleAfter=()=>{};return r;
}
test('accepted chi, pon, open kan and closed kan produce public actor cues; invalid calls do not',()=>{
 for(const [action,tiles,wanted]of [[{chi:['m1','m2']},['m1','m2'],'chi'],['pon',['m3','m3'],'pon'],['kan',['m3','m3','m3'],'kan']]){
  const r=room();try{
   const m=r.match,g=m.engine;g.phase='reaction';g.lastDiscard={seat:0,tile:'m3'};g.seats[0].discards.push({tile:'m3'});
   g.seats[1].hand=[...tiles,'p1','p2','p5','p8','p9','s1','s4','s7','wE','dR','dW'].slice(0,13);
   m._pendingHumanSeats=[1];m._pendingReactionResponses={};m._awaitingHumanReaction=true;
   r.handleMessage(r.seats[1].ws,{type:'react',action});
   assert.ok(r.buildStateFor(2).voiceEvents.events.some(e=>e.event===wanted&&e.seat===1));
   assert.equal(g.seats[1].melds.length,1);
  }finally{r.destroy();}
 }
 const r=room();try{
  const g=r.match.engine;g.seats[0].hand=['m1','m1','m1','m1','p1','p2','p4','p5','s1','s2','s4','s5','wE','dR'];g.turnDrawnTile='dR';
  r.handleMessage(r.seats[1].ws,{type:'ankan',tileType:'m1'});assert.equal(r.buildStateFor(0).voiceEvents.events.some(e=>e.event==='kan'),false);
  r.handleMessage(r.seats[0].ws,{type:'ankan',tileType:'m1'});assert.equal(r.buildStateFor(0).voiceEvents.events.filter(e=>e.event==='kan').length,1);
 }finally{r.destroy();}
});
test('riichi is voiced once after server acceptance, with an opponent response and no private hand data',()=>{
 const r=room();try{
  const g=r.match.engine;g.seats[0].hand=['m1','m2','m3','m4','m5','m6','p1','p2','p3','s1','s2','s3','wE','dR'];g.turnDrawnTile='dR';
  r.handleMessage(r.seats[0].ws,{type:'riichi',tile:'m1'});assert.equal(r.buildStateFor(1).voiceEvents.events.some(e=>e.event==='riichi'),false);
  r.handleMessage(r.seats[0].ws,{type:'riichi',tile:'dR'});r.handleMessage(r.seats[0].ws,{type:'riichi',tile:'dR'});
  const state=r.buildStateFor(1),events=state.voiceEvents.events;
  assert.equal(events.filter(e=>e.event==='riichi').length,1);assert.equal(events.filter(e=>e.event==='opponent_riichi').length,1);
  assert.equal(state.seats[0].hand,undefined);
  for(const event of events)assert.deepEqual(Object.keys(event).sort().filter(k=>!['event','seat','hand','audience','sequence','ageMs','afterStage'].includes(k)),[]);
 }finally{r.destroy();}
});
test('pass feedback is private, cannot be forged by another seat and is not replayed after acceptance',()=>{
 const r=room();try{
  const m=r.match,g=m.engine;g.phase='reaction';g.lastDiscard={seat:0,tile:'m3'};g.seats[0].discards.push({tile:'m3'});
  m._pendingHumanSeats=[1,2];m._pendingReactionResponses={};m._awaitingHumanReaction=true;
  r.handleMessage(r.seats[3].ws,{type:'react',action:'pass'});assert.equal(r.buildStateFor(1).voiceEvents.events.some(e=>e.event==='pass'),false);
  r.handleMessage(r.seats[1].ws,{type:'react',action:'pass'});r.handleMessage(r.seats[1].ws,{type:'react',action:'pass'});
  assert.equal(r.buildStateFor(1).voiceEvents.events.filter(e=>e.event==='pass').length,1);
  assert.equal(r.buildStateFor(2).voiceEvents.events.some(e=>e.event==='pass'),false);
 }finally{r.destroy();}
});
test('real ron and tsumo results select the right actor, limit tier and one settlement announcement',()=>{
 for(const winType of ['ron','tsumo'])for(const preset of ['chinitsu','chiitoitsu','kokushi']){
  const r=room();try{
   Hands.win(r.match,{winner:1,from:0,winType,preset});const result=r.match.engine.result;
   const winner=winType==='ron'?result.winners[0]:result;
   const stream=r.buildStateFor(0).voiceEvents;
   assert.ok(stream.events.some(e=>e.event===winType&&e.seat===1));
   assert.equal(stream.events.filter(e=>e.event===Voices.tier(winner)&&e.seat===1).length,1);
   const before=stream.sequence;r.match.finishHand();assert.equal(r.buildStateFor(0).voiceEvents.sequence,before);
   if(winType==='ron')assert.ok(stream.events.some(e=>e.event==='deal_in'&&e.seat===0));
  }finally{r.destroy();}
 }
});
test('result-only special yaku, exhaustive tenpai/noten, stable ranks and high-loss final line',()=>{
 const t=Voices.createTracker(),g={seats:[{},{},{},{}],phase:'draw'},m={engine:g,points:[25000,25000,25000,25000]};
 assert.equal(t.observe({type:'hand-start'},m)[0].event,'match_start');
 g.phase='ended';g.result={type:'tsumo',seat:0,han:6,base:3000,yakuList:[{name:'Ippatsu'},{name:'Rinshan Kaihou'}]};
 assert.deepEqual(t.observe({type:'hand-end'},m).map(e=>e.event),['tsumo','haneman','ippatsu','rinshan']);
 const other={seats:g.seats,phase:'ended',result:{type:'exhaustive',tenpaiSeats:[0,2]}};m.engine=other;
 assert.equal(t.observe({type:'hand-start'},m)[0].event,'hand_start');
 assert.deepEqual(t.observe({type:'hand-end'},m).map(e=>e.event),['ryuukyoku','tenpai','noten','tenpai','noten']);
 m.matchOver=true;const ranked=t.observe({type:'match-end'},m,[0,0,0,25000]);
 assert.deepEqual(ranked.filter(e=>e.event.startsWith('rank_')).map(e=>[e.seat,e.event]),[[0,'rank_1'],[1,'rank_2'],[2,'rank_3'],[3,'rank_4']]);
 assert.equal(ranked.find(e=>e.event==='stage_5').seat,3);assert.equal(t.observe({type:'match-end'},m).length,0);
 for(const [data,wanted]of [[{han:4,base:1920},'win_small'],[{han:4,base:2000},'mangan'],[{han:6},'haneman'],[{han:8},'baiman'],[{han:11},'sanbaiman'],[{han:13},'yakuman']])assert.equal(Voices.tier(data),wanted);
});
test('multi-threshold server intermissions include every intermediate stage and remain paused past one minute',()=>{
 const r=room();try{
  r.match.engine.seats.forEach(s=>s.points-=25000);r.trackCumulativeLosses();const st=r.buildStateFor(0);
  assert.equal(st.stagePresentation.changes.length,16);
  for(let seat=0;seat<4;seat++)assert.deepEqual(st.stagePresentation.changes.filter(c=>c.seat===seat).map(c=>[c.previousStage,c.stage]),[[0,1],[1,2],[2,3],[3,4]]);
  assert.ok(r._presentationPause.until-Date.now()>95000);assert.ok(st.stagePresentation.remainingMs>95000);
 }finally{r.destroy();}
});
