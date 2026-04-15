@echo off
setlocal

title OrdemFlow Tech - Inicializacao Local

cd /d "%~dp0"

echo ==========================================
echo   OrdemFlow Tech - Setup Local
echo ==========================================
echo.

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado. Instale o Node.js 18+ e tente novamente.
  exit /b 1
)

if not exist ".env.local" (
  echo [ERRO] Arquivo .env.local nao encontrado na raiz do projeto.
  echo        Crie com base em .env.example antes de iniciar.
  exit /b 1
)

echo [1/3] Instalando dependencias do frontend...
call npm.cmd --prefix web install
if errorlevel 1 (
  echo [ERRO] Falha ao instalar dependencias.
  exit /b 1
)

echo.
echo [2/3] Executando testes automatizados...
call npm.cmd --prefix web run test
if errorlevel 1 (
  echo [ERRO] Testes falharam. Corrija antes de seguir.
  exit /b 1
)

echo.
echo [3/3] Iniciando servidor local (Vite)...
echo Acesse: http://localhost:5173
call npm.cmd --prefix web run dev

endlocal
