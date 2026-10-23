/* Optional input assistance. All commands still use the existing local/server validators. */
(() => {
 'use strict';
 const policy=QueYePlayPolicy,storageKey='queye:play-options:v1',byId=id=>document.getElementById(id);
 let prefs=policy.normalize(null),online=false,state=null,owner=null,lastKey='',timer=null,selected=null,reaction=null,flight=null,serial=0,fresh=false;
 try{prefs=policy.normalize(JSON.parse(localStorage.getItem(storageKey)||'null'));}catch(_){}
 const labels={autoPass:['自动过','自动跳过吃碰杠提示；可以荣和时停下来。'],noCalls:['禁止鸣牌','不吃、不碰、不明杠；保留荣和、自摸和暗杠。'],autoRiichi:['立直摸切','立直后自动打出摸入牌；可以自摸或暗杠时停下来。'],confirmDiscard:['出牌确认','点一下选牌，再点同一张或按“确认打出”；立直使用原确认流程。']};
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 function stop(){clearTimeout(timer);timer=null;}
 function view(){
  const g=online?state:(typeof match!=='undefined'?match?.engine:null);if(!g)return null;
  const me=online?g.you.seat:viewSeat,seat=online?g.you:g.seats[me];if(!seat)return null;
  const nextOwner=online?'online:'+onlineRoomCode:match;
  const key=JSON.stringify([online,online?g.handNumber:match.handNumber,g.dealerSeat,g.roundWind,me,g.currentSeat,g.phase,g.turnDrawnTile,seat.hand,seat.points,seat.riichi,online?g.riichiDeclarationPending:seat.justDeclaredRiichi,g.seats.map(s=>[s.discards.length,s.melds.length]),online?g.wallCount:g.liveWall.length,online?g.reactionPrompt?.key:null]);
  const ready=online?fresh&&window.QueYeOnlineStatus?.phase==='connected':!!match.isHuman[me];
  return{g,me,seat,owner:nextOwner,key,ready,paused:online?(g.stagePresentation?.remainingMs||0)>0:QueYeMatchPause.attach(match).isPaused(),turn:g.currentSeat===me&&g.phase==='discard',riichi:!!seat.riichi,pending:online?g.riichiDeclarationPending:seat.justDeclaredRiichi,drawn:g.turnDrawnTile,hand:seat.hand,canTsumo:online?!!g.canTsumo:g.canDeclareTsumo(),ankan:online?g.ankanOptions||[]:g.canAnkan(me)};
 }
 function blocked(v){return !v?.ready||v.paused||document.hidden||byId('table-screen').classList.contains('hidden')||[...document.querySelectorAll('dialog')].some(d=>d.open);}
 function choiceMode(){return !!byId('human-actions')?.querySelector('[data-qy-riichi-cancel]');}
 function validSelection(v){return selected&&selected.owner===v?.owner&&selected.key===v.key&&v.turn&&v.hand.includes(selected.tile);}
 function paintSelection(){
  const v=view();if(!validSelection(v)||!prefs.confirmDiscard||blocked(v)||choiceMode())selected=null;
  document.querySelectorAll('#human-hand .htile').forEach(tile=>tile.classList.toggle('qy-discard-selected',!!selected&&tile.querySelector('[data-qy-tile]')?.dataset.qyTile===selected.tile));
  byId('qy-discard-choice')?.remove();
  if(!selected)return;
  const row=make('div','qy-discard-choice');row.id='qy-discard-choice';const tile=miniTileChip(selected.tile,false);tile.setAttribute('aria-hidden','true');
  const confirm=make('button','btn btn-primary','确认打出'),cancel=make('button','btn btn-ghost','取消选牌');confirm.type=cancel.type='button';confirm.dataset.qyDiscardConfirm='true';cancel.dataset.qyDiscardCancel='true';
  confirm.addEventListener('click',confirmSelection);cancel.addEventListener('click',()=>{selected=null;paintSelection();refresh();});row.append(tile,confirm,cancel);byId('human-actions').append(row);
 }
 function sendDiscard(v,tile){
  if(blocked(v)||!v.turn||!v.hand.includes(tile)||flight===v.key||v.pending||choiceMode())return false;
  if(v.riichi&&tile!==v.drawn)return false;
  if(!online&&!v.g.canDiscard(tile))return false;
  stop();selected=null;flight=v.key;
  if(online){if(!onlineSend({type:'discard',tile})){flight=null;return false;}}
  else match.humanDiscard(tile);
  paintSelection();return true;
 }
 function confirmSelection(){const v=view();if(validSelection(v))sendDiscard(v,selected.tile);else{selected=null;paintSelection();}}
 function pendingReaction(v){
  return reaction&&reaction.owner===v.owner&&reaction.engine===(online?state?.handNumber:match.engine)&&v.g.phase==='reaction'&&(online?v.g.reactionPrompt?.key===reaction.key:match._pendingHumanSeats.includes(reaction.seat))&&!byId('modal-reaction').classList.contains('hidden');
 }
 function paintReaction(){
  const v=view();if(!v||!pendingReaction(v))return;
  reaction.buttons.forEach(({button,call})=>{button.hidden=prefs.noCalls&&call;});
 }
 function refresh(){
  stop();const v=view();
  if(v&&(owner!==v.owner||lastKey!==v.key)){owner=v.owner;lastKey=v.key;flight=null;if(selected&&!validSelection(v))selected=null;}
  document.querySelectorAll('[data-qy-play-option]').forEach(b=>b.setAttribute('aria-pressed',String(prefs[b.dataset.qyPlayOption])));
  paintSelection();paintReaction();if(!v||blocked(v)||flight===v.key)return;
  let task=null;
  if(pendingReaction(v)&&policy.reaction(reaction.opts,prefs).pass){const current=reaction;task=()=>{const now=view();if(!blocked(now)&&reaction===current&&pendingReaction(now)&&policy.reaction(current.opts,prefs).pass&&flight!==now.key){flight=now.key;current.pass.click();}};}
  else if(!selected&&!choiceMode()&&policy.discard(v,prefs)){const key=v.key,who=v.owner;task=()=>{const now=view();if(now?.key===key&&now.owner===who&&policy.discard(now,prefs))sendDiscard(now,now.drawn);};}
  if(task)timer=setTimeout(()=>{timer=null;task();},450);
 }
 function bindReaction(opts,seat,key){
  const v=view();if(!v)return;
  const buttons=[...byId('reaction-buttons').querySelectorAll('button')];const calls=[...(opts.ron?[false]:[]),...(opts.kan?[true]:[]),...(opts.pon?[true]:[]),...(opts.chi||[]).map(()=>true),false];
  reaction={owner:v.owner,engine:online?state?.handNumber:match.engine,seat,key,opts,buttons:buttons.map((button,i)=>({button,call:calls[i]})),pass:buttons.at(-1)};refresh();
 }
 const localPrompt=showNextReactionPrompt;showNextReactionPrompt=function(...args){const item=reactionQueue[0];reaction=null;const result=localPrompt.apply(this,args);if(item)bindReaction(item.opts,item.seatIndex,'local-'+(++serial));else refresh();return result;};
 const remotePrompt=showOnlineReactionPrompt;showOnlineReactionPrompt=function(opts){const result=remotePrompt.call(this,opts);bindReaction(opts,state?.you.seat,state?.reactionPrompt?.key);return result;};
 const localRender=renderAll;renderAll=function(...args){online=false;const result=localRender.apply(this,args);refresh();return result;};
 const remoteRender=renderOnlineTable;renderOnlineTable=function(st){online=true;state=st;fresh=window.QueYeOnlineStatus?.phase==='connected';const result=remoteRender.call(this,st);refresh();return result;};
 window.addEventListener('click',event=>{
  const target=event.target.closest?.('#human-hand .htile,[data-qy-tsumogiri]');if(!target)return;
  const v=view();if(!v)return;
  if(blocked(v)||flight===v.key){event.preventDefault();event.stopImmediatePropagation();return;}
  if(!prefs.confirmDiscard||choiceMode()||target.getAttribute('aria-disabled')==='true')return;
  const tile=target.hasAttribute('data-qy-tsumogiri')?v.drawn:target.querySelector('[data-qy-tile]')?.dataset.qyTile;
  if(!v.turn||!tile||v.riichi&&tile!==v.drawn)return;
  event.preventDefault();event.stopImmediatePropagation();stop();
  if(validSelection(v)&&selected.tile===tile)confirmSelection();else{selected={tile,key:v.key,owner:v.owner};paintSelection();}
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&selected){selected=null;paintSelection();refresh();}});
 function set(next){prefs=policy.normalize({...prefs,...next});try{localStorage.setItem(storageKey,JSON.stringify(prefs));}catch(_){}refresh();}
 document.addEventListener('queye:connection-state',event=>{if(event.detail.phase!=='connected'){fresh=false;reaction=null;selected=null;flight=null;}refresh();});
 document.addEventListener('queye:stage-state',refresh);document.addEventListener('visibilitychange',refresh);
 document.addEventListener('DOMContentLoaded',()=>{
  const area=make('section','qy-play-options');area.id='qy-play-options';area.setAttribute('aria-label','打牌操作设置');const title=make('span','','操作设置'),help=make('span','qy-play-option-help','设置保存在这台设备；可以和牌时会停下来。');area.append(title);
  for(const [key,[label,hint]] of Object.entries(labels)){const button=make('button','qy-play-toggle',label);button.type='button';button.dataset.qyPlayOption=key;button.title=hint;button.setAttribute('aria-pressed',String(prefs[key]));button.addEventListener('click',()=>{set({[key]:!prefs[key]});help.textContent=(prefs[key]?'已开启：':'已关闭：')+hint;});area.append(button);}
  area.append(help);byId('qy-play-status').after(area);
  for(const id of ['btn-start-match','btn-mode-local','btn-mode-online','btn-back-mode-1','btn-back-mode-2'])byId(id)?.addEventListener('click',()=>{stop();reaction=null;selected=null;flight=null;fresh=false;},true);
 });
 window.QueYePlayOptions=Object.freeze({get:()=>({...prefs}),set,refresh});
})();
