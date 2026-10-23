(() => {
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  if(!['127.0.0.1','localhost'].includes(location.hostname))return;
  for(const parent of document.querySelectorAll('#mode-select-screen .menu-buttons,#setup-screen .menu-buttons')){
   const link=document.createElement('a');link.className='btn btn-ghost';link.textContent='素材管理';link.href='http://127.0.0.1:8766/asset-manager.html';link.target='_blank';link.rel='noopener';link.title='首次使用请双击游戏目录的 start-asset-manager.bat';parent.append(link);
  }
 });
})();
