/* One character voice channel, shared by actions, results and stage intermissions. */
(() => {
  'use strict';
  const catalog=new Map((window.QueYeVoiceCatalog||[]).map(row=>[`${row.characterId}:${row.event}`,row]));
  const allowed=new Set(QueYeVoiceEvents.events),seenOnline=new Map();
  let queue=[],playing=null,running=false,epoch=0,stageActive=false,stageWaiters=[],currentLocal=null,tracker=null,room=null,onlineHand=null,mode='local',viewer=0,endedMatch=false;
  const enabled=()=>{try{return localStorage.getItem('vidimahjong-character-voice')!=='off';}catch(_){return true;}};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const character=seat=>QueYeCharacters.normalize(document.querySelector(`.character-widget[data-character-seat="${seat}"]`)?.dataset.characterId);
  function caption(id,event){
    const row=catalog.get(`${id}:${event}`);if(!row)return;
    let cue=document.getElementById('character-voice-cue');
    if(!cue){cue=document.createElement('div');cue.id='character-voice-cue';cue.className='character-voice-cue';cue.setAttribute('role','status');cue.setAttribute('aria-live','polite');document.body.append(cue);}
    cue.textContent=`${QueYeCharacters.get(id).name}：${row.textZh}`;cue.classList.add('is-visible');
  }
  function stop(){playing?.cancel();playing=null;document.getElementById('character-voice-cue')?.classList.remove('is-visible');}
  function idleStage(){return stageActive?new Promise(resolve=>stageWaiters.push(resolve)):Promise.resolve();}
  function endStage(){stageActive=false;stop();while(stageWaiters.length)stageWaiters.shift()();queueMicrotask(pump);}
  function reset(){epoch++;queue=[];endStage();}
  function play(id,event,{stage=false,limit=6000}={}){
    return new Promise(resolve=>{
      const row=catalog.get(`${id}:${event}`);
      if(!row){resolve();return;}
      if(!stage)caption(id,event);
      if(!enabled()){const timer=setTimeout(resolve,500);playing={cancel(){clearTimeout(timer);resolve();}};return;}
      let audio=null,done=false,attempt=0,linger=null;const startedAt=Date.now();
      const extensions=['wav','mp3','ogg'];
      const timer=setTimeout(finish,Math.min(limit,Math.max(1500,(row.durationSeconds||4)*1000+500)));
      function finish(cancel=false){
        if(done){if(cancel){clearTimeout(linger);resolve();}return;}
        done=true;clearTimeout(timer);if(audio){audio.pause();audio.removeAttribute('src');}
        if(!cancel&&!stage&&Date.now()-startedAt<1200)linger=setTimeout(resolve,1200-(Date.now()-startedAt));else resolve();
      }
      function next(){
        if(done)return;
        if(attempt===extensions.length){finish();return;}
        audio=new Audio(`assets/characters/${id}/voice/${event}.${extensions[attempt++]}`);
        audio.volume=.85;let failed=false;
        const fail=()=>{if(failed||done)return;failed=true;audio.pause();next();};
        audio.addEventListener('ended',()=>finish(),{once:true});audio.addEventListener('error',fail,{once:true});
        try{audio.play().catch(fail);}catch(_){fail();}
      }
      playing={cancel:()=>finish(true)};next();
    });
  }
  async function pump(){
    if(running)return;running=true;
    try{
      while(queue.length){
        queue.sort((a,b)=>b.priority-a.priority||a.order-b.order);
        const item=queue.shift(),generation=item.epoch;
        if(generation!==epoch||item.expires<Date.now())continue;
        if(item.afterStage){await wait(Math.max(0,item.readyAt-Date.now()));await (window.QueYeStageShow?.whenIdle()||Promise.resolve());}
        await idleStage();
        if(generation!==epoch||item.expires<Date.now())continue;
        await play(item.characterId,item.event);if(generation===epoch&&!stageActive)stop();
      }
    }finally{running=false;if(queue.length)queueMicrotask(pump);}
  }
  let order=0;
  function consume(cues,{delay=0,age=0}={}){
    for(const cue of cues){
      if(!allowed.has(cue.event))continue;
      if(cue.audience==='self'&&cue.seat!==viewer)continue;
      if(cue.audience==='others'&&cue.seat===viewer)continue;
      const seat=['viewer','others'].includes(cue.audience)?viewer:cue.seat;
      if(!Number.isInteger(seat)||seat<0||seat>3)continue;
      let event=cue.event;
      if(event==='match_start'&&endedMatch){event='rematch';endedMatch=false;}
      const afterStage=!!cue.afterStage,priority=afterStage?50:cue.audience?20:90;
      const expires=Date.now()+(afterStage?120000:5000)-age;
      if(expires<Date.now())continue;
      queue.push({event,characterId:character(seat),priority,order:++order,epoch,afterStage,readyAt:Date.now()+delay,expires});
      if(queue.length>24)queue.shift();
    }
    void pump();
  }
  function localEvent(event,owner){
    mode='local';viewer=typeof viewSeat==='number'?viewSeat:0;
    if(currentLocal!==owner){reset();currentLocal=owner;tracker=QueYeVoiceEvents.createTracker();}
    else if(event.type==='hand-start'&&tracker.hand>0)reset();
    QueYeVoiceEvents.bindPass(owner,cue=>{if(currentLocal===owner&&mode==='local')consume(tracker.observe(cue,owner));});
    const losses=Array.from({length:4},(_,seat)=>Number(document.querySelector(`.character-widget[data-character-seat="${seat}"] .character-loss`)?.textContent.replace(/[^\d]/g,''))||0);
    return tracker.observe(event,owner,losses);
  }
  const local=onMatchEvent;
  onMatchEvent=function(event){
    const owner=match,cues=localEvent(event,owner),result=local.call(this,event);
    viewer=viewSeat;
    consume(cues,{delay:owner.engine.phase==='ended'?Math.max(0,(owner._queYeSettlement?.startedAt||0)+QueYeSettlement.SCORE_DURATION_MS-Date.now()):0});
    if(event.type==='match-end')endedMatch=true;
    return result;
  };
  const remote=renderOnlineTable;
  renderOnlineTable=function(st){
    const stream=st.voiceEvents,key=`${onlineRoomCode}:${stream?.session||'legacy'}`;
    if(room!==key||mode!=='online'){reset();room=key;onlineHand=null;}mode='online';viewer=st.you.seat;
    if(stream&&onlineHand!==null&&onlineHand!==stream.hand)reset();
    if(stream)onlineHand=stream.hand;
    const result=remote.call(this,st);
    if(stream){
      let last=seenOnline.get(key);
      if(last===undefined){try{last=Number(sessionStorage.getItem(`queye:voice:${key}`))||0;}catch(_){last=0;}}
      const fresh=stream.events.filter(cue=>cue.sequence>last&&cue.hand===stream.hand);
      seenOnline.set(key,Math.max(last,stream.sequence));try{sessionStorage.setItem(`queye:voice:${key}`,String(Math.max(last,stream.sequence)));}catch(_){}
      for(const cue of fresh)consume([cue],{delay:st.settlement?.remainingMs||0,age:cue.ageMs||0});
    }
    if(st.matchOver)endedMatch=true;
    return result;
  };
  // Stage audio owns the same channel; queued results wait until all stages finish.
  window.QueYeVoices=Object.freeze({
    stage(item){stageActive=true;stop();if((item.elapsedMs||0)<500)void play(item.characterId,`stage_${item.stage}`,{stage:true,limit:Math.max(1,item.voiceLimit||6000)});},
    endStage,reset,
  });
  document.getElementById('btn-start-match')?.addEventListener('click',()=>reset(),true);
  document.addEventListener('click',event=>{if(event.target.closest?.('.character-voice-toggle')&&!enabled()){epoch++;queue=[];stop();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){queue=[];stop();}});
})();
