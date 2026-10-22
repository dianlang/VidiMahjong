/* Explicitly requested riichi fix; shared by browser and authoritative server. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.QueYeRiichiRules=api;api.install(RiichiEngine,{checkWin,types:STANDARD_TYPE_IDS});
    const bot=chooseBotRiichi;chooseBotRiichi=(game,seat)=>bot(game,seat)&&game.riichiDiscardOptions(seat).includes(game.turnDrawnTile);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function install(Engine,{checkWin,types}){
    const p=Engine.prototype;if(p._queYeRiichiFixed)return;
    Object.defineProperty(p,'_queYeRiichiFixed',{value:true});const declarations=new WeakMap();
    function waits(hand,melds){return types.filter(tile=>hand.filter(t=>t===tile).length<4&&checkWin([...hand,tile],melds).win);}
    p.riichiWaitsForDiscard=function(seatIndex,tile){
      const seat=this.seats[seatIndex];if(!seat)return [];
      const hand=seat.hand.slice(),index=hand.indexOf(tile);if(index<0)return [];hand.splice(index,1);return waits(hand,seat.melds);
    };
    p.riichiDiscardOptions=function(seatIndex){
      if(this.phase!=='discard'||seatIndex!==this.currentSeat||this.turnDrawnTile===null)return [];
      const seat=this.seats[seatIndex];
      if(!seat||seat.riichi||seat.melds.length||this.liveWall.length<4||seat.points<1000)return [];
      return Array.from(new Set(seat.hand)).filter(tile=>this.riichiWaitsForDiscard(seatIndex,tile).length>0);
    };
    p.canDeclareRiichi=function(seatIndex){return this.riichiDiscardOptions(seatIndex).length>0;};
    p.declareRiichi=function(seatIndex){
      const options=this.riichiDiscardOptions(seatIndex);if(!options.length)return false;
      const seat=this.seats[seatIndex];declarations.set(this,{seat:seatIndex,options});
      seat.riichi=true;seat.doubleRiichi=seat.discards.length===0;seat.justDeclaredRiichi=true;seat.points-=1000;return true;
    };
    p.canDiscard=function(tile){
      const seat=this.activeSeat();if(this.phase!=='discard'||!seat.hand.includes(tile))return false;
      if(!seat.riichi)return true;
      if(seat.justDeclaredRiichi){const pending=declarations.get(this);return pending?.seat===this.currentSeat&&pending.options.includes(tile);}
      return this.turnDrawnTile!==null&&tile===this.turnDrawnTile;
    };
    const discard=p.discard;p.discard=function(tile){
      if(!this.canDiscard(tile))throw new Error('Illegal discard: riichi locks the hand to the drawn tile');
      const seat=this.activeSeat(),declaring=seat.justDeclaredRiichi;
      const result=discard.call(this,tile);
      if(declaring){seat.discards[seat.discards.length-1].riichiDeclaration=true;declarations.delete(this);}
      return result;
    };
  }
  function declareAndDiscard(match,seat,tile){
    const game=match.engine;if(!game.riichiDiscardOptions(seat).includes(tile)||!game.declareRiichi(seat))return false;
    game.discard(tile);match.emit({type:'riichi',seat});match.emit({type:'discarded',seat,tile});match.scheduleAfter(80,()=>match.tick());return true;
  }
  return Object.freeze({install,declareAndDiscard});
});
