/* Presentation-only pause adapter. Keeps upstream LocalMatch byte-for-byte intact. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.QueYeMatchPause=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const controllers=new WeakMap();
  function attach(match){
    if(controllers.has(match))return controllers.get(match);
    let until=0,timer=null,disposed=false;
    const pending=new Map();
    const paused=()=>!disposed&&until>0;
    function clear(){clearTimeout(timer);timer=null;until=0;match._lastProgressAt=Date.now();}
    function release(){
      clear();const tasks=Array.from(pending.values());pending.clear();
      for(const task of tasks)setTimeout(()=>{
        if(!disposed&&match._gen===task.gen)match[task.name](...task.args);
      },0);
    }
    const controller={isPaused:paused,holdUntil(deadline){
      if(disposed||!Number.isFinite(deadline)||deadline<=Date.now())return;
      until=Math.max(until,Math.min(deadline,Date.now()+120000));
      // The unmodified watchdog must not invalidate a deferred bot callback.
      match._lastProgressAt=Number.MAX_SAFE_INTEGER;
      clearTimeout(timer);timer=setTimeout(release,Math.max(0,until-Date.now()));
    },release,cancel(){clear();pending.clear();},get until(){return until;}};
    for(const name of ['tick','runBotTurn','resolveReactionPhase','applyReactions']){
      const original=match[name];if(typeof original!=='function')continue;
      match[name]=function(...args){
        if(paused()){pending.set(name,{name,args,gen:this._gen});return false;}
        return original.apply(this,args);
      };
    }
    for(const name of ['humanDiscard','humanDeclareTsumo','humanDeclareRiichi','humanAnkan','humanReact','advanceToNextHand','startHand']){
      const original=match[name];if(typeof original!=='function')continue;
      match[name]=function(...args){if(paused())return false;return original.apply(this,args);};
    }
    const emit=match.emit;
    if(typeof emit==='function')match.emit=function(...args){
      try{return emit.apply(this,args);}finally{if(paused())this._lastProgressAt=Number.MAX_SAFE_INTEGER;}
    };
    const stop=match.stop;
    if(typeof stop==='function')match.stop=function(...args){
      disposed=true;controller.cancel();return stop.apply(this,args);
    };
    controllers.set(match,controller);return controller;
  }
  return Object.freeze({attach,DURATION_MS:6000});
});
