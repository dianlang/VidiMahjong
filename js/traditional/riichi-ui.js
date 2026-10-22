/* Clear declaration selection and a visible hand lock after riichi. */
(() => {
  'use strict';
  let online=false,state=null,choosing=false,selection=null,stamp='',dialog=null;
  const byId=id=>document.getElementById(id);
  const tileId=tile=>tile?.querySelector('[data-qy-tile]')?.dataset.qyTile;
  function view(){
    if(online)return state?{seat:state.you,me:state.you.seat,turn:state.currentSeat===state.you.seat&&state.phase==='discard',drawn:state.turnDrawnTile,options:state.riichiDiscardOptions||[],pending:state.riichiDeclarationPending}:null;
    if(typeof match==='undefined'||!match?.engine)return null;
    const game=match.engine,pending=game.seats[viewSeat].justDeclaredRiichi;
    const options=pending?Array.from(new Set(game.seats[viewSeat].hand)).filter(tile=>game.canDiscard(tile)):game.riichiDiscardOptions(viewSeat);
    return {seat:game.seats[viewSeat],me:viewSeat,turn:game.currentSeat===viewSeat&&game.phase==='discard',drawn:game.turnDrawnTile,options,pending};
  }
  function update(){
    const v=view();if(!v)return;
    const key=[online,v.me,v.turn,v.drawn,v.seat.riichi,v.seat.hand.join(',')].join('|');
    if(key!==stamp){stamp=key;choosing=false;selection=null;if(dialog?.open)dialog.close();}
    if(v.pending)choosing=true;
    const tiles=Array.from(byId('human-hand').querySelectorAll('.htile'));
    let drawn=null;
    for(const tile of tiles){tile.classList.remove('is-just-drawn');if(v.turn&&tileId(tile)===v.drawn)drawn=tile;}
    if(drawn){drawn.classList.add('is-just-drawn');byId('human-hand').append(drawn);}
    const locked=v.seat.riichi&&!v.pending;
    for(const tile of tiles){
      const allowed=v.turn&&(!choosing&&!locked||choosing&&v.options.includes(tileId(tile))||locked&&tile===drawn);
      tile.classList.toggle('qy-tile-locked',v.turn&&!allowed);tile.classList.toggle('qy-riichi-choice',choosing&&allowed);
      tile.setAttribute('aria-disabled',String(!allowed));tile.tabIndex=allowed?0:-1;
    }
    const actions=byId('human-actions');
    actions.querySelectorAll('[data-qy-riichi-cancel],[data-qy-tsumogiri]').forEach(b=>b.remove());
    Array.from(actions.querySelectorAll('button')).forEach(button=>{
      if(button.textContent===t('riichiBtn')||button.dataset.qyRiichiStart){button.dataset.qyRiichiStart='true';button.textContent=choosing?'立直 · 选择高亮舍牌':'立直 · 选择舍牌';button.classList.add('qy-riichi-button');button.setAttribute('aria-pressed',String(choosing));}
    });
    if(choosing){const cancel=document.createElement('button');cancel.type='button';cancel.className='btn btn-ghost';cancel.dataset.qyRiichiCancel='true';cancel.textContent='取消立直';actions.append(cancel);byId('turn-hint').textContent='请选择高亮舍牌 · 确认后支付 1000 点并锁定手牌';}
    else if(locked){byId('turn-hint').textContent=v.turn?'立直中 · 手牌已锁定，只能打出右侧摸牌（摸切）或自摸和牌':'立直中 · 等待下一次摸牌';
      if(v.turn){const button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.dataset.qyTsumogiri='true';button.textContent='摸切';actions.append(button);}
    }
    byId('human-riichi-badge').textContent='立直 · 手牌锁定';
    const discards=online?state.seats:match.engine.seats;
    discards.forEach((seat,index)=>{
      const pile=index===v.me?byId('human-discards'):document.querySelectorAll('#opponents-row .opponent-discards')[(index-v.me+3)%4];
      if(pile)Array.from(pile.children).forEach((tile,i)=>tile.classList.toggle('qy-riichi-discard',!!seat.discards[i]?.riichiDeclaration));
    });
  }
  function makeDialog(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.className='qy-reference-dialog qy-riichi-confirm';dialog.id='qy-riichi-confirm';dialog.setAttribute('aria-labelledby','qy-riichi-confirm-title');
    dialog.innerHTML='<h2 id="qy-riichi-confirm-title">确认立直</h2><p>打出这张牌，支付 1000 点立直。</p><div class="qy-riichi-preview"></div><p>听牌</p><div class="qy-riichi-waits"></div><p>立直后手牌锁定，后续只能摸切或和牌。</p><div class="qy-riichi-confirm-actions"><button type="button" class="btn btn-ghost" data-qy-confirm-back>返回选牌</button><button type="button" class="btn btn-primary" data-qy-confirm-riichi>立直并打出</button></div>';
    dialog.querySelector('[data-qy-confirm-back]').addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-qy-confirm-riichi]').addEventListener('click',()=>{
      const v=view(),tile=selection;if(!v||!v.options.includes(tile)){dialog.close();choosing=false;update();return;}
      if(!online&&QueYeMatchPause.attach(match).isPaused())return;
      dialog.close();choosing=false;selection=null;
      if(online)onlineSend({type:'riichi',tile});else QueYeRiichiRules.declareAndDiscard(match,v.me,tile);
      update();
    });document.body.append(dialog);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-qy-riichi-start],[data-qy-riichi-cancel],[data-qy-tsumogiri]');
    if(button){event.preventDefault();event.stopImmediatePropagation();const v=view();if(!v)return;
      if(button.hasAttribute('data-qy-tsumogiri')){if(online)onlineSend({type:'discard',tile:v.drawn});else match.humanDiscard(v.drawn);return;}
      choosing=button.hasAttribute('data-qy-riichi-start')?!choosing:false;update();return;
    }
    const tile=event.target.closest?.('#human-hand .htile');if(!tile)return;
    if(tile.getAttribute('aria-disabled')==='true'){event.preventDefault();event.stopImmediatePropagation();return;}
    if(choosing){event.preventDefault();event.stopImmediatePropagation();selection=tileId(tile);makeDialog();const preview=dialog.querySelector('.qy-riichi-preview');preview.replaceChildren(miniTileChip(selection,false));const v=view();const waits=RiichiEngine.prototype.riichiWaitsForDiscard.call({seats:{[v.me]:v.seat}},v.me,selection);dialog.querySelector('.qy-riichi-waits').replaceChildren(...waits.map(id=>miniTileChip(id,false)));dialog.showModal();}
  },true);
  const local=renderAll;renderAll=function(...args){online=false;const result=local.apply(this,args);update();return result;};
  const remote=renderOnlineTable;renderOnlineTable=function(st){online=true;state=st;const result=remote.call(this,st);update();return result;};
})();
