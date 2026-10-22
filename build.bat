@echo off
chcp 65001 >nul
title VidiMahjong 中文改造构建器
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-from-upstream.ps1"
if errorlevel 1 (
  echo.
  echo 构建失败。请检查网络是否可以访问 GitHub。
  pause
  exit /b 1
)
echo.
echo 构建成功。生成的 VidiMahjong-zh-customized.zip 位于当前文件夹。
pause
