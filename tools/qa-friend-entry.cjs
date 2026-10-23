'use strict';
const fs=require('node:fs'),Module=require('node:module');
const script=fs.readFileSync('tools/qa-dom.cjs','utf8');let prefix=script.slice(0,script.indexOf(" click('#btn-mode-local');"));
prefix=prefix.replace("fs.readFileSync('traditional.html','utf8')","fs.readFileSync('traditional.html','utf8').replace('</head>','<meta name=\"queye-server-path\" content=\"/ws\"></head>')").replace('http://localhost:8765/traditional.html','https://demo.trycloudflare.com/traditional.html?room=ABCD');
prefix=prefix.replace(' const audio=[];'," const copied=[];Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>copied.push(text)}});const audio=[];");
const helpers='window.qyFixture={room:code=>{onlineRoomCode=code;}};';
const checks=`
 assert.equal(d.querySelector('#server-url-input').value,'wss://demo.trycloudflare.com/ws');assert.equal(d.querySelector('#room-code-input').value,'ABCD');assert.equal(d.querySelector('#online-lobby-screen').classList.contains('hidden'),false);w.qyFixture.room('ABCD');const invite=[...d.querySelectorAll('#online-room-card button')].find(b=>b.textContent==='复制房间邀请');assert.ok(invite);invite.click();await new Promise(r=>setTimeout(r,0));assert.deepEqual(copied,['https://demo.trycloudflare.com/traditional.html?room=ABCD']);assert.deepEqual(errors,[]);console.log('Friend entry DOM PASS: automatic WSS endpoint, invitation opens online lobby with room filled, copy contains public same-origin URL.');dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
`;
const file=new Module(__filename,module);file.filename=__filename;file.paths=module.paths;file._compile(prefix.replace('window.qyFixture={stop:()=>match.stop(),points:()=>match.engine.seats.map(s=>s.points)};',helpers)+checks,__filename);
