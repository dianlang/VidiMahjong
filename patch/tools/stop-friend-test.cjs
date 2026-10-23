'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),file=path.join(root,'.local-tools/friend-session.json');
if(!fs.existsSync(file)){console.log('当前没有本工具启动的试玩。');process.exit(0);}
const record=JSON.parse(fs.readFileSync(file,'utf8'));if(path.resolve(record.root)!==root)throw Error('试玩记录不属于当前项目');
const items=[{pid:record.tunnelPid,marker:path.join(root,'.local-tools/cloudflared-windows-amd64.exe')},{pid:record.backendPid,marker:'queye-friend-backend-'+record.pid},{pid:record.pid,marker:path.join(root,'tools/friend-launcher.cjs')}].filter(x=>Number.isSafeInteger(x.pid)&&x.pid>0);
const script="$ErrorActionPreference = 'Stop'; $taskInput = [Console]::In.ReadToEnd() | ConvertFrom-Json; $taskCutoff = ([DateTime]::Parse($taskInput.startedAt)).ToUniversalTime().AddSeconds(-10); foreach ($taskItem in $taskInput.items) { $taskProcess = Get-CimInstance Win32_Process -Filter ('ProcessId = '+$taskItem.pid); if ($taskProcess) { if (-not $taskProcess.CommandLine.Contains($taskItem.marker) -or $taskProcess.CreationDate.ToUniversalTime() -lt $taskCutoff) { throw 'Process identity changed; refusing to stop it' }; [Diagnostics.Process]::GetProcessById([int]$taskItem.pid).Kill() } }";
if(process.platform!=='win32')throw Error('此停止工具用于 Windows；其他系统请在启动终端按 Ctrl+C');
const input=JSON.stringify({items,startedAt:record.startedAt}).replace(/[^\x00-\x7F]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
const result=spawnSync('powershell.exe',['-NoProfile','-Command',script],{input,encoding:'utf8',windowsHide:true});if(result.status!==0){console.error(result.stderr||'无法停止试玩，请关闭启动窗口。');process.exitCode=1;}else{fs.rmSync(file,{force:true});console.log('临时链接、本机对局与相关子进程已停止。');}
