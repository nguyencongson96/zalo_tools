@echo off
cd /d "%~dp0.."
if not exist data\log mkdir data\log
node scripts\check.js >> data\log\check.log 2>&1
exit /b %errorlevel%
