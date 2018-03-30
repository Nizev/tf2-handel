@echo off
npm install
if %errorlevel% == 0 goto quit
pause
:quit