/* Explicit local test controls. Never sends a score or rule mutation to the server. */
(() => {
  'use strict';
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  let online=false;
  document.addEventListener('queye:table-state',e=>{if(typeof e.detail.online==='boolean')online=e.detail.online;});
  document.addEventListener('DOMContentLoaded',()=>{
    const dialog=make('dialog','qy-reference-dialog qy-test-dialog');dialog.id='qy-test-tools';dialog.setAttribute('aria-labelledby','qy-test-title');
    const header=make('div','qy-reference-head');const title=make('h2','','本地测试工具');title.id='qy-test-title';const close=make('button','qy-reference-close','×');close.type='button';close.setAttribute('aria-label','关闭测试工具');close.addEventListener('click',()=>dialog.close());header.append(title,close);dialog.append(header);
    const intro=make('p','qy-reference-intro','番符试算与本地演示。模拟输赢会改变当前本地对局；联机中不能修改房间点数。');dialog.append(intro);
    const columns=make('div','qy-test-columns');dialog.append(columns);
    const calculator=make('section','qy-test-section');calculator.append(make('h3','','番符点数试算'));columns.append(calculator);
    function field(parent,label,control){const wrap=make('label','qy-test-field');wrap.append(make('span','',label),control);parent.append(wrap);return control;}
    function select(options){const s=make('select');options.forEach(([value,label])=>{const o=make('option','',label);o.value=value;s.append(o);});return s;}
    function number(value,min,max,step=1){const n=make('input');n.type='number';n.value=value;n.min=min;n.max=max;n.step=step;return n;}
    const han=field(calculator,'番数',number(3,1,26));
    const fu=field(calculator,'符数',select([20,25,30,40,50,60,70,80,90,100,110].map(n=>[n,`${n} 符`])));fu.value='40';
    const dealer=field(calculator,'身份',select([['0','闲家'],['1','庄家']]));
    const win=field(calculator,'和牌方式',select([['ron','荣和'],['tsumo','自摸']]));
    const yakuman=field(calculator,'役满',select([[0,'普通番符'],[1,'单倍役满'],[2,'双倍役满'],[3,'三倍役满'],[4,'四倍役满']]));
    const result=make('output','qy-score-output');result.id='qy-score-calculation';result.setAttribute('aria-live','polite');calculator.append(result);
    calculator.append(make('p','qy-test-hint','仅按所填番符试算，不判断手牌是否有役或符数是否适用。13 番起按累计役满计算。'));
    function calculate(){
      const h=Number(han.value),f=Number(fu.value),y=Number(yakuman.value);
      if(!Number.isInteger(h)||h<1||h>26){result.textContent='请输入 1～26 番。';return;}
      const score=scorePoints({han:h,fu:f,yakuman:y>0,yakumanCount:y},{isDealer:dealer.value==='1',winType:win.value});
      result.replaceChildren(make('strong','',`${score.total.toLocaleString()} 点`));
      const payment=win.value==='ron'?`放铳者支付 ${score.payments.fromDiscarder.toLocaleString()} 点`:dealer.value==='1'?`每位闲家支付 ${score.payments.fromEachNonDealer.toLocaleString()} 点`:`庄家支付 ${score.payments.fromDealer.toLocaleString()} 点，另两位各支付 ${score.payments.fromEachNonDealer.toLocaleString()} 点`;
      result.append(make('span','',payment));
    }
    calculator.addEventListener('input',calculate);calculator.addEventListener('change',calculate);calculate();
    const simulation=make('section','qy-test-section');simulation.append(make('h3','','立绘与输赢模拟'));columns.append(simulation);
    const loser=field(simulation,'失分座位',select(['东家','南家','西家','北家'].map((n,i)=>[i,n])));
    const winner=field(simulation,'得分座位',select(['东家','南家','西家','北家'].map((n,i)=>[i,n])));winner.value='1';
    const amount=field(simulation,'转移点数',number(3000,100,100000,100));
    const presets=make('div','qy-test-presets');simulation.append(presets);
    [1000,3000,8000,15000,25000].forEach(n=>{const b=make('button','qy-filter',n.toLocaleString());b.type='button';b.addEventListener('click',()=>{amount.value=n;});presets.append(b);});
    const message=make('output','qy-test-message');message.id='qy-test-message';message.setAttribute('aria-live','polite');
    const apply=make('button','btn btn-primary','应用一次输赢');apply.type='button';apply.addEventListener('click',()=>{
      if(online){message.textContent='联机房间不能修改点数，请使用本地测试局。';return;}
      if(typeof match==='undefined'||!match?.engine){message.textContent='请先点击下方按钮，启动本地测试局。';return;}
      const from=Number(loser.value),to=Number(winner.value),delta=Number(amount.value);
      if(from===to){message.textContent='失分座位和得分座位不能相同。';return;}
      if(!Number.isInteger(delta)||delta<100||delta>100000||delta%100){message.textContent='请输入 100～100000 之间的整百点数。';return;}
      match.engine.seats[from].points-=delta;match.engine.seats[to].points+=delta;
      match.points=match.engine.seats.map(s=>s.points);renderAll();
      message.textContent=`已转移 ${delta.toLocaleString()} 点。四家：${match.points.map(n=>n.toLocaleString()).join(' / ')}；合计 ${match.points.reduce((a,b)=>a+b,0).toLocaleString()}。`;
    });simulation.append(apply,message);
    const start=make('button','btn btn-secondary','新开本地测试局');start.type='button';start.addEventListener('click',()=>{
      if(online){message.textContent='请先返回大厅并退出联机，再新开本地测试局。';return;}
      if(typeof match!=='undefined'&&match)match.stop();
      reactionQueue.length=0;reactionModalOpen=false;closeAllModals();
      document.getElementById('btn-mode-local').click();document.getElementById('btn-start-match').click();message.textContent='新的本地测试局已开始，累计失分和阶段已重置。';
    });simulation.append(start,make('p','qy-test-hint','新开测试局会替换当前本地对局。输赢转移保持总点数不变，可连续模拟跨越 3000 / 8000 / 15000 / 25000 的累计失分阈值。'));
    const music=make('section','qy-test-section qy-test-music');music.append(make('h3','','BGM 切换试听'),make('p','qy-test-hint','需要自行放入 table.mp3 和 riichi.mp3。试听不宣告立直，下一次牌局刷新会按真实立直状态接管。'));dialog.append(music);
    [false,true].forEach(riichi=>{const b=make('button','qy-filter',riichi?'立直 BGM':'普通 BGM');b.type='button';b.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('queye:bgm-preview',{detail:{riichi}})));music.append(b);});
    document.body.append(dialog);let opener=null;dialog.addEventListener('close',()=>opener?.focus());
    document.querySelectorAll('.qy-tools,#mode-select-screen .menu-buttons,#setup-screen .menu-buttons').forEach(parent=>{
      const button=make('button',parent.classList.contains('qy-tools')?'qy-tool':'btn btn-ghost','测试工具');button.type='button';button.addEventListener('click',()=>{opener=button;dialog.showModal();});parent.append(button);
    });
  });
})();
