@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "server\node_modules\ws\package.json" (
  call npm --prefix server ci --ignore-scripts --no-audit --no-fund
  if errorlevel 1 goto failed
)
node tools\download-cloudflared.cjs
if errorlevel 1 goto failed
node "%~dp0tools\friend-launcher.cjs" --tunnel
:failed
pause
