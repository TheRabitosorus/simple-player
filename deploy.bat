@echo off
setlocal

set "ZIP=%USERPROFILE%\Desktop\simple-player.zip"
set "DEST=F:\GitHub Repo\simple-player"

if not exist "%ZIP%" (
  echo Fichier introuvable : %ZIP%
  echo Assure-toi que le zip s'appelle bien "simple-player.zip" et qu'il est sur le Bureau.
  pause
  exit /b 1
)

echo Extraction de "%ZIP%"
echo vers "%DEST%" ...
powershell -NoProfile -Command "Expand-Archive -Path '%ZIP%' -DestinationPath '%DEST%' -Force"

if errorlevel 1 (
  echo Une erreur est survenue pendant l'extraction.
  pause
  exit /b 1
)

cd /d "%DEST%"

REM Ancienne copie imbriquee (simple-player\simple-player) : doublon perime, on la supprime.
if exist "%DEST%\simple-player\src\main.js" (
  echo Suppression de l'ancien dossier imbrique simple-player\simple-player ...
  rmdir /s /q "%DEST%\simple-player"
)

echo.
echo Envoi vers GitHub...
git add -A

git diff --cached --quiet
if %errorlevel%==0 (
  echo Rien de nouveau a envoyer ^(les fichiers etaient deja a jour^).
  pause
  exit /b 0
)

set "MSG=Mise a jour automatique - %date% %time%"
git commit -m "%MSG%"
git push

echo.
echo Termine ! Code envoye sur GitHub.
pause
