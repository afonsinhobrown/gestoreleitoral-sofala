@echo off
TITLE SISTEMA STAE SOFALA 2026 - INICIALIZADOR COMPLETO
COLOR 0A

echo ============================================================
echo      SISTEMA DE GESTAO ELEITORAL - STAE SOFALA 2026
echo ============================================================
echo.
echo Iniciando todos os modulos do sistema...
echo.

:: 1. Iniciar Servidor Backend (API)
echo [1/3] Iniciando SERVIDOR API (Porta 5000)...
start "STAE API SERVER" cmd /k "cd server && npm run dev"

:: 2. Iniciar Dashboard Administrativo
echo [2/3] Iniciando DASHBOARD ADMINISTRATIVO...
start "STAE ADMIN DASHBOARD" cmd /k "cd stae-admin-dashboard && npm run dev"

:: 3. Iniciar Portal Mobile
echo [3/3] Iniciando PORTAL MOBILE...
start "STAE MOBILE PORTAL" cmd /k "cd stae-mobile-portal && npm run dev"

echo.
echo ============================================================
echo  SISTEMA INICIADO COM SUCESSO!
echo.
echo  - API: http://localhost:5000
echo  - ADMIN: Verificar porta no terminal (geralmente 5173/5174)
echo  - MOBILE: Verificar porta no terminal (geralmente 5173/5174)
echo.
echo  Mantenha as janelas dos terminais abertas.
echo ============================================================
pause
