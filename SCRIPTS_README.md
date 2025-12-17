# Scripts de Deploy - GlucoAI

Este diretório contém scripts auxiliares para facilitar o processo de deploy.

## 📜 Scripts Disponíveis

### deploy.js
Script automatizado para deploy no GitHub Pages.

**Como usar:**
```bash
node deploy.js
```

Este script irá:
1. Verificar pré-requisitos
2. Instalar gh-pages (se necessário)
3. Limpar build anterior
4. Instalar dependências
5. Fazer build da aplicação
6. Fazer deploy para GitHub Pages

### deploy.bat (Windows)
Script batch para Windows que executa o deploy.js

**Como usar:**
```bash
deploy.bat
```

### deploy.sh (Linux/Mac)
Script shell para Linux/Mac que executa o deploy.js

**Como usar:**
```bash
chmod +x deploy.sh
./deploy.sh
```

## 🔧 Configuração Necessária

Antes de usar os scripts, certifique-se de:

1. Ter configurado o `vite.config.ts` com o `base` correto
2. Ter um repositório Git configurado
3. Ter o repositório no GitHub
4. Ter Node.js instalado

## 📝 Notas

- Os scripts verificam automaticamente se as dependências estão instaladas
- Em caso de erro, mensagens detalhadas serão exibidas
- O processo pode levar alguns minutos dependendo do tamanho do projeto
