/* Presentation cues derived only from accepted game events and published results. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.QueYeVoiceEvents=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const events=Object.freeze(['match_start','hand_start','chi','pon','kan','riichi','ron','tsumo','pass','tenpai','noten','ryuukyoku','win_small','mangan','haneman','baiman','sanbaiman','yakuman','ippatsu','rinshan','stage_1','stage_2','stage_3','stage_4','stage_5','match_victory','match_defeat','rank_1','rank_2','rank_3','rank_4','opponent_riichi','deal_in','close_call','rematch']);
  function tier(result){
    const base=Number(result.base)||0,han=Number(result.han)||0;
    return result.yakuman||han>=13||base>=8000?'yakuman':han>=11||base>=6000?'sanbaiman':han>=8||base>=4000?'baiman':han>=6||base>=3000?'haneman':han>=5||base>=2000?'mangan':'win_small';
  }
  function createTracker(){
    let engine=null,hand=0,started=false,ranked=false;
    const ended=new WeakSet(),riichi=new Set();
    function observe(event,match,losses=[]){
      const g=match.engine;if(!g)return [];
      const out=[];
      const add=(name,seat,extra={})=>out.push({event:name,seat,hand,...extra});
      if(event.type==='hand-start'){
        if(engine===g)return out;engine=g;hand++;riichi.clear();
        add(started?'hand_start':'match_start',-1,{audience:'viewer'});started=true;
      }else if(event.type==='riichi'&&g.seats[event.seat]?.riichi&&!riichi.has(event.seat)){
        riichi.add(event.seat);add('riichi',event.seat);
        add('opponent_riichi',event.seat,{audience:'others'});
      }else if(event.type==='called'){
        const name={chi:'chi',pon:'pon',daiminkan:'kan',ankan:'kan',shouminkan:'kan'}[event.kind];
        if(name)add(name,event.seat);
      }else if(event.type==='kan')add('kan',event.seat);
      else if(event.type==='voice-pass')add('pass',event.seat,{audience:'self',privateSeat:event.seat});
      else if(event.type==='hand-end'&&g.phase==='ended'&&!ended.has(g)){
        ended.add(g);const result=g.result;
        if(result?.type==='exhaustive'){
          add('ryuukyoku',-1,{audience:'viewer',afterStage:true});
          for(let seat=0;seat<4;seat++)add(result.tenpaiSeats.includes(seat)?'tenpai':'noten',seat,{audience:'self',afterStage:true});
        }else if(result&&['ron','tsumo'].includes(result.type)){
          const winners=result.type==='ron'?result.winners:[result];
          for(const winner of winners){
            add(result.type,winner.seat);
            add(tier(winner),winner.seat,{afterStage:true});
            const names=(winner.yakuList||[]).map(y=>y.name);
            if(names.includes('Ippatsu'))add('ippatsu',winner.seat,{afterStage:true});
            if(names.includes('Rinshan Kaihou'))add('rinshan',winner.seat,{afterStage:true});
          }
          if(result.type==='ron'){
            add('deal_in',result.discarder,{afterStage:true});
            for(let seat=0;seat<4;seat++)if(seat!==result.discarder&&!winners.some(w=>w.seat===seat))add('close_call',seat,{audience:'self',afterStage:true});
          }
        }
      }else if(event.type==='match-end'&&match.matchOver&&!ranked){
        ranked=true;
        const order=[0,1,2,3].sort((a,b)=>match.points[b]-match.points[a]||a-b);
        order.forEach((seat,index)=>{
          add(`rank_${index+1}`,seat,{audience:'self',afterStage:true});
          if(index===0)add('match_victory',seat,{audience:'self',afterStage:true});
          if(index===3){
            if(Number(losses[seat])>=25000)add('stage_5',seat,{audience:'self',afterStage:true});
            add('match_defeat',seat,{audience:'self',afterStage:true});
          }
        });
      }
      return out;
    }
    return Object.freeze({observe,get hand(){return hand;}});
  }
  const bound=new WeakSet();
  function bindPass(match,notify){
    if(bound.has(match))return;bound.add(match);
    const original=match.humanReact;
    match.humanReact=function(seat,action){
      const accepted=action==='pass'&&this.engine?.phase==='reaction'&&this._pendingHumanSeats?.includes(seat);
      const result=original.call(this,seat,action);
      if(accepted&&result!==false)notify({type:'voice-pass',seat});
      return result;
    };
  }
  return Object.freeze({events,tier,createTracker,bindPass});
});
