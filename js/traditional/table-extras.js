/* Public table views, tile artwork and the fixed rules guide. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const make = (tag, cls, text) => { const e=document.createElement(tag); if(cls)e.className=cls; if(text)e.textContent=text; return e; };
  const winds={wE:'东家',wS:'南家',wW:'西家',wN:'北家'};
  const art = Object.fromEntries(['m','p','s'].flatMap((s,i)=>Array.from({length:9},(_,n)=>[`${s}${n+1}`,`${['Man','Pin','Sou'][i]}${n+1}`])));
  Object.assign(art,{wE:'Ton',wS:'Nan',wW:'Shaa',wN:'Pei',dR:'Chun',dG:'Hatsu',dW:'Haku'});
  const originalFace=tileFaceHTML;
  tileFaceHTML = function(id) { return art[id] ? `<img class="qy-tile-svg" data-qy-tile="${id}" src="assets/tiles/Regular/${art[id]}.svg" alt="" draggable="false">` : originalFace(id); };
  function tileName(id){
    const t=TILE_TYPES_BY_ID[id];
    return t?.category==='suit' ? `${['','一','二','三','四','五','六','七','八','九'][t.rank]}${{characters:'万',circle:'筒',bamboo:'索'}[t.suit]}` : ({wE:'东风',wS:'南风',wW:'西风',wN:'北风',dR:'红中',dG:'发财',dW:'白板'}[id] || '牌');
  }
  let publicView=null;
  let online=false;
  let opener=null;
  function dialog(id,title){
    const d=make('dialog','qy-reference-dialog');d.id=id;
    const head=make('div','qy-reference-head');const h=make('h2','',title);h.id=`${id}-title`;d.setAttribute('aria-labelledby',h.id);
    const close=make('button','qy-reference-close','×');close.type='button';close.setAttribute('aria-label','关闭');close.addEventListener('click',()=>d.close());head.append(h,close);d.append(head);
    d.addEventListener('close',()=>opener?.focus());document.body.append(d);return d;
  }
  function show(d,button){opener=button;if(!d.open)d.showModal();}
  function addButton(parent,label,action,cls='qy-tool'){
    const b=make('button',cls,label);b.type='button';b.addEventListener('click',()=>action(b));parent?.append(b);return b;
  }
  function init(){
    const guide=dialog('qy-yaku-guide','役种说明');
    guide.append(make('p','qy-reference-intro','本游戏当前的役种与番数。门清：未吃、碰或明杠；暗杠不破坏门清。'));
    const search=make('input','qy-yaku-search');search.type='search';search.placeholder='搜索役种、番数或条件';search.setAttribute('aria-label','搜索役种');guide.append(search);
    const filters=make('div','qy-yaku-filters');guide.append(filters);let active='全部';
    const list=make('div','qy-yaku-list');guide.append(list);
    const paint=()=>{
      const term=search.value.trim();const entries=QUEYE_YAKU_CATALOG.filter(y=>{
        const group=y.closed===13?'役满':y.closed===1?'1番':y.closed===2?'2番':'3番以上';
        return (active==='全部'||active===group)&&`${y.name} ${y.description} ${y.note} ${y.closed}番`.includes(term);
      });
      list.replaceChildren(...entries.map(y=>{
        const row=make('article','qy-yaku-row');const top=make('div','qy-yaku-title');
        const value=y.closed===13?'役满':`${y.closed}番${y.open===null?' · 门清限定':y.open!==y.closed?` · 副露${y.open}番`:' · 可副露'}`;
        top.append(make('h3','',y.name),make('span','qy-yaku-value',value));row.append(top,make('p','',y.description));if(y.note)row.append(make('small','qy-yaku-note',y.note));return row;
      }));if(!entries.length)list.append(make('p','qy-reference-intro','没有找到匹配的役种。'));
      filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===active)));
    };
    ['全部','1番','2番','3番以上','役满'].forEach(name=>addButton(filters,name,()=>{active=name;paint();},'qy-filter'));
    search.addEventListener('input',paint);paint();
    const details=make('details','qy-yaku-scope');details.append(make('summary','','本版规则范围与简化'));
    details.append(make('p','','宝牌与里宝牌只加番，不能单独构成役。双倍役满变体按单倍处理；七对子自摸、一杯口和三色等识别范围的区别已标在对应条目。'));
    details.append(make('p','','本版未实现：二杯口、混老头、三杠子、小四喜、大四喜、九莲宝灯、天和、地和、流局满贯。役种以本版判定为准。'));
    guide.append(details);
    const credit=make('p','qy-art-credit','牌面素材：');const link=make('a','','FluffyStuff · CC0');link.href='https://github.com/FluffyStuff/riichi-mahjong-tiles';link.target='_blank';link.rel='noopener noreferrer';credit.append(link);guide.append(credit);
    const rivers=dialog('qy-rivers-dialog','四家牌河');rivers.append(make('p','qy-reference-intro','按弃牌顺序排列，每行六张。被吃碰的牌移入副露，不留在牌河；金边为当前待响应的弃牌。'));
    const grid=make('div','qy-river-grid');grid.id='qy-river-grid';rivers.append(grid);
    document.querySelectorAll('#setup-screen .menu-buttons,#online-lobby-screen>.menu-content>.menu-buttons,#mode-select-screen .menu-buttons').forEach(parent=>addButton(parent,'役种说明',b=>show(guide,b),'btn btn-ghost'));
    const tools=document.querySelector('.qy-tools');addButton(tools,'役种',b=>show(guide,b));addButton(tools,'牌河',b=>{paintRivers();show(rivers,b);});
    document.addEventListener('error',event=>{
      const image=event.target;if(!image?.matches?.('.qy-tile-svg'))return;
      const id=Object.keys(art).find(key=>image.getAttribute('src')?.endsWith(`/${art[key]}.svg`));
      if(id){const span=make('span','qy-tile-fallback');span.dataset.qyTile=id;span.innerHTML=originalFace(id);image.replaceWith(span);}
    },true);
  }
  function chip(id,latest=false){const c=miniTileChip(id,false);c.title=tileName(id);c.setAttribute('aria-label',tileName(id));c.classList.toggle('is-latest-discard',latest);return c;}
  function paintRivers(){
    const grid=el('qy-river-grid');if(!grid)return;grid.replaceChildren();
    if(!publicView){grid.append(make('p','qy-reference-intro','开始对局后，四家的弃牌会显示在这里。'));return;}
    publicView.seats.forEach((seat,i)=>{
      const section=make('section','qy-river-section');const widget=document.querySelector(`.character-widget[data-character-seat="${i}"]`);const name=widget?.querySelector('.character-name')?.textContent||'';
      section.append(make('h3','',`${winds[seat.wind]} · ${name}`),make('small','qy-river-count',`${seat.discards.length} 张弃牌${seat.riichi?' · 已立直':''}`));
      const pile=make('div','qy-river-pile');pile.setAttribute('aria-label',`${winds[seat.wind]}牌河`);
      seat.discards.forEach((d,index)=>pile.append(chip(d.tile,publicView.phase==='reaction'&&publicView.lastDiscard?.seat===i&&index===seat.discards.length-1)));
      if(!seat.discards.length)pile.append(make('span','qy-river-empty','尚未弃牌'));section.append(pile);
      if(seat.melds?.length){section.append(make('small','qy-river-count','副露'));const melds=make('div','qy-river-melds');seat.melds.forEach(m=>{const group=make('div','qy-meld-group');m.tiles.forEach(t=>group.append(chip(t)));melds.append(group);});section.append(melds);}
      grid.append(section);
    });
  }
  function update(st){
    const game=!online&&typeof match!=='undefined'?match?.engine:null;
    publicView=st||(game?{seats:game.seats,lastDiscard:game.lastDiscard,phase:game.phase,matchOver:match.matchOver}:null);
    if(!publicView)return;
    const me=online?st.you.seat:viewSeat;
    document.querySelectorAll('#opponents-row .opponent-panel').forEach((panel,index)=>{
      const seat=publicView.seats[(me+index+1)%4];const pile=panel.querySelector('.opponent-discards');
      pile.dataset.riverLabel=`${winds[seat.wind]}牌河 · ${seat.discards.length}`;
      pile.setAttribute('aria-label',pile.dataset.riverLabel);decoratePile(pile,seat,publicView.lastDiscard?.seat===(me+index+1)%4);
    });
    const own=el('human-discards');own.dataset.riverLabel=`你的牌河 · ${publicView.seats[me].discards.length}`;own.setAttribute('aria-label',own.dataset.riverLabel);decoratePile(own,publicView.seats[me],publicView.lastDiscard?.seat===me);
    if(el('qy-rivers-dialog')?.open)paintRivers();
    document.dispatchEvent(new CustomEvent('queye:table-state',{detail:{online,discardTotal:publicView.seats.reduce((sum,s)=>sum+s.discards.length,0),riichi:!publicView.matchOver&&publicView.seats.some(s=>s.riichi)}}));
  }
  function decoratePile(pile,seat,current){
    Array.from(pile.children).forEach((tile,i)=>{tile.title=tileName(seat.discards[i]?.tile);tile.setAttribute('aria-label',tile.title);tile.classList.toggle('is-latest-discard',current&&publicView.phase==='reaction'&&i===seat.discards.length-1);});
  }
  const local=renderAll;renderAll=function(...args){online=false;const result=local.apply(this,args);update();return result;};
  const remote=renderOnlineTable;renderOnlineTable=function(st){online=true;const result=remote.call(this,st);update(st);return result;};
  document.addEventListener('DOMContentLoaded',init);
})();
