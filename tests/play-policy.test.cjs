'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),p=require('../js/traditional/play-policy.js');
test('preferences default off and reject coercion; automatic pass always stops for ron',()=>{
 assert.deepEqual(p.normalize({autoPass:'true',confirmDiscard:true,extra:true}),{autoPass:false,noCalls:false,autoRiichi:false,confirmDiscard:true});
 for(const opts of [{autoPass:true},{noCalls:true},{autoPass:true,noCalls:true}]){assert.equal(p.reaction({ron:true},opts).pass,false);assert.equal(p.reaction({ron:false},opts).pass,true);}
 assert.equal(p.reaction({ron:false},p.defaults).pass,false);
});
test('automatic riichi discard stops for pending declaration, wins, kan, disconnection or stage pause',()=>{
 const view={ready:true,paused:false,turn:true,riichi:true,pending:false,drawn:'m5',hand:['m1','m5'],canTsumo:false,ankan:[]};assert.equal(p.discard(view,{autoRiichi:true}),true);
 for(const patch of [{ready:false},{paused:true},{turn:false},{riichi:false},{pending:true},{drawn:null},{hand:['m1']},{canTsumo:true},{ankan:['m1']}])assert.equal(p.discard({...view,...patch},{autoRiichi:true}),false,JSON.stringify(patch));
 assert.equal(p.discard(view,p.defaults),false);
});
