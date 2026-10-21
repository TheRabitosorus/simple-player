@echo off
cd /d "%~dp0"
echo Envoi des changements vers GitHub...
git add -A
set /p msg="Message (ou appuie sur Entree pour 'Mise a jour'): "
if "%msg%"=="" set msg=Mise a jour
git commit -m "%msg%"
git push
echo.
echo Termine.
pause
