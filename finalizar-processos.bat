@echo off
title OrdemFlow Tech - Finalizando processos

echo ==========================================
echo   OrdemFlow Tech - Finalizando processos
echo ==========================================
echo.

echo Encerrando processos na porta 5173 (Vite)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173"') do (
    taskkill /PID %%a /F >nul 2>nul
)

echo Encerrando processos Node.js...
taskkill /IM node.exe /F >nul 2>nul

echo Encerrando processos npm...
taskkill /IM npm.cmd /F >nul 2>nul

echo.
echo Todos os processos foram encerrados.
echo.
pause
