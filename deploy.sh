#!/bin/bash

echo ""
echo "========================================"
echo "  Deploy GlucoAI - GitHub Pages"
echo "========================================"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado!"
    echo "Por favor, instale o Node.js: https://nodejs.org"
    exit 1
fi

echo "[OK] Node.js encontrado"
echo ""

# Executar script de deploy
echo "Iniciando deploy..."
echo ""
node deploy.js

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERRO] Deploy falhou!"
    exit 1
fi

echo ""
echo "========================================"
echo "  Deploy concluído com sucesso!"
echo "========================================"
echo ""
