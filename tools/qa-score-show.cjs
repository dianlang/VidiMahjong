'use strict';
// Actual engine settlement in a DOM fixture. Audio APIs are stubs, not listening tests.
const fs=require('node:fs'),Module=require('node:module');
const script=fs.readFileSync('tools/qa-dom.cjs','utf8'),prefix=script.slice(0,script.indexOf(" click('#btn-mode-local');"));
const helpers='window.qyFixture={stop:()=>match.stop(),win:()=>{const g=match.engine;g.currentSeat=0;g.phase="reaction";g.lastDiscard={seat:0,tile:"m9"};g.seats[0].discards.push({tile:"m9",calledAway:false});g.seats[1].hand=["m1","m1","m1","m2","m3","m4","m4","m5","m6","m7","m8","m9","m9"];g.resolveReactions({1:"ron"});match.finishHand();}};';
const checks=`
 const spoken=[];w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};w.speechSynthesis={getVoices:()=>[{lang:'zh-CN',localService:true}],speak:u=>spoken.push(u.text),cancel(){}};
 const AudioBase=w.Audio;w.Audio=class extends AudioBase{play(){if(this.src.includes('/voice/'))return Promise.reject(new Error('missing fixture recording'));return super.play();}};
 click('#btn-mode-local');click('#setup-screen [data-character-id="character-01"]');click('#btn-start-match');
 Array.from(d.querySelectorAll('.qy-tools button')).find(b=>b.textContent==='测试工具').click();
 d.querySelector('#qy-test-force-win .btn-primary').click();
 const score=d.querySelector('#qy-score-show');assert.equal(score.open,true);assert.equal(d.querySelector('#qy-stage-show')?.open||false,false);
 await new Promise(resolve=>setTimeout(resolve,1700));const show=d.querySelector('#qy-stage-show');assert.equal(score.open,false);assert.equal(show.open,true);assert.match(show.querySelector('h2').textContent,/狼姬/);assert.equal(spoken.length,0);assert.ok(show.querySelector('.qy-stage-line').textContent.length>0);
 const points=Array.from(d.querySelectorAll('.qy-score-count-row strong'),e=>Number(e.textContent.replaceAll(',','')));assert.equal(points.reduce((a,b)=>a+b,0),100000);assert.ok(points[0]<25000);assert.ok(points[1]>25000);
 click('#btn-start-match');w.qyFixture.stop();assert.equal(show.open,false);
 d.dispatchEvent(new w.CustomEvent('queye:table-state',{detail:{online:true,riichi:false}}));d.querySelector('#qy-test-force-win .btn-primary').click();assert.match(d.querySelector('#qy-forced-win-message').textContent,/联机房间不能/);
 assert.deepEqual(errors,[]);console.log('Score DOM PASS: test-tool button -> actual ron -> final point animation -> stage show -> missing recording stays silent, captions retained; total points conserved, new-game cleanup and online test lock.');dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
`;
const source=prefix.replace('window.qyFixture={stop:()=>match.stop(),points:()=>match.engine.seats.map(s=>s.points)};',helpers)+checks;
const file=new Module(__filename,module);file.filename=__filename;file.paths=module.paths;file._compile(source,__filename);
