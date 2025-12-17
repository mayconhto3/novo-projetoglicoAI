#!/usr/bin/env node

/**
 * Script de Deploy Automatizado para GitHub Pages
 * 
 * Este script automatiza o processo de build e deploy
 * Execute com: node deploy.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output no terminal
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function execute(command, description) {
    try {
        log(`\n🔄 ${description}...`, 'cyan');
        execSync(command, { stdio: 'inherit' });
        log(`✅ ${description} - Concluído!`, 'green');
        return true;
    } catch (error) {
        log(`❌ Erro ao ${description}`, 'red');
        log(error.message, 'red');
        return false;
    }
}

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        log(`✅ ${description} encontrado`, 'green');
        return true;
    } else {
        log(`⚠️  ${description} não encontrado`, 'yellow');
        return false;
    }
}

async function deploy() {
    log('\n🚀 Iniciando processo de deploy para GitHub Pages\n', 'blue');

    // Verificações iniciais
    log('📋 Verificando pré-requisitos...', 'cyan');

    checkFile('package.json', 'package.json');
    checkFile('vite.config.ts', 'vite.config.ts');
    checkFile('.git', 'Repositório Git');

    // Verificar se gh-pages está instalado
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasGhPages = packageJson.devDependencies?.['gh-pages'];

    if (!hasGhPages) {
        log('\n📦 gh-pages não encontrado. Instalando...', 'yellow');
        if (!execute('npm install --save-dev gh-pages', 'Instalando gh-pages')) {
            process.exit(1);
        }
    }

    // Limpar build anterior
    if (fs.existsSync('dist')) {
        log('\n🧹 Limpando build anterior...', 'cyan');
        fs.rmSync('dist', { recursive: true, force: true });
        log('✅ Build anterior removido', 'green');
    }

    // Instalar dependências
    if (!execute('npm install', 'Instalando dependências')) {
        process.exit(1);
    }

    // Build da aplicação
    if (!execute('npm run build', 'Fazendo build da aplicação')) {
        process.exit(1);
    }

    // Verificar se o build foi criado
    if (!checkFile('dist', 'Pasta dist')) {
        log('\n❌ Build falhou - pasta dist não foi criada', 'red');
        process.exit(1);
    }

    // Deploy para GitHub Pages
    if (!execute('npx gh-pages -d dist', 'Fazendo deploy para GitHub Pages')) {
        process.exit(1);
    }

    log('\n✨ Deploy concluído com sucesso!', 'green');
    log('\n📝 Próximos passos:', 'cyan');
    log('1. Acesse seu repositório no GitHub', 'yellow');
    log('2. Vá em Settings → Pages', 'yellow');
    log('3. Selecione a branch "gh-pages" como source', 'yellow');
    log('4. Aguarde alguns minutos e acesse sua aplicação\n', 'yellow');
}

// Executar deploy
deploy().catch(error => {
    log('\n❌ Erro durante o deploy:', 'red');
    log(error.message, 'red');
    process.exit(1);
});
