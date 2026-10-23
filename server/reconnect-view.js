'use strict';
function install(Room){
 const p=Room.prototype;if(p._queYeReconnectView)return;Object.defineProperty(p,'_queYeReconnectView',{value:true});
 const state=p.buildStateFor;
 p.buildStateFor=function(seat){
  const result=state.call(this,seat),m=this.match,g=m.engine;
  if(this._resumeEngine!==g){this._resumeEngine=g;this._resumeHand=(this._resumeHand||0)+1;}
  result.reactionPrompt=null;
  if(g.phase==='reaction'&&m._pendingHumanSeats?.includes(seat)){
   const opts=g.getReactionSummary()[seat];
   if(opts&&(opts.ron||opts.pon||opts.kan||opts.chi.length))result.reactionPrompt={key:[this._resumeHand,seat,g.lastDiscard?.seat,g.lastDiscard?.tile,...g.seats.map(s=>`${s.discards.length}:${s.melds.length}`)].join('|'),opts:{ron:!!opts.ron,pon:!!opts.pon,kan:!!opts.kan,chi:opts.chi.map(pair=>pair.slice())}};
  }
  return result;
 };
 const remove=p.removeConnection;p.removeConnection=function(ws){const result=remove.call(this,ws);if(this.match)this.broadcastState();return result;};
}
module.exports={install};
