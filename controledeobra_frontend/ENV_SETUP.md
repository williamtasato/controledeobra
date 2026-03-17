# Configuração de Variáveis de Ambiente

Este documento descreve todas as variáveis de ambiente necessárias para executar o frontend do Controle de Obras.

## Arquivos de Configuração

- `.env.example`: Exemplo de todas as variáveis disponíveis
- `.env.local`: Arquivo local com as configurações para desenvolvimento (não versionado)
- `.env.production`: Configurações para produção (opcional)

## Variáveis de Ambiente

### Configurações da Aplicação

| Variável | Descrição | Padrão | Exemplo |
|----------|-----------|--------|---------|
| `VITE_APP_TITLE` | Título da aplicação | `Controle de Obras` | `Meu Sistema de Obras` |
| `VITE_APP_LOGO` | URL do logo da aplicação | Placeholder | `https://seu-dominio.com/logo.png` |

### Configurações da API

| Variável | Descrição | Padrão | Exemplo |
|----------|-----------|--------|---------|
| `VITE_API_BASE_URL` | URL base da API | `http://localhost:3000/api` | `https://api.seu-dominio.com` |

### Ambiente

| Variável | Descrição | Valores | Padrão |
|----------|-----------|--------|--------|
| `VITE_ENVIRONMENT` | Ambiente de execução | `development`, `production` | `development` |

## Como Configurar

### Desenvolvimento Local

1. Copie o arquivo `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edite o arquivo `.env.local` com suas configurações locais:
   ```
   VITE_APP_TITLE=Controle de Obras
   VITE_APP_LOGO=https://placehold.co/128x128/E1E7EF/1F2937?text=App
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_ENVIRONMENT=development
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### Produção

1. Crie um arquivo `.env.production`:
   ```bash
   cp .env.example .env.production
   ```

2. Configure as variáveis para seu ambiente de produção:
   ```
   VITE_APP_TITLE=Controle de Obras
   VITE_APP_LOGO=https://seu-dominio.com/logo.png
   VITE_API_BASE_URL=https://api.seu-dominio.com
   VITE_ENVIRONMENT=production
   ```

3. Faça o build:
   ```bash
   npm run build
   ```

## Notas Importantes

- O arquivo `.env.local` **não deve ser versionado** no Git (já está no `.gitignore`)
- Use `.env.example` como referência para novas configurações
- As variáveis de ambiente do Vite devem começar com `VITE_` para serem expostas ao cliente
- Variáveis sensíveis (como chaves de API) devem ser configuradas no servidor backend, não no frontend
- Para mudar a URL da API em tempo de execução, você precisará fazer um novo build

## Acesso às Variáveis no Código

As variáveis de ambiente podem ser acessadas no código usando `import.meta.env`:

```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const appTitle = import.meta.env.VITE_APP_TITLE;
```

Exemplo no arquivo `api.ts`:
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
});
```

Exemplo no arquivo `const.ts`:
```typescript
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Controle de Obras";
```
