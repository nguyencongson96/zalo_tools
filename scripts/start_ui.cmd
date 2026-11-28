@echo off
rem Bam dup de mo giao dien theo doi. Lan dau tu cai thu vien va build (can Node.js 20.19 tro len).
rem Giu cua so nay mo trong luc xem; dong cua so de tat.
cd /d "%~dp0.."
if not exist dist\index.html call npm install
if not exist dist\index.html call npm run build
node scripts\server.js --open
if errorlevel 1 pause
