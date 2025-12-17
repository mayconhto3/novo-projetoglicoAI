# Exemplo de configuração do Vite para GitHub Pages

Este arquivo mostra como configurar o `vite.config.ts` para deploy no GitHub Pages.

## Configuração Atual (Desenvolvimento Local)

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```

## Configuração para GitHub Pages

Para fazer deploy no GitHub Pages, adicione a propriedade `base`:

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // ⚠️ Adicione esta linha para GitHub Pages
      base: '/glucoai/', // Substitua pelo nome do seu repositório
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```

## Configuração Dinâmica (Recomendado)

Para ter uma configuração que funciona tanto em desenvolvimento quanto em produção:

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Define o base path baseado no ambiente
    const base = mode === 'production' ? '/glucoai/' : '/';
    
    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```

## Notas Importantes

1. **Nome do Repositório**: Substitua `/glucoai/` pelo nome exato do seu repositório no GitHub
2. **Desenvolvimento Local**: Para desenvolvimento local, use `base: '/'` ou remova a propriedade
3. **Produção**: Para GitHub Pages, use `base: '/nome-do-repositorio/'`
4. **Vercel/Netlify**: Para estas plataformas, use `base: '/'` (não precisa do nome do repositório)
