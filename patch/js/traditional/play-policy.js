/* Client preferences select existing legal actions; never infer hidden information. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QueYePlayPolicy=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const defaults=Object.freeze({autoPass:false,noCalls:false,autoRiichi:false,confirmDiscard:false});
 function normalize(value){const result={...defaults};for(const key of Object.keys(result))result[key]=value?.[key]===true;return result;}
 function reaction(opts,prefs){return{hideCalls:prefs.noCalls,pass:!opts.ron&&(prefs.autoPass||prefs.noCalls)};}
 function discard(view,prefs){return !!(prefs.autoRiichi&&view.ready&&!view.paused&&view.turn&&view.riichi&&!view.pending&&view.drawn&&view.hand.includes(view.drawn)&&!view.canTsumo&&!view.ankan.length);}
 return Object.freeze({defaults,normalize,reaction,discard});
});
