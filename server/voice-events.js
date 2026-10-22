/* Bounded cosmetic event stream. Never sends hands, waits or reaction options. */
'use strict';
const {randomBytes}=require('node:crypto');
const Voices=require('../js/traditional/voice-events.js');
function install(Room){
  const p=Room.prototype;if(p._queYeVoiceEvents)return;
  Object.defineProperty(p,'_queYeVoiceEvents',{value:true});
  const change=p.onMatchEvent;
  p.onMatchEvent=function(event){
    if(!this._voiceStream){this._voiceStream={session:randomBytes(8).toString('hex'),sequence:0,events:[]};this._voiceTracker=Voices.createTracker();}
    Voices.bindPass(this.match,cue=>this.onMatchEvent(cue));
    const stream=this._voiceStream;
    for(const cue of this._voiceTracker.observe(event,this.match,this.cumulativeLosses))stream.events.push({...cue,sequence:++stream.sequence,at:Date.now()});
    stream.events=stream.events.slice(-48);
    return change.call(this,event);
  };
  const state=p.buildStateFor;
  p.buildStateFor=function(seat){
    const result=state.call(this,seat),stream=this._voiceStream;
    result.voiceEvents=stream?{session:stream.session,sequence:stream.sequence,hand:this._voiceTracker.hand,events:stream.events.filter(c=>c.privateSeat===undefined||c.privateSeat===seat).map(({at,privateSeat,...cue})=>({...cue,ageMs:Math.max(0,Date.now()-at)}))}:null;
    return result;
  };
}
module.exports={install};
