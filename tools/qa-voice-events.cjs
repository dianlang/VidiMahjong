'use strict';
// Real local callbacks and authoritative online states, with mocked audio output.
const fs=require('node:fs'),Module=require('node:module');
const script=fs.readFileSync('tools/qa-dom.cjs','utf8'),prefix=script.slice(0,script.indexOf(" click('#btn-mode-local');"));
const helpers=`window.qyFixture={stop:()=>match.stop(),current:()=>match,
 riichi:()=>{const g=match.engine;g.phase='discard';g.currentSeat=0;g.turnDrawnTile='dR';g.seats[0].hand=['m1','m2','m3','m4','m5','m6','p1','p2','p3','s1','s2','s3','wE','dR'];QueYeRiichiRules.declareAndDiscard(match,0,'dR');},
 transfer:n=>{match.engine.seats[0].points-=n;match.engine.seats[1].points+=n;match.points=match.engine.seats.map(s=>s.points);renderAll();},
 online:st=>{onlineSeat=st.you.seat;onlineRoomCode='AUDIO';renderOnlineTable(st);}};`;
const checks=`
 const requests=[],active=new Set();let overlaps=0,spoken=0;
 w.speechSynthesis={speak(){spoken++;}};
 w.Audio=class{
  constructor(src){this.src=src;this.listeners={};}
  addEventListener(type,fn){this.listeners[type]=fn;}pause(){active.delete(this);clearTimeout(this.timer);}
  removeAttribute(name){delete this[name];}
  play(){if(!this.src.includes('/voice/'))return Promise.resolve();requests.push(this.src);active.add(this);overlaps=Math.max(overlaps,active.size);this.timer=setTimeout(()=>{active.delete(this);this.listeners.ended?.();},30);return Promise.resolve();}
 };
 click('#btn-mode-local');click('#setup-screen [data-character-id="character-01"]');click('#btn-start-match');
 await new Promise(resolve=>setTimeout(resolve,1300));assert.ok(requests.some(p=>p.endsWith('/match_start.wav')));
 w.qyFixture.current().scheduleAfter=()=>{};w.qyFixture.riichi();await new Promise(resolve=>setTimeout(resolve,100));
 assert.equal(requests.filter(p=>p.endsWith('/riichi.wav')).length,1);
 w.qyFixture.current().emit({type:'riichi',seat:0});await new Promise(resolve=>setTimeout(resolve,100));assert.equal(requests.filter(p=>p.endsWith('/riichi.wav')).length,1);
 w.qyFixture.transfer(8000);await new Promise(resolve=>setTimeout(resolve,50));
 assert.ok(requests.some(p=>p.endsWith('/stage_1.wav')));const show=d.querySelector('#qy-stage-show');click('.qy-stage-skip');await new Promise(resolve=>setTimeout(resolve,40));assert.ok(requests.some(p=>p.endsWith('/stage_2.wav')));click('.qy-stage-skip');
 assert.equal(show.open,false);w.qyFixture.stop();
 const room=new (require('../server/room.js').Room)('AUDIO',require('../server/shared-engine.js'));
 for(let i=0;i<4;i++)room.addPlayer({readyState:1,send(){}},'p'+i,'P','character-0'+(i+1));room.start();room.match.scheduleAfter=()=>{};
 let state=JSON.parse(JSON.stringify(room.buildStateFor(0)));w.qyFixture.online(state);await new Promise(resolve=>setTimeout(resolve,1300));
 const g=room.match.engine;g.phase='reaction';g.lastDiscard={seat:0,tile:'m3'};g.seats[0].discards.push({tile:'m3'});g.seats[1].hand=['m3','m3','p1','p2','p5','p8','p9','s1','s4','s7','wE','dR','dW'];
 room.match._pendingHumanSeats=[1];room.match._pendingReactionResponses={};room.handleMessage(room.seats[1].ws,{type:'react',action:'pon'});
 state=JSON.parse(JSON.stringify(room.buildStateFor(0)));w.qyFixture.online(state);await new Promise(resolve=>setTimeout(resolve,100));
 const count=requests.filter(p=>p==='assets/characters/character-02/voice/pon.wav').length;assert.equal(count,1);
 w.qyFixture.online(state);w.qyFixture.online(state);await new Promise(resolve=>setTimeout(resolve,1300));assert.equal(requests.filter(p=>p.endsWith('/pon.wav')).length,count);
 assert.equal(overlaps,1);assert.equal(spoken,0);
 room.destroy();w.QueYeVoices.reset();assert.deepEqual(errors,[]);console.log('Voice event DOM PASS: real local riichi deduplication, consecutive stage interruption, server-confirmed pon actor, repeated-state silence, one voice channel, no synthesis.');dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
`;
const file=new Module(__filename,module);file.filename=__filename;file.paths=module.paths;
const escaped=helpers.replaceAll('\\','\\\\').replaceAll("'","\\'").replaceAll('\n','\\n');
file._compile(prefix.replace('window.qyFixture={stop:()=>match.stop(),points:()=>match.engine.seats.map(s=>s.points)};',escaped)+checks,__filename);
