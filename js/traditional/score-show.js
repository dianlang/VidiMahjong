/* Point count-up precedes optional stage intermission and the normal result panel. */
(() => {
  'use strict';
  const seen=new Set(),matchIds=new WeakMap();let counter=0,pending=Promise.resolve(),dialog=null,animation=null,epoch=0,currentRoom=null;
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function count(settlement){
    const generation=epoch;
    if(settlement.remainingMs!==undefined&&settlement.remainingMs<=0)return;
    if(!dialog){dialog=make('dialog','qy-score-show');dialog.id='qy-score-show';dialog.setAttribute('aria-label','和牌点数结算');document.body.append(dialog);dialog.addEventListener('cancel',event=>event.preventDefault());}
    dialog.replaceChildren(make('small','qy-score-eyebrow','HAND COMPLETE'),make('h2','','和牌 · 点数结算'));
    const rows=make('div','qy-score-counts');dialog.append(rows);
    const values=settlement.after.map((after,seat)=>{
      const before=settlement.before[seat],delta=after-before;const row=make('div',`qy-score-count-row ${delta<0?'is-loss':delta>0?'is-gain':''}`);
      const name=document.querySelector(`.character-widget[data-character-seat="${seat}"] .character-name`)?.textContent||['东家','南家','西家','北家'][seat];
      const value=make('strong','',before.toLocaleString());row.append(make('span','',name),value,make('b','',`${delta>0?'+':''}${delta.toLocaleString()}`));rows.append(row);return {value,before,after};
    });dialog.append(make('p','','正在结算本局点数……'));if(!dialog.open)dialog.showModal();
    const length=Math.min(QueYeSettlement.SCORE_DURATION_MS,settlement.remainingMs??QueYeSettlement.SCORE_DURATION_MS),start=performance.now();
    const frame=now=>{if(generation!==epoch)return;const ratio=Math.min(1,(now-start)/Math.max(1,length)),ease=1-Math.pow(1-ratio,3);for(const item of values)item.value.textContent=Math.round(item.before+(item.after-item.before)*ease).toLocaleString();if(ratio<1)animation=requestAnimationFrame(frame);};animation=requestAnimationFrame(frame);
    await wait(Math.max(0,length));if(generation!==epoch)return;cancelAnimationFrame(animation);animation=null;for(const item of values)item.value.textContent=item.after.toLocaleString();if(dialog.open)dialog.close();
  }
  function present(key,settlement,callback){
    if(!settlement||!['ron','tsumo'].includes(settlement.type))return callback();
    if(seen.has(key))return;seen.add(key);const generation=epoch;
    pending=(async()=>{await count(settlement);await (window.QueYeStageShow?.whenIdle()||Promise.resolve());if(generation===epoch)callback();})();
    return pending;
  }
  const local=showHandResult;showHandResult=function(result){
    const owner=match;if(!matchIds.has(owner))matchIds.set(owner,++counter);
    const settled=owner._queYeSettlement;return present(`local:${matchIds.get(owner)}:${settled?.id}`,settled,()=>{if(match===owner)local.call(this,result);});
  };
  const remote=showOnlineHandResult;showOnlineHandResult=function(st){const room=onlineRoomCode;return present(`online:${room}:${st.settlement?.id}`,st.settlement,()=>{if(onlineRoomCode===room)remote.call(this,st);});};
  const end=showMatchEnd;showMatchEnd=function(...args){const generation=epoch;pending.then(()=>{if(generation===epoch)end.apply(this,args);});};
  const onlineEnd=showOnlineMatchEnd;showOnlineMatchEnd=function(...args){const generation=epoch,room=onlineRoomCode;pending.then(()=>{if(generation===epoch&&room===onlineRoomCode)onlineEnd.apply(this,args);});};
  const render=renderOnlineTable;renderOnlineTable=function(st){if(currentRoom!==onlineRoomCode){currentRoom=onlineRoomCode;epoch++;if(dialog?.open)dialog.close();if(animation)cancelAnimationFrame(animation);}return render.call(this,st);};
  document.getElementById('btn-start-match')?.addEventListener('click',()=>{epoch++;if(dialog?.open)dialog.close();if(animation)cancelAnimationFrame(animation);},true);
})();
