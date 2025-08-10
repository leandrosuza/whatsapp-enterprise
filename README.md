# 📱 WhatsApp Enterprise

> **Sistema Inteligente de Gestão WhatsApp para Empresas**

> **⚠️ Status: Em Desenvolvimento - Nem todas as funcionalidades estão disponíveis. Entre em contato para dúvidas!**

Uma plataforma web moderna que transforma o WhatsApp em uma ferramenta poderosa para negócios, oferecendo automação, inteligência artificial e uma interface administrativa completa.

[![License: Custom](https://img.shields.io/badge/License-Custom-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18-green.svg)](https://nodejs.org/)
[![Status: Development](https://img.shields.io/badge/Status-Em%20Desenvolvimento-orange.svg)](https://github.com/leandrosuza/whatsapp-enterprise)

## 📋 Índice

- [🚀 Sobre o Projeto](#-sobre-o-projeto)
- [✨ Funcionalidades Implementadas](#-funcionalidades-implementadas)
- [🛠️ Tecnologias](#️-tecnologias)
- [⚡ Início Rápido](#-início-rápido)
- [📱 Screenshots](#-screenshots)
- [🔐 Segurança](#-segurança)
- [📞 Contato](#-contato)
- [📄 Licença](#-licença)

## 🚀 Sobre o Projeto

**WhatsApp Enterprise** é uma solução completa que combina:

- **🔄 Automação Inteligente** com IA integrada
- **📊 Gestão Avançada** de leads e conversas
- **📨 Mensagens em Massa** com múltiplos números
- **🎨 Interface Moderna** totalmente responsiva
- **🔒 Sistema de Autenticação Robusto** seguro e confiável
- **🤖 Integração WhatsApp** com Web.js
- **👥 Gestão de Perfis WhatsApp**
- **📈 Analytics** e relatórios em tempo real
- **💬 Interface de Chat** similar ao WhatsApp Web
- **🔍 Sistema de Filtros Inteligente**

## ✨ Funcionalidades Implementadas

### ✅ Sistema de Autenticação (v2.1.0)

#### 🔐 Autenticação Segura
- **Login JWT** com tokens seguros
- **Proteção por roles** com middleware
- **Rate limiting** e CORS configurado
- **Validação de entrada** em todas as rotas
- **Sistema de sessões** com expiração automática
- **Recuperação de senha** (estrutura preparada)

#### 🎨 Interface Administrativa
- **Design moderno e responsivo** com Tailwind CSS
- **Componentes reutilizáveis** e modulares
- **Animações suaves** e efeitos visuais
- **Mobile First** com navegação otimizada
- **Glass morphism** e gradientes modernos
- **Tema escuro/claro** (estrutura preparada)

### 🤖 Integração WhatsApp

#### 🔗 Conexão WhatsApp Web.js
- **Conexão com WhatsApp Web.js** oficial
- **Gestão de múltiplos perfis** simultâneos
- **QR Code para autenticação** em tempo real
- **Status de conexão** em tempo real
- **Reconexão automática** em caso de queda
- **Sessões persistentes** com armazenamento local

#### 👥 Gestão de Perfis
- **Criação e edição** de perfis WhatsApp
- **Associação com usuários** do sistema
- **Histórico de conexões** detalhado
- **Configurações personalizadas** por perfil
- **Status de conexão** visual (conectado/desconectado)
- **Exclusão segura** de perfis

#### 🔗 Sistema de Compartilhamento
- **Links públicos** para acessar perfis específicos
- **Páginas dedicadas** sem layout administrativo
- **Ativação/desativação** de compartilhamento
- **Tokens seguros** únicos para cada link
- **Integração Ngrok** para URLs públicas
- **Interface responsiva** para qualquer dispositivo

### 💬 Interface de Chat

#### 🎨 Interface Similar ao WhatsApp Web
- **Layout idêntico** ao WhatsApp Web
- **Sistema de filtros avançado** (Todos, Não lidas, Favoritos, Grupos)
- **Indicadores visuais** para grupos
- **Área de entrada fixa** na parte inferior
- **Scroll automático** para mensagens recentes
- **Suporte a diferentes tipos** de mensagem
- **Dados mockados** para testes

#### 📱 Funcionalidades de Chat
- **Envio de mensagens** em tempo real
- **Status de entrega** (enviado, entregue, lido)
- **Respostas e encaminhamento** de mensagens
- **Reações** às mensagens
- **Menu de opções** contextual
- **Paginação** de mensagens antigas
- **Preservação de estado** entre navegações

### 📊 Dashboard de Analytics

#### 📈 Métricas em Tempo Real
- **Estatísticas de mensagens** (total, enviadas, recebidas)
- **Métricas de conversas** (ativas, resolvidas, tempo médio)
- **Gestão de contatos** (total, novos, ativos, engajados)
- **Performance** (taxa de resposta, satisfação, conversão)
- **Séries temporais** para análise de tendências
- **Contatos mais ativos** com ranking

#### 📊 Visualização de Dados
- **Gráficos interativos** para métricas
- **Filtros por perfil** e período
- **Exportação de relatórios** em diferentes formatos
- **Comparação entre períodos** com percentuais
- **Alertas automáticos** para métricas importantes

### 👥 Gestão de Contatos

#### 📋 Banco de Dados de Contatos
- **Cadastro completo** de contatos com informações detalhadas
- **Fotos de perfil** com upload automático
- **Categorização** por tags e grupos
- **Funcionalidade de importação/exportação**
- **Histórico de interações** por contato
- **Notas e observações** personalizadas

#### 🔍 Sistema de Busca e Filtros
- **Busca avançada** por nome, número, email
- **Filtros por status** (ativo, inativo, bloqueado)
- **Filtros por grupos** e tags
- **Seleção múltipla** para ações em lote
- **Ordenação** por diferentes critérios

### 💬 Gestão de Conversas

#### 📝 Histórico de Conversas
- **Histórico completo** de todas as conversas
- **Threading de mensagens** organizado
- **Rastreamento de status** das conversas
- **Busca e filtro** de conversas
- **Arquivamento** de conversas antigas
- **Métricas por conversa** (duração, mensagens, etc.)

#### 🏷️ Organização e Categorização
- **Tags personalizadas** para conversas
- **Status de prioridade** (baixa, média, alta)
- **Atribuição** a diferentes usuários
- **Categorização** por tipo de conversa

### 🤖 Sistema de Automação

#### 🔄 Automações Inteligentes
- **Mensagens de boas-vindas** automáticas
- **Follow-ups** programados
- **Lembretes** personalizados
- **Campanhas** em massa
- **Suporte automatizado** com escalação
- **Automações customizadas** com triggers

#### ⏰ Agendamento e Triggers
- **Agendamento por data/hora** específica
- **Triggers por eventos** (nova mensagem, tempo)
- **Frequência configurável** (uma vez, diário, semanal, mensal)
- **Condições personalizáveis** para ativação
- **Ações múltiplas** por automação

#### 📊 Métricas de Automação
- **Estatísticas detalhadas** por automação
- **Taxa de conversão** e engajamento
- **Relatórios de performance** em tempo real
- **A/B testing** para otimização

### ⚙️ Painel de Configurações

#### 🔧 Configurações Gerais
- **Nome da empresa** e informações básicas
- **Fuso horário** e idioma
- **Configurações de interface** e tema
- **Preferências de usuário** personalizáveis

#### 🤖 Configurações WhatsApp
- **Chaves de API** e webhooks
- **Configurações de conexão** automática
- **Respostas automáticas** padrão
- **Configurações de sessão** e timeout

#### 🔔 Configurações de Notificações
- **Notificações por email** configuráveis
- **Notificações push** em tempo real
- **Alertas de novas mensagens** personalizáveis
- **Configurações de som** e vibração

#### 🔒 Configurações de Segurança
- **Autenticação de dois fatores** (2FA)
- **Timeout de sessão** configurável
- **Logs de acesso** e auditoria
- **Configurações de privacidade** avançadas

### 🎯 Sistema de Lead Generator

#### 📱 Geração de Leads
- **Geração inteligente** de números baseada em DDD e prefixo
- **Suporte a diferentes regiões** do Brasil
- **Preview em tempo real** do formato dos números
- **Verificação automática** de números com WhatsApp
- **Processamento em lote** com delay progressivo

#### 📊 Estatísticas Detalhadas
- **Total de números** gerados
- **Status de verificação** (pendente, verificando, encontrado, não encontrado)
- **Taxa de sucesso** por região
- **Exportação de resultados** em CSV/Excel

#### 🔍 Filtros e Busca
- **Busca por número** ou cidade
- **Filtro por status** de verificação
- **Segmentação** por região e DDD
- **Análise de performance** por campanha

## 🛠️ Tecnologias

### Frontend
- **Next.js 15** - Framework React com SSR
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS utilitário
- **Socket.IO Client** - Comunicação em tempo real
- **React Query** - Busca e cache de dados
- **Zustand** - Gerenciamento de estado

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipagem estática
- **SQLite** - Banco de dados
- **Socket.IO** - WebSockets
- **Sequelize** - ORM

### Integração WhatsApp
- **whatsapp-web.js** - Biblioteca oficial do WhatsApp
- **Puppeteer** - Automação de navegador

### Autenticação e Segurança
- **JWT** - JSON Web Tokens
- **bcrypt** - Hash de senhas
- **CORS** - Compartilhamento de recursos entre origens
- **Rate Limiting** - Proteção contra spam
- **Helmet** - Headers de segurança

### IA e Automação
- **OpenAI** - Integração com IA
- **Node-cron** - Tarefas agendadas

## ⚡ Início Rápido

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

# Crie o usuário administrador
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

### 🔧 Comportamento de Inicialização dos Perfis

**⚠️ IMPORTANTE:** Por padrão, todos os perfis WhatsApp iniciam **desligados** quando o sistema é iniciado. Isso é uma medida de segurança para evitar bugs com navegadores automáticos ainda abertos.

#### ✅ Comportamento Seguro
- **Todos os perfis iniciam desligados** ao reiniciar o servidor
- **Auto-reconexão desabilitada** por padrão
- **Conexão manual** requerida pelo usuário
- **Prevenção de bugs** com navegadores automáticos

#### 🔄 Como Conectar Perfis
1. Acesse o **Dashboard** do sistema
2. Localize o perfil desejado
3. Clique no **toggle** para conectar
4. Aguarde a conexão ser estabelecida

#### 🧹 Limpeza de Perfis (se necessário)
Se houver problemas com perfis "travados", execute:
```bash
cd backend
npm run cleanup-profiles
```

Isso forçará todos os perfis para o status "desligado".

## 📱 Screenshots

### 🏠 Tela de Login
![Tela de Login](docs/adminLoginHome.png)

### 📊 Dashboard Administrativo
![Dashboard](docs/adminHome.png)

### 👤 Perfil WhatsApp Aberto
![Perfil WhatsApp](docs/adminProfileOpened.png)

### 💬 Interface de Chat
![Interface de Chat](docs/adminWhatsAppView.png)

### 📊 Dashboard de Analytics
![Analytics](docs/adminAnalytics.png)

### 👥 Gestão de Contatos
![Contatos](docs/adminContacts.png)

### 💬 Gestão de Conversas
![Conversas](docs/adminConversations.png)

### 🤖 Sistema de Automação
![Automações](docs/adminAutomations.png)

### ⚙️ Painel de Configurações
![Configurações](docs/adminSettings.png)

## 🔐 Segurança

- **Senhas criptografadas** com bcrypt
- **Tokens JWT** com expiração
- **Rate limiting** e CORS configurado
- **Validação de entrada** em todas as rotas
- **Middleware de proteção** baseado em roles
- **Sessões WhatsApp seguras**
- **Sanitização de dados** em todas as requisições
- **Headers de segurança** com Helmet
- **Compressão** para performance
- **Logs de requisições** com Morgan

## 📞 Contato

### ⚠️ Suporte e Dúvidas

**Status Atual:** Desenvolvimento ativo

- **Email:** leandrodsl2004@gmail.com
- **GitHub Issues:** [Reportar Bug](https://github.com/leandrosuza/whatsapp-enterprise/issues)

### 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

### ⭐ Se este projeto te ajudou, considere dar uma estrela!

[![GitHub stars](https://img.shields.io/github/stars/leandrosuza/whatsapp-enterprise.svg?style=social&label=Star)](https://github.com/leandrosuza/whatsapp-enterprise)

## 📄 Licença

Licença Customizada - veja o arquivo [LICENSE](LICENSE) para detalhes.

**⚠️ Importante:** Este projeto é open source para uso educacional e não comercial. Uso comercial requer permissão explícita por escrito do autor. Veja o arquivo LICENSE para termos e condições completos.

---

**Desenvolvido com ❤️ para revolucionar a comunicação empresarial**

> **⚠️ Lembrete:** Este projeto está em desenvolvimento ativo. Funcionalidades podem ser adicionadas, modificadas ou removidas sem aviso prévio.
