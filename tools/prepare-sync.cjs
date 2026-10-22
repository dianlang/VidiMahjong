'use strict';
// Prepare a reviewed hash manifest; this command never writes to the game folder.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),target='G:\\QueYe';
const hash=p=>fs.existsSync(p)?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase():null;
const expected=new Map();
for(const name of ['update-manifest.json','update-v5.1-manifest.json']){
 const file=path.join(root,'release',name);if(fs.existsSync(file))for(const item of JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')))expected.set(item.Path.replaceAll('\\','/'),item.After);
}
const excluded=new Set(['.git','.qa-deps','.npm-cache','release','node_modules']);
const files=[];
function walk(dir){for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
 if(excluded.has(entry.name))continue;
 const relative=path.join(dir,entry.name),source=path.join(root,relative);
 if(entry.isDirectory())walk(relative);
 else if(!entry.name.endsWith('.zip')&&entry.name!=='package-lock.json'){
  const key=relative.replaceAll('\\','/'),before=hash(path.join(target,relative)),after=hash(source);
  if(before===after)continue;
  if(expected.has(key)&&expected.get(key)!==before)throw new Error('Game file changed since v5.1: '+key);
  files.push({Path:key,Before:before,After:after,Bytes:fs.statSync(source).size});
 }
}}
walk('');fs.mkdirSync(path.join(root,'release'),{recursive:true});fs.writeFileSync(path.join(root,'release/update-v6-manifest.json'),JSON.stringify(files,null,2));console.log(JSON.stringify({changed:files.length,existing:files.filter(f=>f.Before).length,new:files.filter(f=>!f.Before).length,bytes:files.reduce((sum,f)=>sum+f.Bytes,0)}));
