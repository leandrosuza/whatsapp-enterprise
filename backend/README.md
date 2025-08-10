# WhatsApp Enterprise Backend

Backend API para o sistema WhatsApp Enterprise, construído com Node.js, Express, TypeScript e Sequelize.

## 🏗️ Estrutura do Projeto

```
backend/
├── src/
│   ├── core/                 # Camada de domínio (DDD)
│   │   ├── entities/         # Entidades do domínio
│   │   ├── repositories/     # Interfaces dos repositórios
│   │   └── services/         # Serviços de domínio
│   ├── infrastructure/       # Camada de infraestrutura
│   │   ├── database/         # Configuração do banco de dados
│   │   ├── middleware/       # Middlewares do Express
│   │   └── utils/            # Utilitários
│   ├── presentation/         # Camada de apresentação
│   │   ├── controllers/      # Controladores
│   │   ├── routes/           # Rotas da API
│   │   └── validators/       # Validações
│   ├── scripts/              # Scripts utilitários
│   └── shared/               # Código compartilhado
├── database/                 # Arquivos do banco de dados
├── logs/                     # Logs da aplicação
└── dist/                     # Build compilado
```

## 🚀 Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev          # Inicia o servidor em modo desenvolvimento
npm run build        # Compila o TypeScript
npm run start        # Inicia o servidor em produção
```

### Banco de Dados
```bash
npm run init-db      # Inicializa o banco de dados
npm run create-admin # Cria um usuário administrador
npm run seed-ddd     # Popula a tabela de DDDs
```

### Qualidade de Código
```bash
npm run lint         # Executa o ESLint
npm run lint:fix     # Corrige problemas do ESLint
npm run format       # Formata o código com Prettier
```

## 📋 Scripts Utilitários

### `src/scripts/initDb.ts`
Inicializa o banco de dados SQLite e cria as tabelas necessárias.

### `src/scripts/createAdmin.ts`
Cria um usuário administrador padrão no sistema.

### `src/scripts/seedDDDs.ts`
Popula a tabela de DDDs com todos os códigos de área do Brasil.

### `src/scripts/autoReconnectProfiles.ts`
Script para reconectar automaticamente perfis do WhatsApp que foram desconectados.

## 🗄️ Banco de Dados

O projeto utiliza SQLite como banco de dados principal:
- **Arquivo**: `database/whatsapp_enterprise.sqlite`
- **ORM**: Sequelize
- **Configuração**: `src/infrastructure/database/database.ts`

## 🔧 Configuração

1. Copie o arquivo `.env.example` para `.env`
2. Configure as variáveis de ambiente necessárias
3. Execute `npm install` para instalar as dependências
4. Execute `npm run init-db` para inicializar o banco de dados
5. Execute `npm run create-admin` para criar um administrador
6. Execute `npm run dev` para iniciar o servidor

## 📝 Logs

Os logs são armazenados em:
- `logs/app.log` - Logs da aplicação
- `logs/error.log` - Logs de erro
- `logs/combined.log` - Logs combinados

## 🧹 Limpeza Automática

O projeto inclui configurações para limpeza automática de:
- Cache do WhatsApp Web.js (`.wwebjs_cache/`, `.wwebjs_auth/`)
- Logs antigos (mais de 7 dias)
- Arquivos temporários

## 🔒 Segurança

- Rate limiting configurado
- Validação de entrada com express-validator
- Autenticação JWT
- CORS configurado
- Helmet para headers de segurança

## 📊 Monitoramento

- Health check endpoint: `/health`
- Logs estruturados com Winston
- Métricas de performance 