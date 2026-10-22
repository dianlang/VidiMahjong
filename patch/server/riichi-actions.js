'use strict';
const Rules=require('../js/traditional/riichi-rules.js');
function install(Room){
  const p=Room.prototype;if(p._queYeRiichiActions)return;Object.defineProperty(p,'_queYeRiichiActions',{value:true});
  const state=p.buildStateFor;p.buildStateFor=function(seat){
    const result=state.call(this,seat),game=this.match.engine;
    result.riichiDiscardOptions=game.riichiDiscardOptions(seat);
    result.riichiDeclarationPending=!!game.seats[seat].justDeclaredRiichi;
    if(result.riichiDeclarationPending)result.riichiDiscardOptions=Array.from(new Set(game.seats[seat].hand)).filter(tile=>game.canDiscard(tile));
    return result;
  };
  const handle=p.handleMessage;p.handleMessage=function(ws,msg){
    const seat=this.seatIndexForWs(ws);if(seat<0||!this.match||this._presentationPause?.isPaused())return;
    const game=this.match.engine;
    if(msg.type==='discard'&&(seat!==game.currentSeat||!game.canDiscard(msg.tile)))return;
    if(msg.type==='riichi'&&typeof msg.tile==='string'){
      if(game.currentSeat===seat)Rules.declareAndDiscard(this.match,seat,msg.tile);
      return;
    }
    return handle.call(this,ws,msg);
  };
}
module.exports={install};
