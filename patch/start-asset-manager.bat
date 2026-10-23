@echo off
chcp 65001 >nul
cd /d "%~dp0"
node tools\asset-manager-server.cjs --open
if errorlevel 1 pause
