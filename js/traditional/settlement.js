/* Publishes existing final points for presentation; does not recalculate payments. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.QueYeSettlement=api;api.install(LocalMatch);}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCORE_DURATION_MS=1400;
  function install(Match){
    const p=Match.prototype;if(p._queYeSettlementInstalled)return;
    Object.defineProperty(p,'_queYeSettlementInstalled',{value:true});
    const completed=new WeakSet();
    const original=p.applyResultToPoints;p.applyResultToPoints=function(result){
      if(completed.has(this.engine))return;
      const before=this.engine.seats.map(s=>s.points);const value=original.call(this,result);
      const after=this.points.slice();
      // Upstream stores final payments in match.points; make the ended-hand
      // public seats reflect that same final array before loss tracking/rendering.
      this.engine.seats.forEach((seat,index)=>{seat.points=after[index];});
      this._queYeSettlement={id:(this._queYeSettlement?.id||0)+1,type:result.type,before,after,startedAt:Date.now()};
      completed.add(this.engine);
      return value;
    };
  }
  return Object.freeze({install,SCORE_DURATION_MS});
});
