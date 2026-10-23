/* Fixed action dock and public table cues; does not change legal actions. */
(() => {
 'use strict';
 let online=false,state=null,section=null,title=null,detail=null,lastTile=null,net={phase:'idle'},scheduled=false;
 const byId=id=>document.getElementById(id),make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 const actor=seat=>document.querySelector(`.character-widget[data-character-seat="${seat}"] .character-name`)?.textContent||['东家','南家','西家','北家'][seat];
 function setup(){
  if(section||!document.querySelector('.qy-workspace'))return;
  section=make('section','qy-play-status');section.id='qy-play-status';section.setAttribute('aria-label','当前操作');
  const copy=make('div','qy-play-copy');title=make('strong');title.id='qy-play-title';title.setAttribute('role','status');title.setAttribute('aria-live','polite');detail=make('span');copy.append(title,detail);
  lastTile=make('div','qy-current-discard');lastTile.setAttribute('aria-label','当前弃牌');
  const dock=make('div','qy-action-dock');dock.id='qy-action-dock';dock.append(byId('human-actions'));
  const stack=make('div','qy-hand-stack'),hand=byId('human-hand');hand.before(stack);stack.append(dock,hand);section.append(copy,lastTile);
  document.querySelector('.qy-workspace').before(section);
  const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;update();});}});
  observer.observe(byId('human-actions'),{childList:true,subtree:true,characterData:true});observer.observe(byId('turn-hint'),{childList:true,characterData:true,subtree:true});
 }
 function update(){
  setup();if(!section)return;
  const g=online?state:(typeof match!=='undefined'?match?.engine:null);if(!g)return;
  const me=online?g.you.seat:viewSeat,seats=g.seats,own=online?g.you:seats[me],phase=g.phase;
  const disconnected=online&&!['idle','connected'].includes(net.phase);
  const paused=online?(g.stagePresentation?.remainingMs||0)>0:QueYeMatchPause.attach(match).isPaused();
  const response=online?g.reactionPrompt:phase==='reaction'&&match._pendingHumanSeats?.includes(me);
  const choosing=byId('human-actions').querySelector('[data-qy-riichi-cancel]');
  section.dataset.state=disconnected?'disconnected':paused?'paused':phase==='ended'?'ended':response?'response':g.currentSeat===me&&phase==='discard'?'action':'waiting';
  title.textContent=disconnected?'正在恢复连接':paused?'演出中 · 牌局暂停':phase==='ended'?(online?g.matchOver:match.matchOver)?'本场已结束':'本局已结算':response?'请选择响应':g.currentSeat===me&&phase==='discard'?choosing?'选择立直舍牌':own.riichi?'立直中 · 摸切或和牌':'轮到你出牌':`${actor(g.currentSeat)}正在行动`;
  detail.textContent=disconnected?'等待同步完成后再操作，未发送的动作不会补发。':paused?'演出完成后自动继续。':phase==='ended'?'查看结算后继续下一局。':response?'选择吃、碰、杠、和牌或过，以当前可用按钮为准。':choosing?'点击高亮牌，查看听牌并确认。':own.riichi?'手牌已锁定；轮到你时只能打出右侧摸入牌或和牌。':byId('turn-hint').textContent||'留意最新弃牌，等待自己的回合。';
  lastTile.replaceChildren();
  if(g.lastDiscard&&phase==='reaction')lastTile.append(make('span','',`${actor(g.lastDiscard.seat)}打出`),miniTileChip(g.lastDiscard.tile,false));
  else lastTile.append(make('span','',phase==='ended'?'等待下一局':`余牌 ${online?g.wallCount:g.liveWall.length}`));
  document.getElementById('table-screen').classList.toggle('qy-network-blocked',disconnected);
  document.querySelectorAll('.opponent-panel').forEach(panel=>panel.classList.toggle('qy-active-seat',Number(panel.dataset.qySeat)===g.currentSeat&&phase!=='ended'));
  byId('human-hand').classList.toggle('qy-hand-active',!disconnected&&!paused&&g.currentSeat===me&&phase==='discard');
 }
 const local=renderAll;renderAll=function(...args){online=false;const result=local.apply(this,args);update();return result;};
 const remote=renderOnlineTable;renderOnlineTable=function(st){online=true;state=st;const result=remote.call(this,st);update();return result;};
 document.addEventListener('queye:connection-state',event=>{net=event.detail;update();});
 document.addEventListener('queye:stage-state',update);
 document.addEventListener('DOMContentLoaded',setup);
})();
