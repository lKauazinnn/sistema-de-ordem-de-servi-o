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

:: Garantir que a branch se chama main
git branch -M main 2>nul

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
  echo Criando commit: %COMMIT_MSG%
  git commit -m "%COMMIT_MSG%"
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
