@echo off
title ngrok - Tunel publico
color 0A

echo ================================================
echo   NGROK - Expondo sistema na porta 5173
echo ================================================
echo.

:: Verifica se o ngrok esta instalado
where ngrok >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERRO] ngrok nao encontrado no PATH.
    echo.
    echo  Instale via: winget install ngrok
    echo  Ou baixe em: https://ngrok.com/download
    echo  Apos instalar, autentique com: ngrok config add-authtoken SEU_TOKEN
    echo.
    pause
    exit /b 1
)

echo [OK] ngrok encontrado.
echo [..] Iniciando tunel HTTP na porta 5173 com dominio fixo...
echo.
echo  URL publica: https://legislate-lather-overarch.ngrok-free.dev
echo  Acesse o painel local em: http://127.0.0.1:4040
echo.
echo  Pressione CTRL+C para encerrar o tunel.
echo.

ngrok http --url=legislate-lather-overarch.ngrok-free.dev 5173
