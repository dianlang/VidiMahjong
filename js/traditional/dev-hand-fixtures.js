/* Explicit local-test hand injection, evaluated by the actual game engine. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.QueYeTestHands=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const hands=Object.freeze({
    chinitsu:['m1','m1','m1','m2','m3','m4','m4','m5','m6','m7','m8','m9','m9','m9'],
    chiitoitsu:['m2','m2','m4','m4','p3','p3','p6','p6','s2','s2','s8','s8','dW','dW'],
    kokushi:['m1','m9','p1','p9','s1','s9','wE','wS','wW','wN','dR','dG','dW','m1'],
  });
  function win(match,{winner=1,from=0,winType='ron',preset='chinitsu'}={}){
    if(!match?.engine||match.matchOver)throw new Error('请先新开本地测试局。');
    if(!Number.isInteger(winner)||winner<0||winner>3||!Number.isInteger(from)||from<0||from>3||!hands[preset]||!['ron','tsumo'].includes(winType))throw new Error('和牌参数无效。');
    if(winType==='ron'&&winner===from)throw new Error('获胜座位与放铳座位不能相同。');
    if(match.engine.phase==='ended')match.startHand();
    // Cancel old bot callbacks before injecting this explicitly requested fixture.
    match._gen++;
    const game=match.engine,seat=game.seats[winner],complete=hands[preset].slice(),winningTile=complete.pop();
    seat.melds=[];seat.discards=[];seat.riichi=false;seat.doubleRiichi=false;seat.ippatsuActive=false;seat.justDeclaredRiichi=false;seat.furitenUntilNextDraw=false;
    game.result=null;game.isRinshanDraw=false;game._chankanActive=false;
    if(winType==='tsumo'){
      seat.hand=complete.concat(winningTile);game.currentSeat=winner;game.turnDrawnTile=winningTile;game.phase='discard';
      if(!game.declareTsumo())throw new Error('测试手牌未能自摸。');
    }else{
      seat.hand=complete;game.currentSeat=from;game.turnDrawnTile=null;game.phase='reaction';game.lastDiscard={seat:from,tile:winningTile};game.seats[from].discards.push({tile:winningTile,calledAway:false});
      const result=game.resolveReactions({[winner]:'ron'});if(result.type!=='ron')throw new Error('测试手牌未能荣和。');
    }
    const result=game.result;match.finishHand();return result;
  }
  return Object.freeze({win});
});
