/* One character voice channel, shared by actions, results and stage intermissions. */
(() => {
  'use strict';
  const catalog=new Map((window.QueYeVoiceCatalog||[]).map(row=>[`${row.characterId}:${row.event}`,row]));
  const allowed=new Set(QueYeVoiceEvents.events),seenOnline=new Map();
  let queue=[],playing=null,running=false,epoch=0,stageActive=false,currentLocal=null,tracker=null,room=null,onlineHand=null,mode='local',viewer=0,endedMatch=false;
  const enabled=()=>{try{return localStorage.getItem('vidimahjong-character-voice')!=='off';}catch(_){return true;}};
  const important=new Set(['ron','tsumo','deal_in']),resultWaiters=[];let wake=null;
  function resultIdle(){return !important.has(playing?.event)&&!queue.some(item=>important.has(item.event));}
  function notify(){if(resultIdle())while(resultWaiters.length)resultWaiters.shift()();}
  function whenResultIdle(){return resultIdle()?Promise.resolve():new Promise(resolve=>resultWaiters.push(resolve));}
  const character=seat=>QueYeCharacters.normalize(document.querySelector(`.character-widget[data-character-seat="${seat}"]`)?.dataset.characterId);
  function caption(id,event){
    const row=catalog.get(`${id}:${event}`);if(!row)return;
    let cue=document.getElementById('character-voice-cue');
    if(!cue){cue=document.createElement('div');cue.id='character-voice-cue';cue.className='character-voice-cue';cue.setAttribute('role','status');cue.setAttribute('aria-live','polite');(document.getElementById('qy-caption-slot')||document.querySelector('.qy-sidebar')||document.body).append(cue);}
    cue.textContent=`${QueYeCharacters.get(id).name}：${row.textZh}`;cue.classList.add('is-visible');
  }
  function stop(){playing?.cancel();playing=null;document.getElementById('character-voice-cue')?.classList.remove('is-visible');}
  function endStage(){stageActive=false;queueMicrotask(pump);}
  function reset({interrupt=true}={}){epoch++;queue=[];if(interrupt)stop();endStage();notify();}
  function play(id,event,{stage=false}={}){
    return new Promise(resolve=>{
      const row=catalog.get(`${id}:${event}`);if(!row||!enabled()){resolve();return;}
      if(!stage)caption(id,event);
      let audio=null,done=false,attempt=0,loadTimer=null,playTimer=null,unlock=null;
      const preferred=row.path?.match(/\.(wav|mp3|ogg)$/)?.[1]||'wav',extensions=[...new Set([preferred,'wav','mp3','ogg'])];
      function finish(){
        if(done)return;done=true;clearTimeout(loadTimer);clearTimeout(playTimer);
        if(unlock){document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);}
        if(audio){audio.pause();audio.removeAttribute('src');}resolve();
      }
      function next(){
        if(done)return;if(unlock){document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);unlock=null;}if(attempt===extensions.length){finish();return;}
        audio=new Audio(`assets/characters/${id}/voice/${event}.${extensions[attempt++]}`);audio.volume=.85;
        const own=audio;let failed=false,started=false;
        const begin=()=>{if(done||own!==audio||started)return;started=true;clearTimeout(loadTimer);
          // Loading time is separate. An active recording owns the channel until ended.
          playTimer=setTimeout(finish,Math.max(120000,(row.durationSeconds||4)*1000+30000));
        };
        const fail=error=>{
          if(done||failed||own!==audio)return;
          if(error?.name==='NotAllowedError'){
            if(!unlock){unlock=()=>{document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);unlock=null;attemptPlay();};document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);}return;
          }
          // Once playback has begun, a broken stream ends this cue instead of replaying it.
          failed=true;clearTimeout(loadTimer);clearTimeout(playTimer);own.pause();if(started)finish();else next();
        };
        function attemptPlay(){try{Promise.resolve(own.play()).then(begin,fail);}catch(error){fail(error);}}
        own.addEventListener('playing',begin,{once:true});own.addEventListener('ended',finish,{once:true});own.addEventListener('error',fail,{once:true});
        loadTimer=setTimeout(finish,30000);attemptPlay();
      }
      playing={event,cancel:finish};next();
    });
  }
  async function pump(){
    if(running)return;clearTimeout(wake);wake=null;running=true;
    try{
      while(queue.length){
        const now=Date.now();queue=queue.filter(item=>item.epoch===epoch&&item.expires>=now);
        queue.sort((a,b)=>b.priority-a.priority||a.order-b.order);
        const index=queue.findIndex(item=>item.stage||!stageActive&&(!item.afterStage||item.readyAt<=now&&!window.QueYeStageShow?.busy));
        if(index<0){wake=setTimeout(pump,100);break;}
        const [item]=queue.splice(index,1);await play(item.characterId,item.event,{stage:item.stage});playing=null;
        document.getElementById('character-voice-cue')?.classList.remove('is-visible');notify();
      }
    }finally{running=false;notify();}
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
      // Passing is frequent and private; keep the subtitle without filling the voice queue.
      if(event==='pass'){caption(character(seat),event);continue;}
      if(event==='match_start'&&endedMatch){event='rematch';endedMatch=false;}
      const afterStage=!!cue.afterStage&&event!=='deal_in',priority=event==='deal_in'?115:important.has(event)?120:afterStage?50:cue.audience?20:90;
      const expires=Date.now()+(afterStage||important.has(event)?120000:5000)-age;
      if(expires<Date.now())continue;
      queue.push({event,characterId:character(seat),priority,order:++order,epoch,afterStage,readyAt:Date.now()+delay,expires});
      if(queue.length>24)queue.shift();
    }
    void pump();
  }
  function localEvent(event,owner){
    mode='local';viewer=typeof viewSeat==='number'?viewSeat:0;
    if(currentLocal!==owner){reset();currentLocal=owner;tracker=QueYeVoiceEvents.createTracker();}
    else if(event.type==='hand-start'&&tracker.hand>0)reset({interrupt:false});
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
    if(stream&&onlineHand!==null&&onlineHand!==stream.hand)reset({interrupt:false});
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
  // Stages wait for an active recording; result reactions keep the same single channel.
  window.QueYeVoices=Object.freeze({
    stage(item){stageActive=true;if(!item.silent&&(item.elapsedMs||0)<500){queue.push({event:`stage_${item.stage}`,characterId:item.characterId,stage:true,priority:110,order:++order,epoch,expires:Date.now()+Math.max(1,item.voiceLimit||6000)});void pump();}},
    endStage,reset,whenResultIdle,
  });
  document.getElementById('btn-start-match')?.addEventListener('click',()=>reset(),true);
  document.addEventListener('click',event=>{if(event.target.closest?.('.character-voice-toggle')&&!enabled()){epoch++;queue=[];stop();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){queue=queue.filter(item=>item.stage||important.has(item.event));notify();}});
})();
