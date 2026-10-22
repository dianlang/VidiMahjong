/* Shared browser/server registry. No rules or room message changes. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('../../assets/characters/roster.js'));
  else root.QueYeCharacters=factory(root.QueYeCharacterRoster);
})(typeof globalThis!=='undefined'?globalThis:this,function(roster){
  'use strict';
  const RANDOM_ID='character-random';
  function create(entries){
    if(!Array.isArray(entries)||!entries.length)throw new Error('Character roster must not be empty');
    const seen=new Set();
    const normalized=entries.map(c=>{
      if(!c||c.id===RANDOM_ID||!/^character-[a-z0-9-]{1,40}$/.test(c.id)||seen.has(c.id))throw new Error('Invalid or duplicate character ID');
      if(typeof c.name!=='string'||!c.name.trim()||c.name.length>40)throw new Error('Invalid character name');
      seen.add(c.id);
      const avatar=c.avatar||{};
      const scale=Number(avatar.scale);
      const origin=/^\d{1,3}% \d{1,3}%$/.test(avatar.origin||'')?avatar.origin:'50% 8%';
      const stageLines=Object.freeze(Object.fromEntries([1,2,3,4].map(n=>[n,typeof c.stageLines?.[n]==='string'?c.stageLines[n]:'这局还没结束，继续吧。'])));
      return Object.freeze({id:c.id,name:c.name.trim(),tagline:typeof c.tagline==='string'&&c.tagline.trim()?c.tagline.trim():'今夜，与你同席。',avatar:Object.freeze({scale:Number.isFinite(scale)&&scale>=1&&scale<=5?scale:2.4,origin}),stageLines,winLine:typeof c.winLine==='string'?c.winLine:'这次发挥不错。'});
    });
    const ids=Object.freeze(normalized.map(c=>c.id));
    const mystery=Object.freeze({id:RANDOM_ID,name:'神秘男子',tagline:'这一席，交给缘分。',avatar:Object.freeze({scale:1,origin:'50% 50%'}),stageLines:Object.freeze({}),winLine:''});
    const has=id=>id===RANDOM_ID||seen.has(id);
    const normalize=id=>has(id)?id:ids[0];
    const get=id=>id===RANDOM_ID?mystery:normalized.find(c=>c.id===normalize(id));
    const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return Object.freeze({entries:Object.freeze(normalized),ids,has,normalize,get,escapeHTML,RANDOM_ID,
      stagePath:(id,stage)=>`assets/characters/${normalize(id)}/stage-${id===RANDOM_ID?0:Math.min(4,Math.max(0,Math.trunc(Number(stage)||0)))}.png`,create});
  }
  return create(roster);
});
