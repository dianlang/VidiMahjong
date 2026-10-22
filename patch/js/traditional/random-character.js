/* Cosmetic hidden identity. Character pools never include the male placeholder. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./characters.js'));
  else root.QueYeRandomCharacter=factory(root.QueYeCharacters);
})(typeof globalThis!=='undefined'?globalThis:this,function(registry){
  'use strict';
  function create(assignments,choose=count=>Math.floor(Math.random()*count)){
    if(!Array.isArray(assignments)||assignments.length!==4)throw new Error('Four character assignments required');
    const roles=assignments.map(registry.normalize),seen=new Set(roles.filter(id=>id!==registry.RANDOM_ID));
    function reveal(seat,loss){
      if(roles[seat]!==registry.RANDOM_ID||Number(loss)<3000||!Number.isFinite(Number(loss)))return null;
      const available=registry.ids.filter(id=>!seen.has(id));if(!available.length)return null;
      const index=choose(available.length);if(!Number.isInteger(index)||index<0||index>=available.length)throw new Error('Invalid random character choice');
      const characterId=available[index];roles[seat]=characterId;seen.add(characterId);
      return Object.freeze({fromCharacterId:registry.RANDOM_ID,characterId,transformationLine:`诶？我怎么变成${registry.get(characterId).name}了`,silent:true});
    }
    return Object.freeze({reveal,characterId:seat=>roles[seat],get assignments(){return roles.slice();}});
  }
  return Object.freeze({create});
});
