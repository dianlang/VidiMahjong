'use strict';
// Actual local/online renderers and delegated pointer/focus events; no visual acceptance claim.
const fs=require('node:fs'),Module=require('node:module');
const script=fs.readFileSync('tools/qa-dom.cjs','utf8'),prefix=script.slice(0,script.indexOf(" click('#btn-mode-local');"));
const helpers=`window.qyFixture={stop:()=>match.stop(),seed:()=>{match.stop();const g=match.engine;g.phase='discard';g.currentSeat=0;g.doraIndicators=()=>['m4'];g.seats[0].hand=['m1','m2','m3','m4','m5','m6','m7','p1','p2','p3','s1','s2','s3','wE'];g.seats.forEach((s,i)=>{s.discards=(i===2?['p5']:['m5','p5']).map(tile=>({tile,calledAway:false}));});renderAll();},render:()=>renderAll(),online:st=>{onlineSeat=st.you.seat;onlineRoomCode='HOVER';renderOnlineTable(st);}};`;
const checks=`
 click('#btn-mode-local');click('#setup-screen [data-character-id="character-01"]');click('#btn-start-match');w.qyFixture.seed();
 const hand=id=>d.querySelector('#human-hand [data-qy-tile="'+id+'"]');
 const matches=()=>d.querySelectorAll('.qy-river-match');
 const pointer=(type,node,related=null)=>node.dispatchEvent(new w.MouseEvent(type,{bubbles:true,relatedTarget:related,clientX:50,clientY:60}));
 pointer('pointerover',hand('m5'));assert.equal(matches().length,3);for(const chip of matches()){assert.equal(chip.querySelector('[data-qy-tile]').dataset.qyTile,'m5');assert.equal(chip.classList.contains('qy-is-dora'),true);}assert.equal(d.querySelector('#human-hand .qy-river-match'),null);assert.equal(d.querySelector('#qy-actual-dora .qy-river-match'),null);
 pointer('pointerout',hand('m5'),hand('p3'));assert.equal(matches().length,0);
 pointer('pointerover',hand('p1'));assert.equal(matches().length,0);
 pointer('pointerout',hand('p1'),d.body);assert.equal(matches().length,0);
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));hand('m5').closest('.htile').focus();assert.equal(matches().length,3);
 // Moving the mouse out must clear a previously focused tile too.
 pointer('pointerover',hand('m5'));pointer('pointerout',hand('m5'),d.body);assert.equal(matches().length,0);
 // A full renderer refresh resolves the tile under a stationary pointer again.
 pointer('pointerover',hand('m5'));d.elementFromPoint=()=>hand('m5');w.qyFixture.render();assert.equal(matches().length,3);
 const riverButton=[...d.querySelectorAll('.qy-tools button')].find(b=>b.textContent==='牌河');riverButton.click();const expanded=d.querySelector('.qy-river-pile [data-qy-tile="p5"]');pointer('pointerover',expanded);assert.equal(matches().length,8);assert.equal(d.querySelectorAll('.qy-river-melds .qy-river-match').length,0);
 pointer('pointerout',expanded,d.body);assert.equal(matches().length,0);d.querySelector('#qy-rivers-dialog').close();
 // Missing SVG artwork falls back to a label with the same tile identity.
 hand('m5').dispatchEvent(new w.Event('error'));pointer('pointerover',hand('m5'));assert.equal(matches().length,3);
 w.dispatchEvent(new w.Event('blur'));assert.equal(matches().length,0);
 const room=new (require('../server/room.js').Room)('HOVER',require('../server/shared-engine.js'));for(let i=0;i<4;i++)room.addPlayer({readyState:1,send(){}},'p'+i,'P'+i,'character-0'+(i+1));room.start();
 const state=JSON.parse(JSON.stringify(room.buildStateFor(2)));state.you.hand=['m5',...state.you.hand.filter(t=>t!=='m5')];state.seats.forEach(s=>s.discards=[{tile:'m5'},{tile:'p2'}]);state.you.discards=state.seats[2].discards;state.dora=['m4'];w.qyFixture.online(state);assert.equal(matches().length,0);pointer('pointerover',hand('m5'));assert.equal(d.querySelectorAll('#human-discards .qy-river-match').length,1);assert.equal(d.querySelectorAll('.opponent-discards .qy-river-match').length,3);
 d.dispatchEvent(new w.CustomEvent('queye:menu'));assert.equal(matches().length,0);assert.equal(state.seats.every(s=>s.hand===undefined),true);
 room.destroy();w.qyFixture.stop();assert.deepEqual(errors,[]);console.log('River highlight DOM PASS: local four rivers, matching identity only, dora retained, pointer exit/focus, stationary-pointer redraw, expanded view, missing-image fallback, rotated online seat and cleanup.');dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
`;
const escaped=helpers.replaceAll('\\','\\\\').replaceAll("'","\\'").replaceAll('\n','\\n');
const file=new Module(__filename,module);file.filename=__filename;file.paths=module.paths;
file._compile(prefix.replace('window.qyFixture={stop:()=>match.stop(),points:()=>match.engine.seats.map(s=>s.points)};',escaped)+checks,__filename);
