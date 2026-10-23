'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const LABELS={match_start:'开局',hand_start:'下一手',chi:'吃',pon:'碰',kan:'杠',riichi:'立直',ron:'荣和',tsumo:'自摸',pass:'过',tenpai:'听牌',noten:'未听牌',ryuukyoku:'流局',win_small:'普通和牌',mangan:'满贯',haneman:'跳满',baiman:'倍满',sanbaiman:'三倍满',yakuman:'役满',ippatsu:'一发',rinshan:'岭上开花',stage_1:'阶段一',stage_2:'阶段二',stage_3:'阶段三',stage_4:'阶段四',stage_5:'末位附加台词',match_victory:'整场获胜',match_defeat:'整场落败',rank_1:'第一名',rank_2:'第二名',rank_3:'第三名',rank_4:'第四名',opponent_riichi:'他家立直',deal_in:'放铳',close_call:'侥幸避过',rematch:'再来一场'};
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
function error(message,status=400){const e=new Error(message);e.status=status;throw e;}
function inside(root,relative){
 const result=path.resolve(root,relative);if(!result.startsWith(root+path.sep))error('文件位置无效');
 let current=root;for(const part of path.relative(root,result).split(path.sep)){current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())error('不支持链接目录或链接文件');}return result;
}
function read(file){return fs.existsSync(file)?fs.readFileSync(file):null;}
function rosterFrom(bytes){const text=bytes.toString('utf8'),start=text.indexOf('return [')+7,end=text.lastIndexOf('];')+1;if(start<7||end<start)error('角色配置无法读取',500);return{entries:JSON.parse(text.slice(start,end)),text,start,end};}
function soundDuration(data,ext,fallback){
 if(ext==='wav'){
  if(data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WAVE')error('这不是有效的 WAV 文件');
  let rate=0,size=0;for(let at=12;at+8<=data.length;){const n=data.readUInt32LE(at+4);if(at+8+n>data.length)error('WAV 文件不完整');const name=data.toString('ascii',at,at+4);if(name==='fmt '&&n>=16)rate=data.readUInt32LE(at+16);if(name==='data')size+=n;at+=8+n+(n%2);}if(!rate||!size)error('WAV 没有有效声音数据');return size/rate;
 }
 if(ext==='ogg'&&data.toString('ascii',0,4)!=='OggS')error('这不是有效的 OGG 文件');
 if(ext==='mp3'&&!(data.toString('ascii',0,3)==='ID3'||data[0]===255&&(data[1]&224)===224))error('这不是有效的 MP3 文件');
 return Number.isFinite(fallback)&&fallback>0&&fallback<=120?fallback:4;
}
function createStore({sourceRoot,gameRoot}){
 sourceRoot=path.resolve(sourceRoot);gameRoot=path.resolve(gameRoot);const roots=[...new Set([sourceRoot,gameRoot])];
 for(const root of roots)if(!fs.existsSync(path.join(root,'patch/assets/characters/roster.js')))error('请选择完整的雀夜工程目录',500);
 const historyRoot=inside(sourceRoot,'release/asset-manager');
 function load(){const bytes=fs.readFileSync(inside(gameRoot,'assets/characters/roster.js'));const parsed=rosterFrom(bytes);const catalog=JSON.parse(fs.readFileSync(inside(gameRoot,'assets/characters/voice-catalog.json'),'utf8'));return{...parsed,catalog,catalogHash:digest(Buffer.from(JSON.stringify(catalog)))};}
 function info(relative){const file=inside(gameRoot,relative),bytes=read(file);return{exists:!!bytes,bytes:bytes?.length||0,sha256:bytes?digest(bytes):null,url:'/'+relative+(bytes?'?v='+digest(bytes).slice(0,12):'')};}
 function imageSlots(id){return(id==='character-random'?['stage-0']:['stage-0','stage-1','stage-2','stage-3','stage-4','defeat']).map(slot=>({slot,label:slot==='defeat'?'失败 CG':slot==='stage-0'?'初始立绘':`阶段 ${slot.at(-1)}`, ...info(`assets/characters/${id}/${slot}.png`)}));}
 function snapshot(){
  const data=load(),characters=[...data.entries,{id:'character-random',name:'神秘男子',tagline:'随机身份 · 变身前'}].map(c=>({id:c.id,name:c.name,tagline:c.tagline||'',images:imageSlots(c.id),voices:c.id==='character-random'?[]:Object.entries(LABELS).map(([event,label])=>{const row=data.catalog.find(x=>x.characterId===c.id&&x.event===event);const ext=row?.path?.match(/\.(wav|mp3|ogg)$/)?.[1]||'wav';return{event,label,textZh:row?.textZh||'',textJa:row?.textJa||'',durationSeconds:row?.durationSeconds||0,...info(`assets/characters/${c.id}/voice/${event}.${ext}`)};})}));
  return{characters,catalogHash:data.catalogHash,linked:roots.length>1,backups:history().slice(0,8)};
 }
 function history(){if(!fs.existsSync(historyRoot))return[];return fs.readdirSync(historyRoot).sort().reverse().slice(0,20).flatMap(name=>{try{const m=JSON.parse(fs.readFileSync(inside(historyRoot,name+'/manifest.json'),'utf8'));return[{id:name,label:m.label,time:m.time,files:m.files.length}];}catch(_){return[];}});}
 function allCopies(relative,bytes){return roots.flatMap(root=>[{root,relative,data:bytes},{root,relative:'patch/'+relative,data:bytes}]);}
 function metadata(data){
  const roster=Buffer.from(data.text.slice(0,data.start)+JSON.stringify(data.entries,null,2)+data.text.slice(data.end));
  const json=Buffer.from(JSON.stringify(data.catalog,null,2)+'\n');
  const js=Buffer.from('(function(root,factory){if(typeof module==="object"&&module.exports)module.exports=factory();else root.QueYeVoiceCatalog=factory();})(typeof globalThis!=="undefined"?globalThis:this,function(){return '+JSON.stringify(data.catalog)+';});\n');
  return[...allCopies('assets/characters/roster.js',roster),...allCopies('assets/characters/voice-catalog.json',json),...allCopies('assets/characters/voice-catalog.js',js)];
 }
 function commit(writes,label){
  const unique=new Map();for(const w of writes)unique.set(inside(w.root,w.relative),w);
  const changes=[...unique].map(([file,w])=>({...w,file,before:read(file)})).filter(w=>!w.before||!w.before.equals(w.data));
  if(!changes.length)return{saved:0,backup:null};
  const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex'),directory=inside(historyRoot,id);fs.mkdirSync(directory,{recursive:true});
  const manifest={label,time:new Date().toISOString(),files:changes.map((w,i)=>({root:w.root===sourceRoot?'source':'game',path:w.relative,before:w.before?digest(w.before):null,after:digest(w.data),snapshot:w.before?i+'.bin':null}))};
  changes.forEach((w,i)=>{if(w.before)fs.writeFileSync(inside(directory,i+'.bin'),w.before);});fs.writeFileSync(inside(directory,'manifest.json'),JSON.stringify(manifest,null,2));
  const completed=[],temporary=[];
  try{for(const w of changes){if(digest(read(w.file)||Buffer.alloc(0))!==digest(w.before||Buffer.alloc(0)))error('文件已被其他操作修改，请刷新后重试',409);fs.mkdirSync(path.dirname(w.file),{recursive:true});const temp=w.file+'.qy-'+id;temporary.push(temp);fs.writeFileSync(temp,w.data);fs.renameSync(temp,w.file);completed.push(w);}}
  catch(e){for(const file of temporary)fs.rmSync(file,{force:true});for(const w of completed.reverse()){if(w.before)fs.writeFileSync(w.file,w.before);else fs.rmSync(w.file,{force:true});}throw e;}
  return{saved:changes.length,backup:id};
 }
 function validateCharacter(data,id){if(id!=='character-random'&&!data.entries.some(c=>c.id===id))error('找不到这个角色');}
 function importFiles(body){
  if(!Array.isArray(body.files)||!body.files.length||body.files.length>80)error('请选择 1～80 个素材文件');
  const data=load(),writes=[],seen=new Set();
  for(const item of body.files){
   validateCharacter(data,item.characterId);const id=item.characterId,key=id+':'+item.kind+':'+item.slot;if(seen.has(key))error('同一槽位不能重复导入');seen.add(key);
   if(!Object.hasOwn(item,'expectedHash'))error('请先刷新素材列表');
   if(typeof item.data!=='string'||item.data.length>24*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(item.data))error('素材文件无效或过大');
   const bytes=Buffer.from(item.data,'base64');if(!bytes.length||bytes.length>16*1024*1024)error('单个素材需小于 16 MB');
   let current;
   if(item.kind==='image'){
    const valid=id==='character-random'?['stage-0']:['stage-0','stage-1','stage-2','stage-3','stage-4','defeat'];if(!valid.includes(item.slot))error('立绘槽位无效');
    if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))error('立绘请使用 PNG 格式');
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);if(!width||!height||width>16384||height>16384||width*height>100000000)error('图片尺寸过大');
    let ended=false,hasData=false;for(let at=8;at+12<=bytes.length;){const n=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8);if(at+12+n>bytes.length||at===8&&(type!=='IHDR'||n!==13))error('PNG 文件不完整');if(type==='IDAT'&&n)hasData=true;if(type==='IEND'){if(n)error('PNG 文件不完整');ended=true;break;}at+=12+n;}if(!ended||!hasData)error('PNG 文件不完整');
    const relative=`assets/characters/${id}/${item.slot}.png`;current=info(relative);writes.push(...allCopies(relative,bytes));
    if(id==='character-random')writes.push(...allCopies(`assets/characters/${id}/stage-4.png`,bytes));
   }else if(item.kind==='voice'){
    if(id==='character-random'||!Object.hasOwn(LABELS,item.slot)||!['wav','mp3','ogg'].includes(item.extension))error('配音槽位或格式无效');
    const old=data.catalog.find(r=>r.characterId===id&&r.event===item.slot),oldExt=old?.path?.match(/\.(wav|mp3|ogg)$/)?.[1]||'wav';current=info(`assets/characters/${id}/voice/${item.slot}.${oldExt}`);
    const duration=soundDuration(bytes,item.extension,Number(item.durationSeconds));if(duration>120)error('单段配音需小于 120 秒');
    const row={characterId:id,event:item.slot,textJa:old?.textJa||'',textZh:old?.textZh||'',path:`${id}/voice/${item.slot}.${item.extension}`,durationSeconds:Math.round(duration*1000)/1000,sha256:digest(bytes)};
    if(old)Object.assign(old,row);else data.catalog.push(row);
    writes.push(...allCopies('assets/characters/'+row.path,bytes));
    if(/^stage_[1-4]$/.test(item.slot))writes.push(...allCopies(`assets/characters/${id}/voice/${item.slot.replace('_','-')}.${item.extension}`,bytes));
    if(item.slot==='win_small')writes.push(...allCopies(`assets/characters/${id}/voice/win.${item.extension}`,bytes));
   }else error('未知素材类型');
   if(current.sha256!==item.expectedHash)error('素材已变化，请刷新列表后重新导入',409);
  }
  return commit([...writes,...metadata(data)],'导入 '+body.files.length+' 个素材');
 }
 function updateLine(body){
  const data=load();validateCharacter(data,body.characterId);if(!Object.hasOwn(LABELS,body.event)||body.characterId==='character-random')error('台词事件无效');
  if(body.catalogHash!==data.catalogHash)error('台词已变化，请刷新列表',409);
  const textZh=String(body.textZh||'').trim(),textJa=String(body.textJa||'').trim();if(textZh.length>500||textJa.length>500)error('台词最多 500 字');
  let row=data.catalog.find(r=>r.characterId===body.characterId&&r.event===body.event);
  if(!row){row={characterId:body.characterId,event:body.event,path:`${body.characterId}/voice/${body.event}.wav`,durationSeconds:4};data.catalog.push(row);}Object.assign(row,{textZh,textJa});
  const c=data.entries.find(c=>c.id===body.characterId);if(/^stage_[1-4]$/.test(body.event)){c.stageLines=c.stageLines||{};c.stageLines[body.event.at(-1)]=textZh;}if(body.event==='win_small')c.winLine=textZh;
  return commit(metadata(data),'更新 '+c.name+'的台词');
 }
 function addCharacter(body){
  const data=load(),name=String(body.name||'').trim(),tagline=String(body.tagline||'').trim();if(!name||name.length>40||tagline.length>120)error('请填写 1～40 字角色名，简介最多 120 字');
  const next=Math.max(0,...data.entries.map(c=>Number(c.id.match(/^character-(\d+)$/)?.[1])||0))+1,id='character-'+String(next).padStart(2,'0');
  data.entries.push({id,name,tagline,avatar:{scale:2.65,origin:'50% 18%'},stageLines:{},winLine:''});return{...commit(metadata(data),'新增角色 '+name),characterId:id};
 }
 function sync(){const data=load(),writes=metadata(data);for(const c of [...data.entries,{id:'character-random'}]){
  for(const slot of ['stage-0','stage-1','stage-2','stage-3','stage-4','defeat']){const relative=`assets/characters/${c.id}/${slot}.png`,bytes=read(inside(gameRoot,relative));if(bytes)writes.push(...allCopies(relative,bytes));}
  for(const event of [...Object.keys(LABELS),'stage-1','stage-2','stage-3','stage-4','win'])for(const ext of ['wav','mp3','ogg']){const relative=`assets/characters/${c.id}/voice/${event}.${ext}`,bytes=read(inside(gameRoot,relative));if(bytes)writes.push(...allCopies(relative,bytes));}
 }return commit(writes,'同步当前游戏素材');}
 return{snapshot,importFiles,updateLine,addCharacter,sync,history,sourceRoot,gameRoot};
}
module.exports={createStore,LABELS,inside};
