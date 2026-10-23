/* Every human acknowledges the published result before the next hand starts. */
'use strict';
function install(Room){
 const p=Room.prototype;if(p._queYeConfirmInstalled)return;Object.defineProperty(p,'_queYeConfirmInstalled',{value:true});
 function ready(room){
  const m=room.match,s=m?._queYeSettlement;if(!m||m.engine.phase!=='ended'||!s||m.matchOver)return null;
  if(room._settlementConfirm?.engine!==m.engine||room._settlementConfirm.id!==s.id)room._settlementConfirm={engine:m.engine,id:s.id,confirmed:[false,false,false,false]};
  return room._settlementConfirm;
 }
 const state=p.buildStateFor;p.buildStateFor=function(...args){const st=state.apply(this,args),r=ready(this);st.settlementReady=r?{id:r.id,required:this.seats.map(s=>!!s),confirmed:r.confirmed.slice()}:null;return st;};
 const handle=p.handleMessage;p.handleMessage=function(ws,msg){
  if(!['confirmSettlement','nextHand'].includes(msg?.type))return handle.call(this,ws,msg);
  const seat=this.seatIndexForWs(ws),r=ready(this);if(seat<0||!r)return;
  // Older clients may use nextHand; it still only confirms their own seat.
  if(msg.type==='confirmSettlement'&&msg.settlementId!==r.id)return;
  if(r.confirmed[seat])return;r.confirmed[seat]=true;this.lastActivityAt=Date.now();this.broadcastState();
  if(!this.seats.every((s,i)=>!s||r.confirmed[i]))return;
  const engine=r.engine;
  const advance=()=>{this._settlementAdvance=null;if(this.match?.engine!==engine||this.match.matchOver)return;
   if(this._presentationPause?.isPaused()){this._settlementAdvance=setTimeout(advance,100);return;}
   this.match.advanceToNextHand();
  };
  this._settlementAdvance=setTimeout(advance,Math.max(0,(this._stagePresentation?.until||0)-Date.now())+30);
 };
 const destroy=p.destroy;p.destroy=function(...args){clearTimeout(this._settlementAdvance);return destroy.apply(this,args);};
}
module.exports={install};
