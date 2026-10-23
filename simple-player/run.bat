@echo off
setlocal

set "DIR=F:\GitHub Repo\simple-player"

if not exist "%DIR%" (
  echo Dossier introuvable : %DIR%
  pause
  exit /b 1
)

cd /d "%DIR%"

echo Verification des dependances...
call npm install

echo.
echo Lancement de Simple Player...
call npm start

pause
