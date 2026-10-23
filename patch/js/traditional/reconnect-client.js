/* Connection lifecycle only. Never queues game actions for retransmission. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QueYeReconnect=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function create({WebSocket,onMessage=()=>{},onStatus=()=>{},onSocket=()=>{},save=()=>{},clock=globalThis,maxAttempts=10}){
  let socket=null,generation=0,retry=null,heartbeat=null,timeout=null,session=null,url='',phase='idle',attempt=0,lastAlive=0,ping=0,pendingReject=null,joining=false;
  const now=()=>typeof clock.now==='function'?clock.now():Date.now();
  const status=(value,extra={})=>{if(value==='connected'&&phase===value)return;phase=value;onStatus({phase,attempt,...extra});};
  function timers(){clock.clearTimeout(retry);clock.clearTimeout(timeout);clock.clearInterval(heartbeat);retry=heartbeat=timeout=null;}
  function retire(){generation++;timers();if(pendingReject){pendingReject(new Error('cancelled'));pendingReject=null;}const old=socket;socket=null;onSocket(null);try{old?.close();}catch(_){};}
  function terminal(reason){retire();session=null;save(null);status('lost',{reason});}
  function schedule(){
   if(!session?.code){status('disconnected');return;}
   if(attempt>=maxAttempts){status('stopped');return;}
   const delay=Math.min(15000,1000*2**Math.min(attempt,4));status('retrying',{delay});
   retry=clock.setTimeout(()=>{retry=null;attempt++;open(true).catch(()=>{});},delay);
  }
  function fail(own){if(own!==generation)return;retire();schedule();}
  function open(resume){
   retire();const own=generation;joining=resume;status(resume?'restoring':'connecting');
   return new Promise((resolve,reject)=>{
    pendingReject=reject;let opened=false;
    const rejectOpen=()=>{if(!opened&&pendingReject){pendingReject(new Error('connection-failed'));pendingReject=null;}};
    try{socket=new WebSocket(url);}catch(_){rejectOpen();if(resume)schedule();else status('disconnected');return;}
    const current=socket;
    timeout=clock.setTimeout(()=>{rejectOpen();fail(own);},8000);
    current.addEventListener('open',()=>{
     if(own!==generation)return;opened=true;clock.clearTimeout(timeout);pendingReject=null;onSocket(current);lastAlive=now();status(resume?'restoring':'joining');
     timeout=clock.setTimeout(()=>fail(own),10000);
     if(resume)current.send(JSON.stringify({type:'join',code:session.code,playerId:session.playerId}));
     heartbeat=clock.setInterval(()=>{if(own!==generation)return;if(now()-lastAlive>25000){fail(own);return;}try{current.send(JSON.stringify({type:'ping',pingId:++ping}));}catch(_){fail(own);}},10000);
     resolve(current);
    });
    current.addEventListener('message',event=>{
     if(own!==generation)return;let msg;try{msg=JSON.parse(event.data);}catch(_){return;}lastAlive=now();
     if(msg.type==='pong')return;
     if(msg.type==='error'&&['room-not-found','room-full-or-started'].includes(msg.message)){onMessage(msg);terminal(msg.message);return;}
     if(msg.type==='joined'){
      session={...(session||{}),url,code:msg.code};save(session);
     }
     if(msg.type==='state'||msg.type==='lobby'){
      if(joining&&msg.type==='lobby'&&msg.started)return;
      joining=false;clock.clearTimeout(timeout);attempt=0;status('connected');
     }
     onMessage(msg);
    });
    current.addEventListener('close',()=>{if(own!==generation)return;rejectOpen();fail(own);});
    current.addEventListener('error',()=>{if(own!==generation)return;rejectOpen();fail(own);});
   });
  }
  return Object.freeze({
   connect(nextUrl){session=null;save(null);url=nextUrl;attempt=0;return open(false);},
   identify(payload){if(['create','join'].includes(payload.type))session={url,code:payload.code||null,playerId:payload.playerId};},
   send(payload){const handshake=['create','join'].includes(payload.type);if(!socket||socket.readyState!==1||!handshake&&phase!=='connected')return false;try{this.identify(payload);socket.send(JSON.stringify(payload));return true;}catch(_){fail(generation);return false;}},
   restore(saved){if(!saved?.url||!saved.code||!saved.playerId)return false;session={...saved};url=saved.url;attempt=0;void open(true).catch(()=>{});return true;},
   retry(){if(!session?.code)return;attempt=0;void open(true).catch(()=>{});},
   leave(){retire();session=null;save(null);status('idle');},
   get status(){return phase;},get session(){return session?{...session}:null;},
  });
 }
 return Object.freeze({create});
});
