'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../js/traditional/reconnect-client.js');
function fixture(maxAttempts=3){
 let time=0,id=0;const timers=new Map(),sockets=[],states=[],messages=[],saved=[];
 const clock={now:()=>time,setTimeout:(f,n)=>{timers.set(++id,{at:time+n,f});return id;},clearTimeout:i=>timers.delete(i),setInterval:(f,n)=>{timers.set(++id,{at:time+n,f,repeat:n});return id;},clearInterval:i=>timers.delete(i)};
 function advance(n){const end=time+n;for(;;){const item=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;time=item[1].at;timers.delete(item[0]);if(item[1].repeat)timers.set(item[0],{...item[1],at:time+item[1].repeat});item[1].f();}time=end;}
 class Socket{constructor(){this.events={};this.sent=[];this.readyState=0;sockets.push(this);}addEventListener(n,f){this.events[n]=f;}emit(n,data){this.events[n]?.(data);}open(){this.readyState=1;this.emit('open');}receive(msg){this.emit('message',{data:JSON.stringify(msg)});}send(msg){if(this.readyState!==1)throw Error('closed');this.sent.push(JSON.parse(msg));}close(){this.readyState=3;this.emit('close');}}
 const client=create({WebSocket:Socket,clock,maxAttempts,onStatus:s=>states.push(s),onMessage:m=>messages.push(m),save:s=>saved.push(s)});
 return{client,advance,sockets,states,messages,saved,timers};
}
async function joined(f){const p=f.client.connect('ws://localhost:8080');const s=f.sockets.at(-1);s.open();await p;f.client.send({type:'create',playerId:'original',characterId:'character-01'});s.receive({type:'joined',code:'ABCD',seat:0});s.receive({type:'lobby',started:false});return s;}
test('reconnect keeps identity, rejects disconnected actions and ignores stale socket callbacks',async()=>{
 const f=fixture(),first=await joined(f);assert.equal(f.client.status,'connected');first.close();assert.equal(f.client.status,'retrying');assert.equal(f.client.send({type:'discard',tile:'m5'}),false);
 f.advance(1000);const second=f.sockets.at(-1);second.open();assert.deepEqual(second.sent,[{type:'join',code:'ABCD',playerId:'original'}]);
 second.receive({type:'joined',code:'ABCD',seat:0});second.receive({type:'lobby',started:true});assert.equal(f.client.status,'restoring');first.receive({type:'state',private:'stale'});assert.ok(!f.messages.some(m=>m.private));
 second.receive({type:'state',points:[25000,25000,25000,25000]});assert.equal(f.client.status,'connected');assert.equal(f.client.send({type:'discard',tile:'p1'}),true);assert.equal(second.sent.filter(m=>m.type==='discard').length,1);assert.equal(second.sent.at(-1).tile,'p1');
 f.client.leave();f.advance(60000);assert.equal(f.sockets.length,2);assert.equal(f.client.status,'idle');assert.equal(f.saved.at(-1),null);
});
test('missing room stops retries and clears saved session',()=>{
 const f=fixture();f.client.restore({url:'ws://localhost:8080',code:'OLD',playerId:'p'});f.sockets[0].open();f.sockets[0].receive({type:'error',message:'room-not-found'});f.advance(60000);assert.equal(f.client.status,'lost');assert.equal(f.sockets.length,1);assert.equal(f.saved.at(-1),null);
});
test('heartbeat finds half-open connection; retry limit is bounded and manual retry works',async()=>{
 const f=fixture(2);await joined(f);f.advance(30000);assert.equal(f.client.status,'retrying');f.advance(1000);f.sockets.at(-1).close();assert.equal(f.states.at(-1).delay,2000);f.advance(2000);f.sockets.at(-1).close();assert.equal(f.client.status,'stopped');f.advance(60000);assert.equal(f.sockets.length,3);f.client.retry();assert.equal(f.client.status,'restoring');assert.equal(f.sockets.length,4);f.client.leave();
});
test('incoming traffic keeps connection alive, but restoration requires authoritative state',async()=>{
 const f=fixture();const s=await joined(f);for(let i=0;i<4;i++){f.advance(10000);s.receive({type:'pong',pingId:i});}assert.equal(f.client.status,'connected');s.close();f.advance(1000);f.sockets.at(-1).open();f.advance(10000);assert.equal(f.client.status,'retrying');f.client.leave();
});
