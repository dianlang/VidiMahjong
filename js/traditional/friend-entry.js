/* Same-origin friend gateway metadata is supplied by the local hosting tool only. */
(() => {
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const path=document.querySelector('meta[name="queye-server-path"]')?.content;if(path!=='/ws')return;
  const endpoint=new URL(path,location.href);endpoint.protocol=location.protocol==='https:'?'wss:':'ws:';document.getElementById('server-url-input').value=endpoint.href;
  const room=new URL(location.href).searchParams.get('room');if(room&&/^[A-Z0-9]{4,8}$/.test(room)){document.getElementById('room-code-input').value=room;document.getElementById('btn-mode-online').click();}
  const card=document.getElementById('online-room-card'),button=document.createElement('button');button.type='button';button.className='btn btn-ghost';button.textContent='复制房间邀请';button.addEventListener('click',async()=>{
   if(!onlineRoomCode)return;const url=new URL('traditional.html',location.href);url.searchParams.set('room',onlineRoomCode);
   try{await navigator.clipboard.writeText(url.href);showToast('房间邀请已复制，发给朋友即可。');}catch(_){showToast('无法自动复制，请将当前试玩地址和房间号发给朋友。');}
  });card.append(button);
 });
})();
