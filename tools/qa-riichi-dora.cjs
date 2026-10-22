'use strict';
// DOM integration, not browser visual acceptance.
const fs=require('node:fs'),Module=require('node:module');
const script=fs.readFileSync('tools/qa-dom.cjs','utf8'),prefix=script.slice(0,script.indexOf(" click('#btn-mode-local');"));
const helpers='window.qyFixture={stop:()=>match.stop(),points:()=>match.engine.seats.map(s=>s.points),setup:(hand,drawn,indicator)=>{match.engine.seats[0].hand=hand.slice();match.engine.currentSeat=0;match.engine.phase="discard";match.engine.turnDrawnTile=drawn;match.engine.deadWall[0].typeId=indicator;renderAll();},online:st=>{onlineSeat=st.you.seat;onlineRoomCode="QA";renderOnlineTable(st);}};';
const checks=`
 click('#btn-mode-local');click('#btn-start-match');
 const hand=['m1','m2','m3','m4','m5','m6','p1','p2','p3','s1','s2','s3','wE','dR'];
 w.qyFixture.setup(hand,'dR','m9');
 let tile=id=>d.querySelector('#human-hand [data-qy-tile="'+id+'"]')?.closest('.htile');
 assert.equal(tile('m1').classList.contains('qy-is-dora'),true);assert.equal(tile('m9')?.classList.contains('qy-is-dora')||false,false);
 assert.equal(d.querySelector('#qy-actual-dora [data-qy-tile]').dataset.qyTile,'m1');
 for(const [indicator,actual] of [['wN','wE'],['dR','dG'],['dG','dW'],['dW','dR']]){w.qyFixture.setup(hand,'dR',indicator);assert.equal(d.querySelector('#qy-actual-dora [data-qy-tile]').dataset.qyTile,actual);}
 click('[data-qy-riichi-start]');assert.equal(tile('m1').getAttribute('aria-disabled'),'true');assert.equal(tile('dR').classList.contains('qy-riichi-choice'),true);assert.equal(w.qyFixture.points()[0],25000);
 tile('dR').click();assert.equal(d.querySelector('#qy-riichi-confirm').open,true);assert.ok(d.querySelector('.qy-riichi-waits [data-qy-tile="wE"]'));
 click('[data-qy-confirm-back]');assert.equal(w.qyFixture.points()[0],25000);tile('dR').click();click('[data-qy-confirm-riichi]');
 assert.equal(w.qyFixture.points()[0],24000);assert.match(d.querySelector('#turn-hint').textContent,/立直中/);assert.ok(d.querySelector('#human-discards .qy-riichi-discard'));
 w.qyFixture.stop();const future=hand.filter(t=>t!=='dR').concat(['m9']);w.qyFixture.setup(future,'m9','m9');
 assert.equal(tile('m1').getAttribute('aria-disabled'),'true');assert.equal(tile('m9').getAttribute('aria-disabled'),'false');assert.equal(d.querySelectorAll('#human-hand .is-just-drawn').length,1);
 const before=d.querySelectorAll('#human-hand .htile').length;tile('m1').click();assert.equal(d.querySelectorAll('#human-hand .htile').length,before);
 const room=new (require('../server/room.js').Room)('QA',require('../server/shared-engine.js'));for(let i=0;i<4;i++)room.addPlayer({readyState:1,send(){}},'p'+i,'P','character-0'+(i+1));room.start();
 const state=JSON.parse(JSON.stringify(room.buildStateFor(0)));state.dora=['wN'];state.you.hand=hand;state.turnDrawnTile='dR';state.phase='discard';state.currentSeat=0;state.riichiDiscardOptions=['dR','wE'];
 w.qyFixture.online(state);assert.equal(d.querySelector('#qy-actual-dora [data-qy-tile]').dataset.qyTile,'wE');assert.equal(tile('wE').classList.contains('qy-is-dora'),true);assert.equal(tile('m1').classList.contains('qy-is-dora'),false);
 room.destroy();w.qyFixture.stop();assert.deepEqual(errors,[]);console.log('Riichi/Dora DOM PASS: real indicator mapping and reset, legal declaration tiles, wait preview, cancel without payment, single 1000-point payment, marked declaration discard, drawn-tile lock and online view.');dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
`;
const source=prefix.replace('window.qyFixture={stop:()=>match.stop(),points:()=>match.engine.seats.map(s=>s.points)};',helpers)+checks;
const file=new Module(__filename,module);file.filename=__filename;file.paths=module.paths;file._compile(source,__filename);
