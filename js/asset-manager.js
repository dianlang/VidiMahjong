(() => {
 'use strict';
 const token=document.querySelector('meta[name="queye-local-token"]').content,$=id=>document.getElementById(id),make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 let catalog=null,selected=null,plan=[];const drafts=new Map();
 async function api(route,body){const response=await fetch('/api/'+route,{method:body?'POST':'GET',headers:{'X-QueYe-Token':token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok)throw new Error(result.error||'操作失败');return result;}
 function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('is-error',error);}
 async function busy(task){document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await task();}catch(e){message(e.message,true);}finally{document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function character(){return catalog.characters.find(c=>c.id===selected);}
 const size=bytes=>bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':Math.round(bytes/1024)+' KB';
 async function load(){catalog=await api('catalog');if(!catalog.characters.some(c=>c.id===selected))selected=catalog.characters[0].id;render();}
 function inputFile(accept,multiple,onFiles){const input=document.createElement('input');input.type='file';input.accept=accept;input.multiple=multiple;input.addEventListener('change',()=>{if(input.files.length)void busy(()=>onFiles([...input.files]));});input.click();}
 function render(){
  $('empty').hidden=true;$('editor').hidden=false;$('characters').replaceChildren();
  for(const c of catalog.characters){const button=make('button','',c.name);button.type='button';button.setAttribute('aria-pressed',String(c.id===selected));const missing=c.images.filter(x=>!x.exists).length+c.voices.filter(x=>!x.exists).length;button.append(make('small','',missing?`缺 ${missing}`:'齐全'));button.addEventListener('click',()=>{document.querySelectorAll('audio').forEach(a=>a.pause());selected=c.id;render();});$('characters').append(button);}
  const c=character();$('name').textContent=c.name;$('tagline').textContent=c.tagline;$('images').replaceChildren();
  for(const item of c.images){const card=make('article','image-card');if(item.exists){const image=make('img');image.src=item.url;image.alt=c.name+' · '+item.label;card.append(image);}else card.append(make('div','missing','尚未提供立绘'));
   card.append(make('strong','',item.label),make('div','file-size',item.exists?size(item.bytes):'缺少图片'));
   const button=make('button','',item.exists?'替换图片':'导入图片');button.type='button';button.addEventListener('click',()=>inputFile('image/png',false,files=>prepare(files,'image',item.slot)));card.append(button);$('images').append(card);
  }
  $('voice-area').hidden=!c.voices.length;renderVoices();$('backups').replaceChildren(...catalog.backups.map(b=>make('li','',new Date(b.time).toLocaleString()+' · '+b.label)));
 }
 function renderVoices(){
  const c=character(),term=$('search').value.trim();$('voices').replaceChildren();
  for(const item of c.voices.filter(v=>(v.label+' '+v.textZh+' '+v.textJa).includes(term))){const card=make('article','voice-card'),copy=make('div'),controls=make('div');const heading=make('strong','',item.label);heading.append(make('span','badge'+(item.exists?'':' missing'),item.exists?'已配音':'缺配音 · 保留字幕'));copy.append(heading);
   const key=c.id+':'+item.event,draft=drafts.get(key),zh=make('textarea'),ja=make('textarea');zh.value=draft?.zh??item.textZh;ja.value=draft?.ja??item.textJa;zh.maxLength=ja.maxLength=500;
   const zhLabel=make('label','','中文字幕'),jaLabel=make('label','','日语台词');zhLabel.append(zh);jaLabel.append(ja);copy.append(zhLabel,jaLabel);
   const edited=()=>drafts.set(key,{zh:zh.value,ja:ja.value});zh.addEventListener('input',edited);ja.addEventListener('input',edited);
   if(item.exists){const audio=make('audio');audio.controls=true;audio.preload='none';audio.src=item.url;audio.addEventListener('play',()=>document.querySelectorAll('audio').forEach(a=>{if(a!==audio)a.pause();}));controls.append(audio,make('div','file-size',size(item.bytes)));}
   const actions=make('div','voice-actions'),replace=make('button','',item.exists?'替换配音':'导入配音'),save=make('button','','保存台词');replace.type=save.type='button';
   replace.addEventListener('click',()=>inputFile('.wav,.mp3,.ogg',false,files=>prepare(files,'voice',item.event)));
   save.addEventListener('click',()=>busy(async()=>{await api('lines',{characterId:c.id,event:item.event,textZh:zh.value,textJa:ja.value,catalogHash:catalog.catalogHash});drafts.delete(key);await load();message('台词已保存并同步；原版本已备份。');}));actions.append(replace,save);controls.append(actions);card.append(copy,controls);$('voices').append(card);
  }
 }
 const dataUrl=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('无法读取 '+file.name));reader.readAsDataURL(file);});
 function validateMedia(file,kind){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),element=kind==='image'?new Image():new Audio();let timer;
  const clean=()=>{clearTimeout(timer);URL.revokeObjectURL(url);if(kind==='voice'){element.pause();element.removeAttribute('src');}};
  const valid=()=>{const seconds=kind==='voice'?element.duration:undefined;clean();resolve(seconds);};
  element.addEventListener(kind==='image'?'load':'loadedmetadata',valid,{once:true});element.addEventListener('error',()=>{clean();reject(new Error(file.name+' 无法预览，请检查文件是否完整。'));},{once:true});timer=setTimeout(()=>{clean();reject(new Error(file.name+' 读取超时。'));},10000);element.src=url;if(kind==='voice')element.preload='metadata';
 });}
 async function prepare(files,kind,fixedSlot){
  const c=character(),items=[];for(const file of files){
   if(file.size>16*1024*1024)throw new Error(file.name+' 超过 16 MB');
   let slot=fixedSlot,extension=file.name.split('.').at(-1).toLowerCase();
   if(!slot){const name=file.name.replace(/\.[^.]+$/,'');if(kind==='image')slot=name.replace(/^stage_([0-4])$/,'stage-$1');else slot=name==='win'?'win_small':name.replace(/^stage-([1-4])$/,'stage_$1');}
   const current=(kind==='image'?c.images:c.voices).find(x=>(kind==='image'?x.slot:x.event)===slot);if(!current)throw new Error('无法识别 '+file.name+'，请使用对应槽位的单张导入。');
   if(kind==='image'&&extension!=='png'||kind==='voice'&&!['wav','mp3','ogg'].includes(extension))throw new Error('不支持 '+file.name+' 的格式。');
   const durationSeconds=await validateMedia(file,kind);items.push({characterId:c.id,kind,slot,extension,expectedHash:current.sha256,durationSeconds,data:await dataUrl(file),fileName:file.name,label:current.label});
  }
  plan=items;$('import-list').replaceChildren(...items.map(i=>make('li','',i.fileName+' → '+c.name+' · '+i.label)));$('import-dialog').showModal();
 }
 $('search').addEventListener('input',renderVoices);
 $('refresh').addEventListener('click',()=>busy(async()=>{await load();message('素材列表已更新。');}));
 $('sync').addEventListener('click',()=>busy(async()=>{const result=await api('sync',{});await load();message(result.saved?'现用素材已同步到游戏和补丁源，旧版本已备份。':'现用素材已经一致，无需重复保存。');}));
 $('image-batch').addEventListener('change',event=>busy(()=>prepare([...event.target.files],'image')));
 $('voice-batch').addEventListener('change',event=>busy(()=>prepare([...event.target.files],'voice')));
 $('import-cancel').addEventListener('click',()=>{plan=[];$('import-dialog').close();});
 $('import-confirm').addEventListener('click',()=>busy(async()=>{if(!plan.length)return;await api('import',{files:plan});plan=[];$('import-dialog').close();await load();message('素材已导入、同步并备份。进行中的本地对局请先结束，再刷新游戏。');}));
 $('add').addEventListener('click',()=>$('add-dialog').showModal());$('add-cancel').addEventListener('click',()=>$('add-dialog').close());
 $('add-form').addEventListener('submit',event=>{event.preventDefault();void busy(async()=>{const result=await api('characters',{name:$('new-name').value,tagline:$('new-tagline').value});selected=result.characterId;$('add-dialog').close();$('add-form').reset();await load();message('角色已创建，可以补齐立绘和配音。联机请重启服务后使用新角色。');});});
 void busy(async()=>{if(token==='__QY_LOCAL_TOKEN__'||location.protocol==='file:')throw new Error('请先双击游戏目录中的 start-asset-manager.bat，再使用打开的管理页面。');await load();});
})();
