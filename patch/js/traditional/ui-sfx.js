/* Optional local UI sounds. Uses the existing voice/SFX preference. */
(() => {
  'use strict';
  const clips=Object.fromEntries(['btn_click','btn_cancel','click_pai','discard_tile'].map(name=>{
    const audio=new Audio(`assets/sfx/majsoul/${name}.mp3`);audio.preload='none';audio.volume=.28;return [name,audio];
  }));
  let playing=null,last=null;
  function play(name){
    try{if(localStorage.getItem('vidimahjong-character-voice')==='off'||document.hidden)return;}catch(_){}
    if(playing){playing.pause();playing.currentTime=0;}
    playing=clips[name];playing.currentTime=0;playing.play().catch(()=>{});
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('button,a');if(!target||target.disabled)return;
    const cancel=target.matches('.qy-reference-close,.qy-portrait-close,[id^="btn-back"]');
    play(cancel?'btn_cancel':target.classList.contains('htile')?'click_pai':'btn_click');
  });
  document.addEventListener('pointerdown',event=>{
    const tile=event.target.closest?.('.htile');
    if(tile&&tile.getAttribute('aria-disabled')!=='true')play('click_pai');
  },{passive:true});
  document.addEventListener('queye:table-state',event=>{
    const state=event.detail;
    if(last&&last.online===state.online&&state.discardTotal>last.discardTotal)play('discard_tile');
    last=state;
  });
})();
