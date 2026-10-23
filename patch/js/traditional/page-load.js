/* Show a readable menu while ordered game scripts are still downloading. */
(() => {
 'use strict';
 let failed=false,ready=false,slow=null;
 const buttons=()=>document.querySelectorAll('#btn-mode-local,#btn-mode-online');
 function note(message,retry=false){const box=document.getElementById('qy-page-load');if(!box)return;box.hidden=false;box.querySelector('span').textContent=message;box.querySelector('button').hidden=!retry;}
 window.addEventListener('error',event=>{if(event.target?.tagName==='SCRIPT'){failed=true;note('页面资源尚未加载完成，请重新加载。',true);}},true);
 document.addEventListener('click',event=>{if(event.target.closest?.('[data-qy-page-retry]'))location.reload();});
 slow=setTimeout(()=>{if(!ready)note('加载较慢，正在准备牌桌……',true);},12000);
 document.addEventListener('DOMContentLoaded',()=>{
  ready=!failed&&typeof I18N==='object'&&!!I18N.zh&&typeof LocalMatch==='function'&&!!window.QueYeCharacters&&!!window.QueYeOnlineConnection&&!!window.QueYePlayOptions;
  window.QueYePageReady=ready;clearTimeout(slow);
  if(!ready){note('页面资源尚未加载完成，请重新加载。',true);return;}
  for(const button of buttons())button.disabled=false;
  const box=document.getElementById('qy-page-load');if(box)box.hidden=true;
 },{once:true});
})();
