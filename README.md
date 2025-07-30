# 📱 WhatsApp Enterprise

> **Sistema Inteligente de Gerenciamento WhatsApp para Empresas**

> **⚠️ Status: Em Desenvolvimento - Nem todas as funções estão disponíveis. Entre em contato em caso de dúvidas!**

Uma plataforma web moderna que transforma o WhatsApp em uma ferramenta empresarial poderosa, oferecendo automação, inteligência artificial e uma interface administrativa completa.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18-green.svg)](https://nodejs.org/)
[![Status: Development](https://img.shields.io/badge/Status-Em%20Desenvolvimento-orange.svg)](https://github.com/leandrosuza/whatsapp-enterprise)

## 📋 Índice

- [🚀 Sobre o Projeto](#-sobre-o-projeto)
- [✨ Funcionalidades Disponíveis](#-funcionalidades-disponíveis)
- [🛠️ Tecnologias](#️-tecnologias)
- [⚡ Como Usar](#-como-usar)
- [📱 Screenshots](#-screenshots)
- [🔐 Segurança](#-segurança)
- [📞 Contato](#-contato)
- [📄 Licença](#-licença)

## 🚀 Sobre o Projeto

**WhatsApp Enterprise** é uma solução completa que combina:

- **🔄 Automação Inteligente** com IA integrada
- **📊 Gerenciamento Avançado** de leads e conversas
- **📨 Envio em Massa** com múltiplos números
- **🎨 Interface Moderna** totalmente responsiva
- **🔒 Sistema de Autenticação** robusto e seguro
- **🤖 Integração WhatsApp** com Web.js
- **👥 Gerenciamento de Perfis WhatsApp**
- **📈 Analytics** e relatórios em tempo real
- **💬 Chat Interface** similar ao WhatsApp Web
- **🔍 Sistema de Filtros** inteligente

## ✨ Funcionalidades Disponíveis

### ✅ Implementadas (v2.1.0)

#### 🔐 Sistema de Autenticação
- Login seguro com JWT
- Middleware de proteção baseado em roles
- Rate limiting e CORS configurado
- Validação de entrada em todas as rotas

#### 🎨 Interface Administrativa
- Design moderno e responsivo
- Componentes reutilizáveis
- Animações suaves e efeitos visuais
- Mobile First com navegação otimizada
- Glass morphism e gradientes modernos

#### 🤖 Integração WhatsApp
- Conexão com WhatsApp Web.js
- Gerenciamento de múltiplos perfis
- QR Code para autenticação
- Status de conexão em tempo real
- Envio de mensagens agendadas

#### 👥 Gerenciamento de Perfis
- Criação e edição de perfis WhatsApp
- Associação com usuários do sistema
- Histórico de conexões
- Configurações personalizadas

#### 💬 Interface de Chat (NOVA!)
- Interface similar ao WhatsApp Web
- Sistema de filtros avançado (Tudo, Não lidas, Favoritas, Grupos)
- Indicadores visuais para grupos
- Área de input fixa na parte inferior
- Scroll automático para mensagens recentes
- Suporte a diferentes tipos de mensagem
- Dados mockados para teste

### 🚧 Em Desenvolvimento

#### 📊 Analytics e Relatórios
- [ ] Dashboard de métricas em tempo real
- [ ] Relatórios de mensagens enviadas
- [ ] Estatísticas de performance
- [ ] Exportação de dados

#### 🤖 Automação Inteligente
- [ ] Sistema de IA para respostas automáticas
- [ ] Chatbot inteligente
- [ ] Automação de campanhas

## 🛠️ Tecnologias

### Frontend
- **Next.js 15** - Framework React com SSR
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS utilitário
- **Socket.IO Client** - Comunicação em tempo real

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipagem estática
- **SQLite** - Banco de dados
- **Socket.IO** - WebSockets

### WhatsApp Integration
- **whatsapp-web.js** - Biblioteca oficial do WhatsApp
- **Puppeteer** - Automação de navegador

### Autenticação & Segurança
- **JWT** - JSON Web Tokens
- **bcrypt** - Hash de senhas
- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - Proteção contra spam

## ⚡ Como Usar

### 1. Instalação Rápida

```bash
# Clone o repositório
git clone https://github.com/leandrosuza/whatsapp-enterprise.git
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

### 3. Configuração do WhatsApp

1. Faça login no sistema administrativo
2. Crie um novo perfil WhatsApp
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde a conexão ser estabelecida
5. Acesse a interface de chat

## 📱 Screenshots

### 🏠 Tela de Login
![Tela de Login](docs/adminLoginHome.png)

### 📊 Dashboard Administrativo
![Dashboard](docs/adminHome.png)

### 👤 Perfil WhatsApp Aberto
![Perfil WhatsApp](docs/adminProfileOpened.png)

### 💬 Interface de Chat (Nova!)
*Interface similar ao WhatsApp Web com filtros e indicadores visuais*

## 🔐 Segurança

- **Senhas criptografadas** com bcrypt
- **Tokens JWT** com expiração
- **Rate limiting** e CORS configurado
- **Validação de entrada** em todas as rotas
- **Middleware de proteção** baseado em roles
- **Sessões WhatsApp** seguras
- **Sanitização de dados** em todas as requisições

## 📞 Contato

### ⚠️ Suporte e Dúvidas

**Status Atual:** Em desenvolvimento ativo

- **Email:** leandrosuza.dev@gmail.com
- **GitHub Issues:** [Reportar Bug](https://github.com/leandrosuza/whatsapp-enterprise/issues)
- **WhatsApp:** +55 (11) 99999-9999

### 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### ⭐ Se este projeto te ajudou, considere dar uma estrela!

[![GitHub stars](https://img.shields.io/github/stars/leandrosuza/whatsapp-enterprise.svg?style=social&label=Star)](https://github.com/leandrosuza/whatsapp-enterprise)

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ para revolucionar a comunicação empresarial**

> **⚠️ Lembrete:** Este projeto está em desenvolvimento ativo. Funcionalidades podem ser adicionadas, modificadas ou removidas sem aviso prévio.
