/* Full-window stage intermission, with bounded optional voice and caption fallback. */
(() => {
  'use strict';
  const duration=QueYeMatchPause.DURATION_MS,registry=QueYeCharacters;
  let queue=[],active=null,dialog=null,timer=null,startTimer=null,voice=null,sfx=null,utterance=null,opener=null,owner=null,pause=null;
  let localDeadline=0,onlineRevision=null,roomKey=null;
  const idle=[];
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  function whenIdle(){return active||queue.length?new Promise(resolve=>idle.push(resolve)):Promise.resolve();}
  function stopAudio(){for(const audio of [voice,sfx])if(audio){audio.pause();audio.removeAttribute('src');}if(utterance&&window.speechSynthesis)window.speechSynthesis.cancel();utterance=null;voice=null;sfx=null;}
  function play(item){
    try{if(localStorage.getItem('vidimahjong-character-voice')==='off')return;}catch(_){}
    sfx=new Audio(`assets/sfx/stage-${item.stage}.wav`);sfx.volume=.22;sfx.play().catch(()=>{});
    const start=extension=>{
      if(active!==item)return;
      const audio=new Audio(`assets/characters/${item.characterId}/voice/stage-${item.stage}.${extension}`);voice=audio;
      let failed=false;const fallback=()=>{
        if(failed)return;failed=true;if(active!==item)return;
        if(extension==='mp3'){start('ogg');return;}
        if(window.speechSynthesis&&typeof SpeechSynthesisUtterance==='function'){
          utterance=new SpeechSynthesisUtterance(registry.get(item.characterId).stageLines[item.stage]);utterance.lang='zh-CN';utterance.rate=1.05;
          const voices=window.speechSynthesis.getVoices();const chinese=voices.filter(v=>/^zh/i.test(v.lang));utterance.voice=chinese.find(v=>v.localService)||chinese[0]||null;window.speechSynthesis.speak(utterance);
        }
      };
      audio.addEventListener('error',fallback,{once:true});audio.play().catch(fallback);
    };start('mp3');
  }
  function ensureDialog(){
    if(dialog)return;
    dialog=make('dialog','qy-stage-show');dialog.id='qy-stage-show';dialog.setAttribute('aria-labelledby','qy-stage-show-title');
    const backdrop=make('div','qy-stage-backdrop');backdrop.setAttribute('aria-hidden','true');
    const figure=make('div','qy-stage-figure');const old=make('img','qy-stage-before'),next=make('img','qy-stage-after');old.alt='';next.alt='';
    old.addEventListener('error',()=>{old.hidden=true;});next.addEventListener('error',()=>{next.hidden=true;dialog.classList.add('is-missing-art');});
    figure.append(old,next,make('span','qy-stage-no-art','立绘暂未就绪'));
    const heading=make('div','qy-stage-heading');const title=make('h2');title.id='qy-stage-show-title';heading.append(make('small','','QUEYE · STAGE CHANGE'),title,make('p','qy-stage-state','牌局暂停 · 演出结束后继续'));
    const caption=make('div','qy-stage-caption');caption.setAttribute('role','status');caption.setAttribute('aria-live','polite');caption.append(make('strong','qy-stage-name'),make('p','qy-stage-line'));
    const progress=make('div','qy-stage-progress');progress.append(make('span'));
    const skip=make('button','qy-stage-skip','跳过演出');skip.type='button';skip.addEventListener('click',()=>{if(active?.mode==='local')finish();});
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(active?.mode==='local')finish();});
    dialog.append(backdrop,figure,heading,caption,progress,skip);document.body.append(dialog);
  }
  function finish(){
    clearTimeout(timer);timer=null;stopAudio();active=null;
    if(queue.length){next();return;}
    if(dialog?.open)dialog.close();
    pause?.release();pause=null;owner=null;localDeadline=0;
    opener?.focus();opener=null;while(idle.length)idle.shift()();
  }
  function next(){
    if(active||!queue.length)return;
    queue.sort((a,b)=>a.seat-b.seat);active=queue.shift();const item=active;
    ensureDialog();opener=opener||document.activeElement;
    dialog.classList.remove('is-running','is-missing-art');
    const name=registry.get(item.characterId).name;
    dialog.querySelector('h2').textContent=`${name} · 阶段 ${item.stage}`;
    dialog.querySelector('.qy-stage-name').textContent=name;
    dialog.querySelector('.qy-stage-line').textContent=registry.get(item.characterId).stageLines[item.stage];
    dialog.querySelector('.qy-stage-skip').hidden=item.mode==='online';
    const before=dialog.querySelector('.qy-stage-before'),after=dialog.querySelector('.qy-stage-after');
    before.hidden=false;after.hidden=false;before.src=registry.stagePath(item.characterId,item.previousStage);after.src=registry.stagePath(item.characterId,item.stage);after.alt=`${name}阶段 ${item.stage} 立绘`;
    const length=Math.max(1,Math.min(duration,item.endsAt?item.endsAt-Date.now():duration));
    dialog.style.setProperty('--show-duration',`${length}ms`);
    if(!dialog.open)dialog.showModal();
    // Restart CSS animation without animation libraries or a browser fullscreen permission prompt.
    void dialog.offsetWidth;dialog.classList.add('is-running');play(item);timer=setTimeout(finish,length);
  }
  function enqueue(item){
    if(item.mode!=='local')return;
    if(typeof match==='undefined'||!match)return;
    if(owner&&owner!==match)cancel('local');
    owner=match;pause=QueYeMatchPause.attach(owner);
    const settlement=owner._queYeSettlement;
    const lead=!active&&!queue.length&&settlement&&owner.engine.phase==='ended'&&['ron','tsumo'].includes(settlement.type)?Math.max(0,settlement.startedAt+QueYeSettlement.SCORE_DURATION_MS-Date.now()):0;
    localDeadline=Math.max(Date.now(),localDeadline)+duration+lead;pause.holdUntil(localDeadline);
    queue.push({...item});
    if(!active&&!startTimer){if(lead)startTimer=setTimeout(()=>{startTimer=null;next();},lead);else queueMicrotask(next);}
  }
  function cancel(mode){
    if(active?.mode===mode||queue.some(item=>item.mode===mode)){clearTimeout(startTimer);startTimer=null;}
    queue=queue.filter(item=>item.mode!==mode);
    if(active?.mode===mode){clearTimeout(timer);stopAudio();active=null;if(dialog?.open)dialog.close();}
    if(mode==='local'){owner?.stop();pause?.cancel();pause=null;owner=null;localDeadline=0;}
    if(!active&&!queue.length)while(idle.length)idle.shift()();
  }
  function onlineState(st){
    const room=typeof onlineRoomCode==='string'?onlineRoomCode:'online';
    if(room!==roomKey){cancel('online');roomKey=room;onlineRevision=null;}
    const show=st.stagePresentation;
    if(!show||show.remainingMs<=0){if(active?.mode==='online'||queue.some(i=>i.mode==='online'))cancel('online');return;}
    if(show.revision===onlineRevision)return;
    cancel('online');onlineRevision=show.revision;
    const changes=show.changes.filter(c=>Number.isInteger(c.seat)&&c.seat>=0&&c.seat<4&&c.stage>=1&&c.stage<=4).sort((a,b)=>a.seat-b.seat);
    const elapsed=Math.max(0,changes.length*duration-show.remainingMs);
    changes.forEach((change,index)=>{
      if((index+1)*duration<=elapsed)return;
      const widget=document.querySelector(`.character-widget[data-character-seat="${change.seat}"]`);
      const id=widget?.dataset.characterId||st.seats[change.seat].characterId;
      queue.push({...change,mode:'online',characterId:registry.normalize(id),endsAt:Date.now()+Math.max(0,show.delayMs||0)+(index+1)*duration-elapsed});
    });
    if(show.delayMs>0)startTimer=setTimeout(()=>{startTimer=null;next();},show.delayMs);else next();
  }
  const original=renderOnlineTable;renderOnlineTable=function(st){const result=original.call(this,st);onlineState(st);return result;};
  const start=document.getElementById('btn-start-match');start?.addEventListener('click',()=>cancel('local'),true);
  window.QueYeStageShow=Object.freeze({enqueue,cancel,whenIdle});
})();
