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

## 🛠️ Tecnologias

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, SQLite
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

- ✅ **Sistema de Autenticação** completo com JWT
- ✅ **Interface Administrativa** moderna e responsiva
- ✅ **Rotas Protegidas** com middleware de autorização
- ✅ **Design System** com componentes reutilizáveis
- ✅ **Animações Suaves** e efeitos visuais
- ✅ **Mobile First** com navegação otimizada

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

## 🚀 Próximos Passos

- Integração com WhatsApp Web.js
- Sistema de automações com IA
- Analytics e relatórios avançados
- API REST completa
- Integrações com CRMs

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ para revolucionar a comunicação empresarial** 