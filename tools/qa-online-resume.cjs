'use strict';
const fs=require('node:fs'),Module=require('node:module');
const script=fs.readFileSync('tools/qa-dom.cjs','utf8'),prefix=script.slice(0,script.indexOf(" click('#btn-mode-local');"));
const helpers='window.qyFixture={connect:url=>onlineConnect(url),send:msg=>onlineSend(msg),stop:()=>match?.stop()};';
const checks=`
 const sockets=[];w.WebSocket=class{constructor(){this.events={};this.sent=[];this.readyState=0;sockets.push(this);}addEventListener(n,f){this.events[n]=f;}emit(n,data){this.events[n]?.(data);}open(){this.readyState=1;this.emit('open');}send(msg){this.sent.push(JSON.parse(msg));}receive(msg){this.emit('message',{data:JSON.stringify(msg)});}close(){this.readyState=3;this.emit('close');}};
 const pending=w.qyFixture.connect('ws://localhost:8080');sockets[0].open();await pending;w.qyFixture.send({type:'join',code:'QA',playerId:'same-player'});sockets[0].receive({type:'joined',code:'QA',seat:1});
 const room=new (require('../server/room.js').Room)('QA',require('../server/shared-engine.js'));for(let i=0;i<4;i++)room.addPlayer({readyState:1,send(){}},'p'+i,'P','character-0'+(i+1));room.start();const state=JSON.parse(JSON.stringify(room.buildStateFor(1)));state.phase='reaction';state.lastDiscard={seat:0,tile:'m5'};state.reactionPrompt={key:'original-prompt',opts:{pon:true,kan:false,ron:false,chi:[]}};
 sockets[0].receive(state);assert.equal(d.querySelector('#modal-reaction').classList.contains('hidden'),false);assert.equal(w.QueYeOnlineStatus.phase,'connected');assert.equal(JSON.parse(w.sessionStorage.getItem('queye:online-session')).playerId,'same-player');
 sockets[0].close();assert.equal(d.querySelector('#modal-reaction').classList.contains('hidden'),true);assert.ok(d.querySelector('#table-screen').classList.contains('qy-network-blocked'));assert.equal(w.qyFixture.send({type:'react',action:'pon'}),false);
 w.QueYeOnlineConnection.retry();const next=sockets.at(-1);next.open();assert.deepEqual(next.sent[0],{type:'join',code:'QA',playerId:'same-player'});next.receive({type:'joined',code:'QA',seat:1});next.receive(state);assert.equal(d.querySelector('#modal-reaction').classList.contains('hidden'),false);assert.equal(d.querySelector('#table-screen').classList.contains('qy-network-blocked'),false);assert.equal(next.sent.filter(m=>m.type==='react').length,0);
 const noPrompt={...state,reactionPrompt:null};next.receive(noPrompt);assert.equal(d.querySelector('#modal-reaction').classList.contains('hidden'),true);sockets[0].receive(state);assert.equal(d.querySelector('#modal-reaction').classList.contains('hidden'),true);
 w.QueYeOnlineConnection.leave();assert.equal(w.sessionStorage.getItem('queye:online-session'),null);room.destroy();assert.deepEqual(errors,[]);console.log('Online adapter DOM PASS: own reaction reopened exactly on restored state, stale dialogs closed, same session retained, disconnected action never queued, stale socket ignored.');dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
`;
const source=prefix.replace('window.qyFixture={stop:()=>match.stop(),points:()=>match.engine.seats.map(s=>s.points)};',helpers)+checks;
const file=new Module(__filename,module);file.filename=__filename;file.paths=module.paths;file._compile(source,__filename);
