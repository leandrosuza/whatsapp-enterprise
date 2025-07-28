# 📚 Documentação Técnica - WhatsApp Enterprise

## 🏗️ Arquitetura do Sistema

### Visão Geral
O WhatsApp Enterprise é uma aplicação full-stack que utiliza uma arquitetura de microserviços com as seguintes camadas:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Databases     │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│  MongoDB/Redis  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   OpenAI API    │    │   File Storage  │
│   Web.js        │    │   (IA)          │    │   (Sessions)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Componentes Principais

#### 1. Frontend (Next.js + TypeScript)
- **Framework**: Next.js 14 com App Router
- **Linguagem**: TypeScript
- **Styling**: Tailwind CSS + Headless UI
- **Estado**: Zustand + React Query
- **Autenticação**: NextAuth.js

#### 2. Backend (Node.js + Express)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Linguagem**: TypeScript
- **ORM**: Mongoose (MongoDB)
- **Cache**: Redis
- **Autenticação**: JWT + bcrypt

#### 3. Integrações
- **WhatsApp**: whatsapp-web.js
- **IA**: OpenAI GPT-4
- **Automação**: Puppeteer
- **Tempo Real**: Socket.io

## 🗄️ Estrutura do Banco de Dados

### MongoDB Collections

#### Users
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  name: String,
  role: String, // 'admin', 'user', 'manager'
  company: String,
  plan: String, // 'free', 'premium', 'enterprise'
  settings: {
    notifications: Boolean,
    autoReply: Boolean,
    aiEnabled: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Contacts
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  whatsappId: String,
  name: String,
  phone: String,
  email: String,
  tags: [String],
  category: String, // 'lead', 'customer', 'prospect'
  status: String, // 'active', 'inactive', 'blocked'
  notes: String,
  lastContact: Date,
  metadata: {
    source: String,
    campaign: String,
    score: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Conversations
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  contactId: ObjectId,
  whatsappId: String,
  messages: [{
    id: String,
    type: String, // 'text', 'image', 'audio', 'document'
    content: String,
    timestamp: Date,
    direction: String, // 'in', 'out'
    status: String // 'sent', 'delivered', 'read'
  }],
  status: String, // 'active', 'closed', 'archived'
  lastMessage: Date,
  unreadCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Automations
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  name: String,
  type: String, // 'auto-reply', 'campaign', 'workflow'
  triggers: [{
    type: String, // 'message', 'time', 'event'
    condition: String,
    value: Mixed
  }],
  actions: [{
    type: String, // 'send-message', 'tag-contact', 'update-status'
    data: Mixed
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Campaigns
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  name: String,
  description: String,
  message: String,
  contacts: [ObjectId],
  status: String, // 'draft', 'scheduled', 'running', 'completed'
  schedule: {
    startDate: Date,
    endDate: Date,
    timezone: String
  },
  stats: {
    sent: Number,
    delivered: Number,
    read: Number,
    failed: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Redis Keys

```bash
# Sessions
session:{sessionId} -> Session data

# WhatsApp Connections
whatsapp:{userId}:connection -> Connection status
whatsapp:{userId}:qr -> QR code data

# Cache
cache:contacts:{userId} -> User contacts
cache:conversations:{userId} -> User conversations

# Rate Limiting
rate:send:{userId} -> Message sending rate
rate:api:{userId} -> API rate limiting
```

## 🔌 APIs e Endpoints

### Autenticação
```typescript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
POST /api/auth/refresh
```

### Usuários
```typescript
GET /api/users
GET /api/users/:id
PUT /api/users/:id
DELETE /api/users/:id
POST /api/users/:id/avatar
```

### Contatos
```typescript
GET /api/contacts
POST /api/contacts
GET /api/contacts/:id
PUT /api/contacts/:id
DELETE /api/contacts/:id
POST /api/contacts/import
GET /api/contacts/export
```

### Conversas
```typescript
GET /api/conversations
GET /api/conversations/:id
POST /api/conversations/:id/messages
PUT /api/conversations/:id/status
GET /api/conversations/:id/history
```

### WhatsApp
```typescript
POST /api/whatsapp/connect
GET /api/whatsapp/status
GET /api/whatsapp/qr
POST /api/whatsapp/send
POST /api/whatsapp/send-bulk
POST /api/whatsapp/disconnect
```

### Automações
```typescript
GET /api/automations
POST /api/automations
GET /api/automations/:id
PUT /api/automations/:id
DELETE /api/automations/:id
POST /api/automations/:id/test
```

### Campanhas
```typescript
GET /api/campaigns
POST /api/campaigns
GET /api/campaigns/:id
PUT /api/campaigns/:id
DELETE /api/campaigns/:id
POST /api/campaigns/:id/schedule
GET /api/campaigns/:id/stats
```

### IA e Analytics
```typescript
POST /api/ai/generate-reply
POST /api/ai/analyze-sentiment
GET /api/analytics/overview
GET /api/analytics/conversations
GET /api/analytics/campaigns
GET /api/analytics/contacts
```

## 🤖 Integração com IA

### OpenAI GPT-4 Integration
```typescript
interface AIResponse {
  message: string;
  confidence: number;
  suggestions: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

class AIService {
  async generateReply(context: string, history: Message[]): Promise<AIResponse>
  async analyzeSentiment(message: string): Promise<string>
  async suggestResponses(conversation: Conversation): Promise<string[]>
  async categorizeContact(messages: Message[]): Promise<string>
}
```

### Automações Inteligentes
```typescript
interface AutomationRule {
  trigger: {
    type: 'message' | 'time' | 'event';
    condition: string;
    value: any;
  };
  actions: {
    type: 'send-message' | 'tag-contact' | 'update-status' | 'ai-reply';
    data: any;
  }[];
  aiEnabled: boolean;
}
```

## 🔧 Configuração de Desenvolvimento

### Variáveis de Ambiente

#### Backend (.env)
```env
# Server
NODE_ENV=development
PORT=3001
HOST=localhost

# Database
MONGODB_URI=mongodb://localhost:27017/whatsapp_enterprise
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_DATA_PATH=./data

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log
```

#### Frontend (.env.local)
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Features
NEXT_PUBLIC_AI_ENABLED=true
NEXT_PUBLIC_AUTOMATION_ENABLED=true
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

### Scripts de Desenvolvimento

```bash
# Instalar todas as dependências
npm run install:all

# Configurar variáveis de ambiente
npm run setup:env

# Desenvolvimento
npm run dev

# Build
npm run build

# Testes
npm run test

# Linting
npm run lint

# Formatação
npm run format
```

## 🚀 Deploy

### Docker
```bash
# Build e start
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Deploy
```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
npm start
```

## 🔒 Segurança

### Autenticação
- JWT tokens com refresh
- Bcrypt para senhas
- Rate limiting
- CORS configurado

### WhatsApp Security
- Sessões isoladas por usuário
- Validação de números
- Proteção contra spam
- Logs de auditoria

### API Security
- Validação de entrada
- Sanitização de dados
- Rate limiting por IP
- HTTPS obrigatório

## 📊 Monitoramento

### Logs
- Winston para logging estruturado
- Rotação de logs
- Níveis de log configuráveis

### Métricas
- Performance monitoring
- Error tracking
- User analytics
- WhatsApp API limits

### Health Checks
```typescript
GET /api/health
GET /api/health/database
GET /api/health/redis
GET /api/health/whatsapp
```

## 🧪 Testes

### Estrutura de Testes
```
tests/
├── unit/
│   ├── services/
│   ├── controllers/
│   └── models/
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    ├── whatsapp/
    └── ui/
```

### Comandos de Teste
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📈 Performance

### Otimizações
- Redis caching
- Database indexing
- Image optimization
- Code splitting
- Lazy loading

### Benchmarks
- API response time < 200ms
- WhatsApp message delivery < 5s
- UI render time < 2s
- Database queries < 100ms

## 🔄 Versionamento

### Semantic Versioning
- MAJOR.MINOR.PATCH
- Breaking changes = MAJOR
- New features = MINOR
- Bug fixes = PATCH

### Changelog
- Conventional Commits
- Automated changelog generation
- Release notes

---

*Esta documentação é atualizada regularmente. Para dúvidas técnicas, abra uma issue no GitHub.* 