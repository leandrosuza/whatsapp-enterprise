# Fotos de Perfil do WhatsApp

## Visão Geral

Esta funcionalidade permite que o sistema capture e exiba automaticamente as fotos de perfil dos números do WhatsApp conectados através do Puppeteer.

## Como Funciona

### 1. Captura Automática
- Quando um perfil do WhatsApp é conectado com sucesso, o sistema automaticamente tenta capturar a foto do perfil
- A foto é obtida usando o método `getProfilePicUrl()` da biblioteca `whatsapp-web.js`
- A URL da foto é armazenada no campo `profilePhoto` da tabela `whatsapp_profiles`

### 2. Exibição no Frontend
- Se uma foto de perfil estiver disponível, ela é exibida no card do perfil
- Se não houver foto disponível ou se houver erro no carregamento, o sistema exibe as iniciais do nome do perfil
- As iniciais são geradas automaticamente a partir das duas primeiras palavras do nome

### 3. Fallback para Iniciais
- O sistema sempre tem um fallback para iniciais caso:
  - A foto não esteja disponível
  - O carregamento da foto falhe
  - O perfil não esteja conectado

## Estrutura do Banco de Dados

### Campo `profilePhoto`
- **Tipo**: TEXT
- **Permite NULL**: Sim
- **Descrição**: Armazena a URL da foto do perfil do WhatsApp

## Componentes

### ProfileAvatar (React)
- Componente reutilizável para exibir avatares de perfil
- Suporta diferentes tamanhos (sm, md, lg)
- Gerencia automaticamente o fallback para iniciais
- Inclui indicador de status (conectado/desconectado)

### Props do ProfileAvatar
```typescript
interface ProfileAvatarProps {
  profilePhoto?: string;    // URL da foto do perfil
  name: string;             // Nome do perfil (para gerar iniciais)
  isConnected: boolean;     // Status de conexão
  size?: 'sm' | 'md' | 'lg'; // Tamanho do avatar
  className?: string;       // Classes CSS adicionais
}
```

## APIs

### Captura Automática
- **Evento**: `ready` do cliente WhatsApp
- **Método**: `client.getProfilePicUrl(client.info.wid._serialized)`
- **Armazenamento**: `profile.updateProfilePhoto(photoUrl)`

## Exemplo de Uso

### No Frontend
```tsx
<ProfileAvatar
  profilePhoto={profile.profilePhoto}
  name={profile.name}
  isConnected={profile.isConnected}
  size="md"
/>
```

## Tratamento de Erros

### Backend
- Se a captura da foto falhar, o erro é logado mas não interrompe o processo de conexão
- O sistema continua funcionando normalmente com iniciais

### Frontend
- Se a imagem falhar ao carregar, automaticamente exibe as iniciais
- Transições suaves entre foto e iniciais

## Estilização

### Cores
- **Conectado**: Gradiente verde do WhatsApp (#25D366 → #128C7E)
- **Desconectado**: Cinza (#9CA3AF)
- **Borda**: Branco (#FFFFFF)

### Tamanhos
- **sm**: 32x32px (w-8 h-8)
- **md**: 40x40px (w-10 h-10) - Padrão
- **lg**: 48x48px (w-12 h-12)

## Migração

Para adicionar o campo `profilePhoto` ao banco de dados:

```bash
cd backend
npx ts-node src/scripts/addProfilePhotoColumn.ts
```

## Limitações

1. **Dependência do WhatsApp Web**: A foto só pode ser capturada se o perfil estiver conectado
2. **Permissões**: Alguns perfis podem ter configurações de privacidade que impedem a captura da foto
3. **Rate Limiting**: O WhatsApp pode limitar requisições frequentes de fotos de perfil

## Troubleshooting

### Foto não aparece
1. Verifique se o perfil está conectado
2. Verifique os logs do backend para erros de captura
3. A foto é capturada automaticamente quando o perfil se conecta

### Erro de carregamento
1. A foto pode ter sido removida ou alterada no WhatsApp
2. Problemas de conectividade com os servidores do WhatsApp
3. Configurações de privacidade do perfil

## Futuras Melhorias

1. **Cache de Fotos**: Implementar cache local das fotos para reduzir requisições
2. **Sincronização**: Sincronizar fotos periodicamente
3. **Compressão**: Comprimir fotos para otimizar performance
4. **CDN**: Usar CDN para servir as fotos de perfil 