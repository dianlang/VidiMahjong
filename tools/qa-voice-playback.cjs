'use strict';
// Controlled Audio lifecycle: delayed loading, interrupted events and autoplay denial.
const fs=require('node:fs'),Module=require('node:module');
const script=fs.readFileSync('tools/qa-dom.cjs','utf8'),prefix=script.slice(0,script.indexOf(" click('#btn-mode-local');"));
const helpers='window.qyFixture={stop:()=>match.stop(),online:st=>{onlineSeat=st.you.seat;onlineRoomCode="VOICE-COMPLETE";renderOnlineTable(st);}};';
const checks=`
 const requests=[],active=new Set();let interrupted=0,denied=false;
 w.Audio=class{
  constructor(src){this.src=src;this.events={};this.started=false;this.ended=false;}
  addEventListener(n,f){this.events[n]=f;}removeAttribute(n){delete this[n];}
  play(){if(!this.src.includes('/voice/'))return Promise.resolve();requests.push(this);if(denied){const e=new Error('gesture required');e.name='NotAllowedError';return Promise.reject(e);}return new Promise(resolve=>{this.loaded=()=>{this.started=true;active.add(this);this.events.playing?.();resolve();};});}
  pause(){if(this.started&&!this.ended)interrupted++;active.delete(this);}
  finish(){this.ended=true;active.delete(this);this.events.ended?.();}
 };
 const room=new (require('../server/room.js').Room)('VOICE-COMPLETE',require('../server/shared-engine.js'));for(let i=0;i<4;i++)room.addPlayer({readyState:1,send(){}},'p'+i,'P'+i,'character-0'+(i+1));room.start();room.match.scheduleAfter=()=>{};
 let state=JSON.parse(JSON.stringify(room.buildStateFor(1)));state.voiceEvents.events=[{event:'pon',seat:0,sequence:1,hand:state.voiceEvents.hand,ageMs:0}];state.voiceEvents.sequence=1;w.qyFixture.online(state);assert.match(requests[0].src,/character-01[/]voice[/]pon.wav$/);
 // A delayed download must not consume the playback timeout before audio starts.
 await new Promise(r=>setTimeout(r,1700));assert.ok(requests[0].src);requests[0].loaded();
 w.QueYeVoices.stage({characterId:'character-02',stage:1,voiceLimit:6000});w.QueYeVoices.endStage();assert.equal(requests.length,1);assert.equal(interrupted,0);
 requests[0].finish();await new Promise(r=>setTimeout(r,20));assert.match(requests[1].src,/character-02[/]voice[/]stage_1.wav$/);requests[1].loaded();
 // Even the end of a visual segment or the start of the next hand cannot cut it.
 w.QueYeVoices.endStage();state.voiceEvents.hand++;state.voiceEvents.events=[];w.qyFixture.online(state);assert.equal(interrupted,0);requests[1].finish();await new Promise(r=>setTimeout(r,20));
 denied=true;state.voiceEvents.sequence=2;state.voiceEvents.events=[{event:'riichi',seat:2,sequence:2,hand:state.voiceEvents.hand,ageMs:0}];w.qyFixture.online(state);await new Promise(r=>setTimeout(r,20));const blocked=requests.at(-1),count=requests.length;assert.match(blocked.src,/character-03[/]voice[/]riichi.wav$/);
 denied=false;d.dispatchEvent(new w.Event('pointerdown'));assert.equal(requests.length,count+1);assert.equal(requests.at(-1),blocked);blocked.loaded();blocked.finish();await new Promise(r=>setTimeout(r,20));
 const before=requests.length;state.voiceEvents.sequence=3;state.voiceEvents.events=[{event:'pass',seat:1,audience:'self',sequence:3,hand:state.voiceEvents.hand,ageMs:0}];w.qyFixture.online(state);await new Promise(r=>setTimeout(r,20));assert.equal(requests.length,before);assert.equal(interrupted,0);assert.equal(active.size,0);
 room.destroy();w.QueYeVoices.reset();assert.deepEqual(errors,[]);console.log('Voice lifecycle DOM PASS: other-seat actor, delayed loading, stage/hand changes do not cut started audio, one channel, gesture retry without format cycling, pass stays quiet.');dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
`;
const file=new Module(__filename,module);file.filename=__filename;file.paths=module.paths;
file._compile(prefix.replace('window.qyFixture={stop:()=>match.stop(),points:()=>match.engine.seats.map(s=>s.points)};',helpers)+checks,__filename);
