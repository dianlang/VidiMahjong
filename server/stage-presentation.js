/* Server-authoritative short intermission; never accepts client score/stage claims. */
'use strict';
const Pause=require('../js/traditional/match-pause.js');
const Settlement=require('../js/traditional/settlement.js');
const thresholds=[3000,8000,15000,25000];
const stage=loss=>thresholds.filter(n=>loss>=n).length;
function install(Room){
  const proto=Room.prototype;if(proto._queYePresentationInstalled)return;
  Object.defineProperty(proto,'_queYePresentationInstalled',{value:true});
  const track=proto.trackCumulativeLosses;
  proto.trackCumulativeLosses=function(...args){
    const before=this.cumulativeLosses.slice();const result=track.apply(this,args);
    if(!this.match)return result;
    this._presentationPause=Pause.attach(this.match);
    const settlement=this.match._queYeSettlement;
    const freshWin=settlement&&settlement.id!==this._presentationSettlement&&['tsumo','ron'].includes(settlement.type);
    if(settlement)this._presentationSettlement=settlement.id;
    const lead=freshWin?Math.max(0,settlement.startedAt+Settlement.SCORE_DURATION_MS-Date.now()):0;
    const changes=this.cumulativeLosses.flatMap((loss,seat)=>Array.from({length:Math.max(0,stage(loss)-stage(before[seat]))},(_,index)=>({seat,previousStage:stage(before[seat])+index,stage:stage(before[seat])+index+1})));
    if(changes.length||lead){
      const previous=this._stagePresentation;
      const until=Math.max(Date.now(),previous?.until||0)+changes.length*Pause.DURATION_MS;
      this._stagePresentation={revision:(previous?.revision||0)+1,startAt:Date.now()+lead,until:until+lead,changes};
      this._presentationPause.holdUntil(until+lead);
      clearTimeout(this._presentationBroadcast);
      this._presentationBroadcast=setTimeout(()=>{this._presentationBroadcast=null;this.broadcastState();},Math.max(0,until+lead-Date.now()));
    }
    return result;
  };
  const state=proto.buildStateFor;
  proto.buildStateFor=function(...args){
    const result=state.apply(this,args),show=this._stagePresentation;
    result.stagePresentation=show?{revision:show.revision,remainingMs:Math.max(0,show.until-Date.now()),delayMs:Math.max(0,show.startAt-Date.now()),changes:show.changes.map(c=>({...c}))}:{revision:0,remainingMs:0,delayMs:0,changes:[]};
    const settled=this.match._queYeSettlement;
    result.settlement=settled&&this.match.engine.phase==='ended'?{id:settled.id,type:settled.type,before:settled.before.slice(),after:settled.after.slice(),remainingMs:Math.max(0,settled.startedAt+Settlement.SCORE_DURATION_MS-Date.now())}:null;
    return result;
  };
  const handle=proto.handleMessage;
  proto.handleMessage=function(...args){
    if(this._presentationPause?.isPaused())return;
    return handle.apply(this,args);
  };
  const destroy=proto.destroy;
  proto.destroy=function(...args){clearTimeout(this._presentationBroadcast);this._presentationPause?.cancel();return destroy.apply(this,args);};
}
module.exports={install};
