/* Server chooses unused revealed roles; reconnects cannot re-roll an identity. */
'use strict';
const {randomInt}=require('node:crypto');
const registry=require('../js/traditional/characters.js');
const Random=require('../js/traditional/random-character.js');
function install(Room){
  const p=Room.prototype;if(p._queYeRandomCharacter)return;
  Object.defineProperty(p,'_queYeRandomCharacter',{value:true});
  const start=p.start;
  p.start=function(...args){
    if(!this.started){
      const assigned=this.seats.map(s=>s&&registry.has(s.characterId)?s.characterId:null),used=new Set(assigned.filter(Boolean));
      for(let seat=0;seat<4;seat++)if(!assigned[seat]){assigned[seat]=registry.ids.find(id=>!used.has(id))||registry.ids[seat%registry.ids.length];used.add(assigned[seat]);}
      this._randomCharacters=Random.create(assigned,count=>randomInt(count));
    }
    return start.apply(this,args);
  };
  const track=p.trackCumulativeLosses;
  p.trackCumulativeLosses=function(...args){
    const result=track.apply(this,args);if(!this._randomCharacters)return result;
    for(let seat=0;seat<4;seat++){
      const changed=this._randomCharacters.reveal(seat,this.cumulativeLosses[seat]);if(!changed)continue;
      if(this.seats[seat])this.seats[seat].characterId=changed.characterId;
      const first=this._stagePresentation?.changes.find(c=>c.seat===seat&&c.previousStage===0);
      if(first)Object.assign(first,changed);
    }
    return result;
  };
  const state=p.buildStateFor;
  p.buildStateFor=function(...args){
    const result=state.apply(this,args);
    if(this._randomCharacters)result.seats.forEach((seat,index)=>{seat.characterId=this._randomCharacters.characterId(index);seat.randomPending=seat.characterId===registry.RANDOM_ID;});
    return result;
  };
  const add=p.addPlayer;
  p.addPlayer=function(...args){
    const result=add.apply(this,args);
    if(this.started&&result.reconnected&&this._randomCharacters)this.seats[result.seatIndex].characterId=this._randomCharacters.characterId(result.seatIndex);
    return result;
  };
}
module.exports={install};
