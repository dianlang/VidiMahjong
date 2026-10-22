@echo off
chcp 65001 >nul
cd /d "%~dp0server"
if not exist "node_modules" (
  echo 正在安装联机服务器依赖……
  npm install
  if errorlevel 1 (
    echo 依赖安装失败，请检查 Node.js 和网络。
    pause
    exit /b 1
  )
)
echo 正在启动 VidiMahjong 联机服务器……
npm start
pause
