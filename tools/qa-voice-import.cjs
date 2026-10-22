'use strict';
// Playback routing with an Audio stub; this does not verify audible output.
const fs=require('node:fs'),Module=require('node:module');
const script=fs.readFileSync('tools/qa-dom.cjs','utf8');
const prefix=script.slice(0,script.indexOf(" click('#btn-mode-local');"));
const helpers='window.qyFixture={stop:()=>match.stop(),transfer:(from,to,n)=>{match.engine.seats[from].points-=n;match.engine.seats[to].points+=n;match.points=match.engine.seats.map(s=>s.points);renderAll();}};';
const checks=`
 const catalog=JSON.parse(fs.readFileSync('assets/characters/voice-catalog.json','utf8'));
 assert.equal(catalog.length,210);
 for(const row of catalog){const file='assets/characters/'+row.path;assert.ok(fs.existsSync(file),file);assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex'),row.sha256);}
 const requests=[],finished=[];
 w.Audio=class{
   constructor(src){this.src=src;this.listeners={};}
   addEventListener(type,fn){this.listeners[type]=fn;}
   pause(){}removeAttribute(name){delete this[name];}
   play(){const src=this.src;requests.push(src);if(src.includes('/voice/')&&!src.endsWith('.wav'))return Promise.reject(new Error('absent compressed recording'));
     if(src.includes('/voice/')){assert.ok(fs.existsSync(src),src);setTimeout(()=>{finished.push(src);this.listeners.ended?.();},5);}return Promise.resolve();}
 };
 click('#btn-mode-local');click('#setup-screen [data-character-id="character-01"]');click('#btn-start-match');
 w.qyFixture.transfer(0,1,3000);await new Promise(resolve=>setTimeout(resolve,40));
 const show=d.querySelector('#qy-stage-show');assert.equal(show.open,true);
 assert.equal(show.querySelector('.qy-stage-line').textContent,catalog.find(r=>r.characterId==='character-01'&&r.event==='stage_1').textZh);
 assert.ok(finished.includes('assets/characters/character-01/voice/stage-1.wav'));
 click('.qy-stage-skip');
 w.qyFixture.transfer(1,0,8000);await new Promise(resolve=>setTimeout(resolve,40));
 if(show.open)click('.qy-stage-skip');
 await new Promise(resolve=>setTimeout(resolve,500));
 assert.ok(finished.includes('assets/characters/character-01/voice/win.wav'));
 assert.ok(requests.includes('assets/characters/character-01/voice/win.ogg'));
 w.qyFixture.stop();assert.deepEqual(errors,[]);
 console.log('Voice DOM PASS: 210 recording hashes, matching stage subtitle, MP3/OGG -> WAV stage and win routing.');dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
`;
const file=new Module(__filename,module);file.filename=__filename;file.paths=module.paths;
file._compile(prefix.replace('window.qyFixture={stop:()=>match.stop(),points:()=>match.engine.seats.map(s=>s.points)};',helpers)+checks,__filename);
