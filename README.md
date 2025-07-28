# 📱 WhatsApp Enterprise

> **Sistema Inteligente de Gerenciamento WhatsApp para Negócios**

Uma plataforma web moderna que transforma o WhatsApp em uma ferramenta poderosa para negócios, oferecendo automação, inteligência artificial e interface administrativa completa.

## 🚀 Sobre o Projeto

O **WhatsApp Enterprise** é uma solução completa que combina:
- **🔄 Automação Inteligente** com IA integrada
- **📊 Gestão Avançada** de leads e conversas
- **📨 Envio em Massa** com múltiplos números
- **🎨 Interface Moderna** e totalmente responsiva
- **🔒 Sistema de Autenticação** robusto e seguro
- **🤖 Integração WhatsApp** com Web.js
- **👥 Gestão de Perfis** WhatsApp
- **📈 Analytics** e relatórios em tempo real

## 🛠️ Tecnologias

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, SQLite
- **WhatsApp:** whatsapp-web.js, Puppeteer
- **Autenticação:** JWT, bcrypt
- **Estilização:** Glass morphism, animações CSS, gradientes modernos

## ⚡ Como Usar

### 1. Instalação Rápida
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/whatsapp-enterprise.git
cd whatsapp-enterprise

# Instale as dependências
npm install

# Configure o ambiente
cp backend/env.example backend/.env
cp frontend/env.local.example frontend/.env.local

# Crie o usuário admin
cd backend && npm run create-admin

# Inicie o projeto
npm run dev
```

### 2. Acesse o Sistema
- **URL:** `http://localhost:3000/admin/login`
- **Email:** `admin@gmail.com`
- **Senha:** `admin123`

## 🎯 Funcionalidades Principais

### ✅ Sistema de Autenticação
- Login seguro com JWT
- Middleware de proteção por roles
- Rate limiting e CORS configurado
- Validação de entrada em todas as rotas

### ✅ Interface Administrativa
- Design moderno e responsivo
- Componentes reutilizáveis
- Animações suaves e efeitos visuais
- Mobile First com navegação otimizada

### ✅ Integração WhatsApp
- Conexão com WhatsApp Web.js
- Gestão de múltiplos perfis
- QR Code para autenticação
- Status de conexão em tempo real
- Envio de mensagens programadas

### ✅ Gestão de Perfis
- Criação e edição de perfis WhatsApp
- Associação com usuários do sistema
- Histórico de conexões
- Configurações personalizadas

### ✅ Analytics e Relatórios
- Dashboard com métricas em tempo real
- Relatórios de mensagens enviadas
- Estatísticas de performance
- Exportação de dados

## 📱 Screenshots

### Tela de Login
![Tela de Login](docs/adminLoginHome.png)

### Dashboard Administrativo
![Dashboard](docs/adminHome.png)

## 🔐 Segurança

- Senhas hasheadas com bcrypt
- JWT tokens com expiração
- Rate limiting e CORS configurado
- Validação de entrada em todas as rotas
- Middleware de proteção por roles
- Sessões WhatsApp seguras

## 🚀 Próximos Passos

- Sistema de automações com IA
- Analytics e relatórios avançados
- API REST completa
- Integrações com CRMs
- Chatbot inteligente
- Campanhas de marketing automatizadas

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ para revolucionar a comunicação empresarial**
