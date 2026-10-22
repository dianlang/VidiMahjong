/* Visual-only dora marking. Reuses the fixed engine's indicator mapping. */
(() => {
  'use strict';
  let dora=new Set();
  const name=id=>{
    const tile=TILE_TYPES_BY_ID[id];
    return tile?.category==='suit'?`${['','一','二','三','四','五','六','七','八','九'][tile.rank]}${{characters:'万',circle:'筒',bamboo:'索'}[tile.suit]}`:({wE:'东风',wS:'南风',wW:'西风',wN:'北风',dR:'红中',dG:'发财',dW:'白板'}[id]||id);
  };
  function decorate(){
    document.querySelectorAll('.htile,.mini-tile-chip').forEach(tile=>{
      if(tile.closest('.qy-dora,.qy-actual-dora'))return;
      const id=tile.querySelector('[data-qy-tile]')?.dataset.qyTile;
      const marked=dora.has(id);tile.classList.toggle('qy-is-dora',marked);
      if(!id)return;
      tile.title=name(id)+(marked?' · 宝牌':'');
      if(tile.getAttribute('aria-hidden')!=='true'){
        const base=tile.dataset.qyDoraLabel||(tile.getAttribute('aria-label')||name(id));
        tile.dataset.qyDoraLabel=base;tile.setAttribute('aria-label',base+(marked?' · 宝牌':''));
      }
    });
  }
  function update(indicators){
    dora=new Set((indicators||[]).filter(id=>TILE_TYPES_BY_ID[id]).map(id=>RiichiEngine.prototype.doraTypeFor.call(null,id)));
    let summary=document.getElementById('qy-actual-dora');
    if(!summary){summary=document.createElement('div');summary.id='qy-actual-dora';summary.className='qy-actual-dora';document.querySelector('.qy-dora')?.insertAdjacentElement('afterend',summary);}
    summary.replaceChildren();const label=document.createElement('small');label.textContent='当前宝牌';summary.append(label);
    for(const id of dora){const chip=miniTileChip(id,false);chip.title=`${name(id)} · 宝牌`;chip.setAttribute('aria-label',chip.title);summary.append(chip);}
    decorate();
  }
  const local=renderAll;renderAll=function(...args){const result=local.apply(this,args);if(typeof match!=='undefined'&&match?.engine)update(match.engine.doraIndicators());return result;};
  const remote=renderOnlineTable;renderOnlineTable=function(st){const result=remote.call(this,st);update(st.dora);return result;};
  const modal=openModal;openModal=function(...args){const result=modal.apply(this,args);decorate();return result;};
  document.addEventListener('click',decorate);
})();
