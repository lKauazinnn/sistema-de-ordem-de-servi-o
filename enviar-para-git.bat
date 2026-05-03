@echo off
chcp 65001>nul
title OrdemFlow - Enviar para GitHub

echo.
echo  ========================================
echo    OrdemFlow - Publicar no GitHub
echo  ========================================
echo.

:: Entrar na pasta do projeto (mesmo que o bat seja executado de outro lugar)
cd /d "%~dp0"

:: Verificar se git esta instalado
git --version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Git nao encontrado. Instale em https://git-scm.com
  pause
  exit /b 1
)

:: Inicializar repositorio se nao existir
if not exist ".git" (
  echo Inicializando repositorio git...
  git init
  git branch -M main
)

:: Configurar remote origin se nao existir
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo Adicionando remote origin...
  git remote add origin https://github.com/lKauazinnn/sistema-de-ordem-de-servi-o.git
) else (
  echo Remote origin ja configurado.
)

:: Garantir que os comandos rodem na branch main (evita detached HEAD)
git rev-parse --verify main >nul 2>&1
if errorlevel 1 (
  git ls-remote --exit-code --heads origin main >nul 2>&1
  if not errorlevel 1 (
    git switch -c main --track origin/main
  ) else (
    git switch -c main
  )
) else (
  git switch main
)

if errorlevel 1 (
  echo [ERRO] Nao foi possivel trocar para a branch main.
  pause
  exit /b 1
)

:: Perguntar mensagem de commit
echo.
set /p COMMIT_MSG=Mensagem do commit (Enter para usar data/hora automatica): 

if "%COMMIT_MSG%"=="" (
  for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set DATA=%%c-%%b-%%a
  for /f "tokens=1-2 delims=: " %%a in ('time /t') do set HORA=%%a%%b
  set COMMIT_MSG=atualizacao %DATA% %HORA%
)

echo.
echo Adicionando arquivos...
git add .

echo Verificando se ha alteracoes...
git diff --cached --quiet
if not errorlevel 1 (
  echo Nao ha alteracoes para commitar.
) else (
  set "GIT_USER_NAME="
  set "GIT_USER_EMAIL="
  for /f "delims=" %%i in ('git config user.name') do set "GIT_USER_NAME=%%i"
  for /f "delims=" %%i in ('git config user.email') do set "GIT_USER_EMAIL=%%i"

  if "%GIT_USER_NAME%"=="" (
    echo.
    echo [ERRO] Identidade Git nao configurada ^(user.name^).
    echo Configure uma vez e execute novamente:
    echo   git config --global user.name "Seu Nome"
    echo   git config --global user.email "seu-email@exemplo.com"
    pause
    exit /b 1
  )

  if "%GIT_USER_EMAIL%"=="" (
    echo.
    echo [ERRO] Identidade Git nao configurada ^(user.email^).
    echo Configure uma vez e execute novamente:
    echo   git config --global user.name "Seu Nome"
    echo   git config --global user.email "seu-email@exemplo.com"
    pause
    exit /b 1
  )

  echo Criando commit: %COMMIT_MSG%
  git commit -m "%COMMIT_MSG%"
  if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel criar o commit. Corrija o erro acima e tente novamente.
    pause
    exit /b 1
  )
)

echo.
echo Sincronizando com o GitHub...
git ls-remote --exit-code --heads origin main >nul 2>&1
if not errorlevel 1 (
  git pull --rebase origin main
  if errorlevel 1 (
    echo.
    echo [ERRO] Houve conflito ao sincronizar com o remoto.
    echo Resolva os conflitos e depois rode:
    echo   git add .
    echo   git rebase --continue
    echo ou, se quiser cancelar:
    echo   git rebase --abort
    pause
    exit /b 1
  )
) else (
  echo Branch main ainda nao existe no remoto. Continuando primeiro envio...
)

echo.
echo Enviando para GitHub...
git push -u origin main

if errorlevel 1 (
  echo.
  echo [AVISO] Push falhou. Possivel motivo: autenticacao necessaria.
  echo.
  echo Opcoes de autenticacao:
  echo   1. Git Credential Manager ^(windows^) - normalmente ja esta instalado
  echo   2. Token pessoal: va em github.com ^> Settings ^> Developer Settings ^> Personal Access Tokens
  echo      e use como senha quando solicitado
  echo.
  echo Tente digitar suas credenciais do GitHub a seguir:
  git push -u origin main
)

echo.
echo  ========================================
echo    Concluido!
echo  ========================================
echo.
pause
