/* Point count-up precedes optional stage intermission and the normal result panel. */
(() => {
  'use strict';
  const seen=new Map(),matchIds=new WeakMap();let latestState=null,resultKey=null,counter=0,pending=Promise.resolve(),dialog=null,animation=null,epoch=0,currentRoom=null;
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function count(settlement,result){
    const generation=epoch;
    if(settlement.remainingMs!==undefined&&settlement.remainingMs<=0)return;
    if(!dialog){dialog=make('dialog','qy-score-show');dialog.id='qy-score-show';dialog.setAttribute('aria-label','和牌点数结算');document.body.append(dialog);dialog.addEventListener('cancel',event=>event.preventDefault());}
    dialog.replaceChildren(make('small','qy-score-eyebrow','HAND COMPLETE'),make('h2','','和牌 · 点数结算'));
    const ron=result?.type==='ron',victim=result?.discarder;
    dialog.classList.toggle('is-ron',ron);
    if(ron){const name=document.querySelector(`.character-widget[data-character-seat="${victim}"] .character-name`)?.textContent||['东家','南家','西家','北家'][victim];
      dialog.querySelector('h2').textContent='荣和 · 放铳';const impact=make('div','qy-deal-in-impact');impact.append(make('strong','','放铳'),make('span','',name),make('b','',`${(settlement.after[victim]-settlement.before[victim]).toLocaleString()} 点`));dialog.append(impact);
    }
    const rows=make('div','qy-score-counts');dialog.append(rows);
    const values=settlement.after.map((after,seat)=>{
      const before=settlement.before[seat],delta=after-before;const row=make('div',`qy-score-count-row ${delta<0?'is-loss':delta>0?'is-gain':''}${ron&&seat===victim?' is-deal-in':''}`);
      const name=document.querySelector(`.character-widget[data-character-seat="${seat}"] .character-name`)?.textContent||['东家','南家','西家','北家'][seat];
      const value=make('strong','',before.toLocaleString());row.append(make('span','',name),value,make('b','',`${delta>0?'+':''}${delta.toLocaleString()}`));rows.append(row);return {value,before,after};
    });dialog.append(make('p','','正在结算本局点数……'));if(!dialog.open)dialog.showModal();
    const length=Math.min(QueYeSettlement.SCORE_DURATION_MS,settlement.remainingMs??QueYeSettlement.SCORE_DURATION_MS),start=performance.now();
    const lead=ron?Math.min(650,length/2):0;
    const frame=now=>{if(generation!==epoch)return;const ratio=Math.max(0,Math.min(1,(now-start-lead)/Math.max(1,length-lead))),ease=1-Math.pow(1-ratio,3);for(const item of values)item.value.textContent=Math.round(item.before+(item.after-item.before)*ease).toLocaleString();if(ratio<1)animation=requestAnimationFrame(frame);};animation=requestAnimationFrame(frame);
    await wait(Math.max(0,length));if(generation!==epoch)return;cancelAnimationFrame(animation);animation=null;for(const item of values)item.value.textContent=item.after.toLocaleString();if(dialog.open)dialog.close();
  }
  function present(key,settlement,callback,result){
    if(!settlement||!['ron','tsumo'].includes(settlement.type))return callback();
    if(seen.has(key))return seen.get(key);
    const generation=epoch,startedAt=Date.now(),live=settlement.remainingMs===undefined||settlement.remainingMs>0;
    pending=(async()=>{await count(settlement,result);await (window.QueYeStageShow?.whenIdle()||Promise.resolve());await (window.QueYeVoices?.whenResultIdle()||Promise.resolve());
      if(live)await wait(Math.max(0,(result?.type==='ron'?2800:1900)-(Date.now()-startedAt)));
      if(generation===epoch)callback();})();seen.set(key,pending);return pending;
  }
  const local=showHandResult;showHandResult=function(result){
    const owner=match;if(!matchIds.has(owner))matchIds.set(owner,++counter);
    const settled=owner._queYeSettlement;return present(`local:${matchIds.get(owner)}:${settled?.id}`,settled,()=>{if(match===owner){local.call(this,result);document.getElementById('btn-next-hand').disabled=false;document.getElementById('btn-next-hand').textContent='确认结算';document.getElementById('qy-settlement-ready')?.remove();}},result);
  };
  function confirmation(st){
    const r=st.settlementReady,button=document.getElementById('btn-next-hand');
    let status=document.getElementById('qy-settlement-ready');if(!status){status=make('p','qy-settlement-ready');status.id='qy-settlement-ready';button.before(status);}
    if(!r){button.disabled=false;button.textContent='下一局';status.textContent='';return;}
    const confirmed=!!r.confirmed[st.you.seat],count=r.required.filter((required,i)=>required&&r.confirmed[i]).length,total=r.required.filter(Boolean).length;
    button.disabled=confirmed;button.textContent=confirmed?'已确认 · 等待其他玩家':'确认结算';
    status.textContent=`已确认 ${count} / ${total} · 所有真人确认后进入下一局`;
    const waiting=r.required.map((required,i)=>required&&!r.confirmed[i]?`${['东家','南家','西家','北家'][i]}${st.seats[i].isConnected?'':'（离线，等待重连）'}`:null).filter(Boolean);
    if(waiting.length)status.textContent+=' · 等待：'+waiting.join('、');
  }
  const remote=showOnlineHandResult;showOnlineHandResult=function(st){
    latestState=st;const room=onlineRoomCode,key=`online:${room}:${st.settlement?.id}`;
    if(resultKey===key){confirmation(st);return;}
    return present(key,st.settlement,()=>{if(onlineRoomCode===room&&latestState?.phase==='ended'&&latestState.settlement?.id===st.settlement?.id){remote.call(this,latestState);resultKey=key;confirmation(latestState);}},st.result);
  };
  // Capture prevents the upstream local-only listener from also advancing an online match.
  document.getElementById('btn-next-hand').addEventListener('click',event=>{
    if(typeof onlineRoomCode!=='string'||!onlineRoomCode)return;
    event.preventDefault();event.stopImmediatePropagation();const st=latestState;if(!st||st.phase!=='ended')return;
    if(st.settlementReady){onlineSend({type:'confirmSettlement',settlementId:st.settlementReady.id});}
    else{closeAllModals();onlineSend({type:'nextHand'});}
  },true);
  const end=showMatchEnd;showMatchEnd=function(...args){const generation=epoch;pending.then(()=>{if(generation===epoch)end.apply(this,args);});};
  const onlineEnd=showOnlineMatchEnd;showOnlineMatchEnd=function(...args){const generation=epoch,room=onlineRoomCode;pending.then(()=>{if(generation===epoch&&room===onlineRoomCode)onlineEnd.apply(this,args);});};
  const render=renderOnlineTable;renderOnlineTable=function(st){latestState=st;if(st.phase!=='ended'&&resultKey){closeAllModals();resultKey=null;}if(currentRoom!==onlineRoomCode){currentRoom=onlineRoomCode;epoch++;if(dialog?.open)dialog.close();if(animation)cancelAnimationFrame(animation);}return render.call(this,st);};
  document.addEventListener('queye:menu',()=>{epoch++;latestState=null;currentRoom=null;resultKey=null;if(dialog?.open)dialog.close();if(animation)cancelAnimationFrame(animation);});
  document.getElementById('btn-start-match')?.addEventListener('click',()=>{epoch++;if(dialog?.open)dialog.close();if(animation)cancelAnimationFrame(animation);},true);
})();
