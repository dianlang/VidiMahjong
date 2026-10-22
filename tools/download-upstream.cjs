'use strict';
// Download only the pinned source archive. Never executes downloaded content.
const fs=require('node:fs');
(async()=>{
 const [url,output]=process.argv.slice(2);
 if(url!=='https://codeload.github.com/VidiPT89/VidiMahjong/zip/e4207acd04887355c012ee2ab9d9456c4cbcb874'||!output)throw new Error('Expected pinned upstream archive and output path');
 const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error('Download HTTP '+response.status);
 const buffer=Buffer.from(await response.arrayBuffer());
 if(buffer.length<10000||buffer[0]!==0x50||buffer[1]!==0x4b)throw new Error('Invalid source ZIP');
 fs.writeFileSync(output,buffer);console.log('Pinned upstream source downloaded.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
