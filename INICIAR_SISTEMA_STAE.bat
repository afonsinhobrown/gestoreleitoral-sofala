@echo off
title SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL - SOFALA 2026
color 0b
echo ======================================================================
echo           SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL
echo           SISTEMA DE GESTÃO ELEITORAL PROVINCIAL - 2026
echo ======================================================================
echo.
echo [1/3] A INICIAR SERVIDOR NACIONAL (API)...
start "STAE - SERVIDOR" cmd /k "cd server && npm start"

echo [2/3] A INICIAR PORTAL DO CANDIDATO (MOBILE)...
start "STAE - PORTAL CANDIDATO" cmd /k "cd stae-mobile-portal && npm run dev"

echo [3/3] A INICIAR PAINEL ADMINISTRATIVO (DASHBOARD)...
start "STAE - PAINEL GESTOR" cmd /k "cd stae-admin-dashboard && npm run dev"

echo.
echo ======================================================================
echo O SISTEMA ESTÁ EM EXECUÇÃO. PODE FECHAR ESTA JANELA.
echo ======================================================================
pause
