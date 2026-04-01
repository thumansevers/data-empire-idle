@echo off
setlocal
set "GAME_FILE=%~dp0index.html"
if not exist "%GAME_FILE%" (
  echo [ERROR] index.html not found.
  pause
  exit /b 1
)
start "" "%GAME_FILE%"
echo Game launched in default browser.
