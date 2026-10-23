/* Bind the reconnect controller to the existing UI and server-authoritative views. */
(() => {
 'use strict';
 let controller=null,promptKey=null,lastStatus={phase:'idle'},notice=null,hideTimer=null,lobbyStatus=null,lobbyRetry=null;
 const storageKey='queye:online-session';
 function controls(){
  const active=!!onlineRoomCode,ready=active&&lastStatus.phase==='connected';
  document.getElementById('btn-start-online').disabled=!ready;
  document.getElementById('btn-start-online').title=ready?'人齐后开始对局':'等待连接同步完成后再开始';
  for(const id of ['btn-create-room','btn-join-room'])document.getElementById(id).disabled=['connecting','joining','restoring'].includes(lastStatus.phase);
  if(lobbyStatus){lobbyStatus.dataset.phase=lastStatus.phase;lobbyStatus.querySelector('span').textContent=ready?'连接正常 · 等待玩家加入':lastStatus.phase==='lost'?'原房间已失效，请返回大厅':lastStatus.phase==='idle'?'尚未加入房间':'正在连接或恢复房间，请稍候……';lobbyRetry.hidden=!active||!['retrying','stopped','disconnected'].includes(lastStatus.phase);}
 }
 function resetRoomView(){
  document.getElementById('online-room-card').classList.add('hidden');document.getElementById('online-connect-card').classList.remove('hidden');
  document.getElementById('room-code-display').textContent='';document.getElementById('lobby-seats').replaceChildren();document.getElementById('btn-start-online').classList.add('hidden');
 }
 function message(st){
  if(st.type==='joined'){onlineSeat=st.seat;onlineRoomCode=st.code;}
  const result=handleOriginal(st);
  if(st.type==='state'){
   if(st.reactionPrompt&&st.reactionPrompt.key!==promptKey){promptKey=st.reactionPrompt.key;showOnlineReactionPrompt(st.reactionPrompt.opts);}
   else if(!st.reactionPrompt){promptKey=null;if(!document.getElementById('modal-reaction').classList.contains('hidden'))closeAllModals();}
  }
  controls();return result;
 }
 const handleOriginal=handleServerMessage;
 function announce(detail){
  lastStatus=detail;window.QueYeOnlineStatus=detail;
  controls();
  if(detail.phase!=='connected'&&onlineRoomCode){promptKey=null;closeAllModals();document.getElementById('qy-riichi-confirm')?.close();}
  document.dispatchEvent(new CustomEvent('queye:connection-state',{detail}));
  if(!notice)return;
  clearTimeout(hideTimer);
  const text={idle:'',connecting:'连接牌桌中……',joining:'正在进入房间……',restoring:'正在恢复原来的牌局……',connected:'已连接 · 牌局已同步',retrying:`连接中断，正在重连（第 ${detail.attempt+1} 次）……`,stopped:'暂时无法连接，可点击重新连接',disconnected:'连接未成功，请检查服务器地址',lost:'原房间已结束或无法恢复，请返回大厅'}[detail.phase]||'';
  notice.querySelector('span').textContent=text;notice.hidden=!text;
  notice.querySelector('button').hidden=!['retrying','stopped','lost'].includes(detail.phase);
  notice.querySelector('button').textContent=detail.phase==='lost'?'返回大厅':'重新连接';
  document.getElementById('online-status').textContent=text;
  if(detail.phase==='connected')hideTimer=setTimeout(()=>{notice.hidden=true;},3000);
 }
 function get(){
  if(controller)return controller;
  controller=QueYeReconnect.create({WebSocket:window.WebSocket,onMessage:message,onStatus:announce,onSocket:s=>{onlineSocket=s;},save:value=>{try{if(value?.code)sessionStorage.setItem(storageKey,JSON.stringify(value));else sessionStorage.removeItem(storageKey);}catch(_){}}});
  return controller;
 }
 onlineConnect=function(url){promptKey=null;onlineRoomCode=null;onlineSeat=null;onlineLastState=null;resetRoomView();return get().connect(url);};
 onlineSend=function(payload){const sent=get().send(payload);if(!sent&&!['create','join'].includes(payload.type))showToast('连接恢复后再操作，刚才的动作没有发送。');return sent;};
 // The old connection handler is superseded; callbacks from old sockets are ignored by generation.
 wireSocketHandlers=function(){};
 window.QueYeOnlineConnection=Object.freeze({retry:()=>get().retry(),leave:()=>{if(onlineRoomCode)document.getElementById('room-code-input').value=onlineRoomCode;onlineRoomCode=null;onlineSeat=null;onlineLastState=null;promptKey=null;get().leave();resetRoomView();controls();},get status(){return lastStatus;}});
 document.addEventListener('DOMContentLoaded',()=>{
  const card=document.getElementById('online-room-card');lobbyStatus=document.createElement('div');lobbyStatus.className='qy-room-connection';lobbyStatus.id='qy-room-connection';lobbyStatus.setAttribute('role','status');lobbyStatus.setAttribute('aria-live','polite');
  const lobbyText=document.createElement('span');lobbyRetry=document.createElement('button');lobbyRetry.type='button';lobbyRetry.className='btn btn-ghost';lobbyRetry.textContent='重新连接';lobbyRetry.hidden=true;lobbyRetry.addEventListener('click',()=>get().retry());lobbyStatus.append(lobbyText,lobbyRetry);document.getElementById('room-code-display').after(lobbyStatus);
  const actions=document.createElement('div');actions.className='qy-room-actions';const exit=document.createElement('button');exit.id='qy-exit-room';exit.type='button';exit.className='btn btn-ghost';exit.textContent='退出房间';exit.title='断开当前连接，可凭房间码重新加入';exit.addEventListener('click',()=>{window.QueYeOnlineConnection.leave();showToast('已退出房间，可创建新房间或重新加入。');});actions.append(document.getElementById('btn-start-online'),exit);card.append(actions);controls();
  notice=document.createElement('div');notice.className='qy-connection-notice';notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const text=document.createElement('span'),button=document.createElement('button');button.type='button';button.addEventListener('click',()=>{
   if(lastStatus.phase==='lost'){window.QueYeOnlineConnection.leave();document.getElementById('table-screen').classList.add('hidden');document.getElementById('online-lobby-screen').classList.remove('hidden');document.getElementById('online-room-card').classList.add('hidden');document.getElementById('online-connect-card').classList.remove('hidden');}
   else get().retry();
  });notice.append(text,button);document.body.append(notice);
  function returnToMenu(event){
   event.preventDefault();window.QueYeOnlineConnection.leave();window.QueYeStageShow?.cancel('local');window.QueYeStageShow?.cancel('online');window.QueYeVoices?.reset();if(typeof match!=='undefined'&&match){match.stop();match=null;}
   closeAllModals();document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
   for(const id of ['table-screen','setup-screen','online-lobby-screen'])document.getElementById(id).classList.add('hidden');document.getElementById('mode-select-screen').classList.remove('hidden');document.dispatchEvent(new CustomEvent('queye:menu'));
  }
  document.querySelectorAll('a[data-i18n="backToMenu"],.qy-brand,.table-header a[aria-label="menu"],#modal-match-end a[href="traditional.html"]').forEach(link=>{link.setAttribute('href','traditional.html');link.addEventListener('click',returnToMenu);});
  for(const id of ['btn-mode-local','btn-back-mode-2','btn-start-match'])document.getElementById(id)?.addEventListener('click',()=>window.QueYeOnlineConnection.leave(),true);
  window.addEventListener('online',()=>{if(['retrying','stopped','disconnected'].includes(lastStatus.phase))get().retry();});
  try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(saved&&/^wss?:\/\//.test(saved.url)){onlinePlayerId=saved.playerId;get().restore(saved);}}catch(_){}
 });
})();
