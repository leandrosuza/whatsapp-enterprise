import { useState, useEffect, useCallback, useRef } from 'react';
import { WhatsAppChat, WhatsAppMessage } from '../types/whatsapp';
import { useChatSearch, ChatAnimationState } from './useChatSearch';
import { useChatSync } from './useChatSync';
import { whatsappSync } from '../services/whatsappSync';

export interface WhatsAppChatOptimizedState {
  // Estados de busca/filtros
  chats: WhatsAppChat[];
  filteredChats: WhatsAppChat[];
  searchTerm: string;
  activeFilter: 'all' | 'unread' | 'favorites' | 'groups';
  animationState: ChatAnimationState; // Estado de animação
  
  // Estados de sincronização
  selectedChat: WhatsAppChat | null;
  messages: WhatsAppMessage[];
  isTyping: boolean;
  
  // Estados gerais
  loading: boolean;
  error: string | null;
  profileStatus: 'connected' | 'disconnected' | 'error' | 'unknown';
  currentProfileId: string;
  lastUpdate: number;
  lastSyncTime: number;
}

export const useWhatsAppChatOptimized = (profileId: string) => {
  // Estados gerais
  const [profileStatus, setProfileStatus] = useState<'connected' | 'disconnected' | 'error' | 'unknown'>('unknown');
  const [currentProfileId, setCurrentProfileId] = useState<string>(profileId);
  
  // Refs para acesso sem closure dependencies
  const profileIdRef = useRef<string>('');
  const profileStatusRef = useRef<'connected' | 'disconnected' | 'error' | 'unknown'>('unknown');
  
  // Update refs when states change
  profileIdRef.current = profileId;
  profileStatusRef.current = profileStatus;
  
  // Debug: Log quando o profileId muda (apenas em desenvolvimento)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 useWhatsAppChatOptimized - ProfileId changed:', {
        newProfileId: profileId,
        currentProfileId,
        profileIdRef: profileIdRef.current
      });
    }
    
    // Atualizar currentProfileId quando profileId mudar
    if (profileId !== currentProfileId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Updating currentProfileId from', currentProfileId, 'to', profileId);
      }
      setCurrentProfileId(profileId);
    }
  }, [profileId, currentProfileId]);

  // Hooks especializados
  const chatSearch = useChatSearch(profileId);
  const chatSync = useChatSync(profileId);

  // Função para verificar se erro indica desconexão do perfil
  const isProfileDisconnectedError = (error: any): boolean => {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString() || '';
    const errorString = errorMessage.toLowerCase();
    
    return (
      errorString.includes('fetch failed') ||
      errorString.includes('network error') ||
      errorString.includes('connection refused') ||
      errorString.includes('econnrefused') ||
      errorString.includes('timeout') ||
      errorString.includes('profile is not connected') ||
      errorString.includes('profile not found') ||
      errorString.includes('client not initialized') ||
      errorString.includes('whatsapp not connected') ||
      errorString.includes('failed to connect') ||
      errorString.includes('connection lost') ||
      errorString.includes('socket disconnected')
    );
  };

  // Função para obter mensagem de erro amigável
  const getFriendlyErrorMessage = (error: any): string => {
    if (!error) return 'Erro desconhecido';
    
    const errorMessage = error.message || error.toString() || '';
    const errorString = errorMessage.toLowerCase();
    
    if (isProfileDisconnectedError(error)) {
      return '📱 WhatsApp desconectado. O perfil pode estar desligado ou sem conexão.';
    }
    
    if (errorString.includes('profile not found')) {
      return '❌ Perfil não encontrado. Verifique se o perfil existe e está configurado corretamente.';
    }
    
    if (errorString.includes('failed to fetch') || errorString.includes('network error')) {
      return '🌐 Erro de conexão. Verifique sua conexão com a internet e tente novamente.';
    }
    
    if (errorString.includes('timeout')) {
      return '⏰ Tempo limite excedido. O servidor pode estar sobrecarregado.';
    }
    
    if (errorString.includes('unauthorized') || errorString.includes('401')) {
      return '🔐 Erro de autenticação. Faça login novamente.';
    }
    
    if (errorString.includes('forbidden') || errorString.includes('403')) {
      return '🚫 Acesso negado. Você não tem permissão para acessar este recurso.';
    }
    
    if (errorString.includes('not found') || errorString.includes('404')) {
      return '🔍 Recurso não encontrado. O perfil ou chat pode ter sido removido.';
    }
    
    if (errorString.includes('server error') || errorString.includes('500')) {
      return '⚡ Erro no servidor. Tente novamente em alguns minutos.';
    }
    
    return `❌ Erro: ${errorMessage}`;
  };

  // Função para selecionar chat - COORDENAÇÃO ENTRE OS HOOKS
  const selectChat = useCallback((chat: WhatsAppChat) => {
    // Atualizar o chat selecionado no hook de sincronização
    chatSync.selectChat(chat);
    
    // Marcar mensagens como lidas
    if (chat.unreadCount > 0 && profileIdRef.current) {
      whatsappSync.markAsRead(profileIdRef.current, chat.id, []).catch(err => {
        console.error('Error marking as read:', err);
      });
    }
  }, [chatSync]);

  // Função para enviar mensagem - COORDENAÇÃO ENTRE OS HOOKS
  const sendMessage = useCallback(async (text: string) => {
    if (!profileId || !chatSync.selectedChat || !text.trim()) return;

    // Enviar mensagem através do hook de sincronização
    await chatSync.sendMessage(text);
    
    // Atualizar preview do chat na lista de busca
    const tempMessage: WhatsAppMessage = {
      id: `temp-${Date.now()}`,
      chatId: chatSync.selectedChat.id,
      text: text.trim(),
      time: new Date(),
      isSent: true,
      status: 'sent',
      type: 'text'
    };
    
    chatSearch.updateChatPreview(chatSync.selectedChat.id, tempMessage);
  }, [profileId, chatSync, chatSearch]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: { searchTerm?: string; activeFilter?: 'all' | 'unread' | 'groups' }) => {
    chatSearch.updateFilters(newFilters);
  }, [chatSearch]);

  // Função para recarregar chats
  const loadChats = useCallback(async () => {
    await chatSearch.loadChats();
  }, [chatSearch]);

  // Função para reconectar perfil
  const reconnectProfile = useCallback(async () => {
    if (!profileIdRef.current) return false;
    try {
      const success = await whatsappSync.reconnectProfile(profileIdRef.current);
      if (success) {
        setProfileStatus('connected');
      } else {
        setProfileStatus('error');
      }
      return success;
    } catch (error) {
      console.error('Error reconnecting profile:', error);
      setProfileStatus('error');
      return false;
    }
  }, []);

  // Função para sincronização automática (similar ao botão reconnect mas sem reconstruir elementos)
  const autoSync = useCallback(async () => {
    if (!profileIdRef.current) return;
    
    try {
      // Invalidar cache para forçar atualização
      whatsappSync.invalidateChatCache(profileIdRef.current);
      if (chatSync.selectedChat) {
        whatsappSync.invalidateMessageCache(profileIdRef.current, chatSync.selectedChat.id);
      }
      
      // Recarregar dados de forma incremental (sem reconstruir elementos)
      await chatSearch.loadChats();
      if (chatSync.selectedChat) {
        await chatSync.loadMessages(chatSync.selectedChat.id);
      }
    } catch (error) {
      console.error('Error in auto sync:', error);
    }
  }, [chatSearch, chatSync]);

  // Função para sincronização inteligente (detecta mudanças e atualiza apenas o necessário)
  const intelligentSync = useCallback(async () => {
    if (!profileIdRef.current) return;
    
    try {
      // Verificar se há um chat selecionado
      if (chatSync.selectedChat) {
        // Forçar sincronização incremental
        await chatSync.syncIncremental();
        
        // Verificar se há novas mensagens e forçar reload se necessário
        const currentMessages = chatSync.messages;
        if (currentMessages.length > 0) {
          // Forçar reload das mensagens para garantir sincronização
          await chatSync.loadMessages(chatSync.selectedChat.id);
          
          // Atualizar preview do chat com a última mensagem
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (lastMessage) {
            chatSearch.updateChatPreview(chatSync.selectedChat.id, lastMessage);
          }
        }
      }
      
      // Sincronizar lista de chats apenas se necessário
      // Removido lastUpdate pois não existe no objeto chatSearch
      await chatSearch.loadChats();
    } catch (error) {
      console.error('Error in intelligent sync:', error);
    }
  }, [chatSearch, chatSync]);

  // Setup intelligent sync interval (otimizado para evitar conflitos)
  // useEffect(() => {
  //   if (!profileId) return;

  //   console.log('🧠 Setting up intelligent sync interval (every 15 seconds)');
    
  //   const interval = setInterval(() => {
  //     intelligentSync();
  //   }, 15000); // Sincronizar a cada 15 segundos para reduzir carga
    
  //   return () => {
  //     if (interval) {
  //       clearInterval(interval);
  //     }
  //   };
  // }, [profileId, intelligentSync]);

  // Setup automatic sync interval (removido para evitar conflitos)
  // O intelligent sync já cobre as necessidades de sincronização

  // Efeito de sincronização incremental ULTRA OTIMIZADO (sem loading, sem recriar interface)
  useEffect(() => {
    if (!profileIdRef.current) return;
    
    const interval = setInterval(async () => {
      try {
        // Sync incremental de chats (sem loading) - REDUZIDO PARA MÁXIMA VELOCIDADE
        if (chatSearch.syncIncremental) {
          await chatSearch.syncIncremental();
        }
        
        // Sync incremental de mensagens do chat aberto - REDUZIDO PARA MÁXIMA VELOCIDADE
        if (chatSync.selectedChat && chatSync.syncIncremental) {
          await chatSync.syncIncremental();
        }
      } catch (err) {
        // Silenciar erro para não impactar performance
      }
    }, 500); // Reduzido para 500ms para máxima velocidade
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [chatSearch, chatSync]);

  // Monitorar mudanças de status do perfil
  useEffect(() => {
    setCurrentProfileId(profileId);
    
    // Determinar status do perfil baseado nos erros dos hooks
    const searchError = chatSearch.error;
    const syncError = chatSync.error;
    
    if (searchError && isProfileDisconnectedError(searchError)) {
      setProfileStatus('disconnected');
    } else if (syncError && isProfileDisconnectedError(syncError)) {
      setProfileStatus('disconnected');
    } else if (searchError || syncError) {
      setProfileStatus('error');
    } else if (!chatSearch.loading && chatSearch.chats.length > 0) {
      setProfileStatus('connected');
    } else {
      setProfileStatus('unknown');
    }
  }, [profileId, chatSearch.error, chatSync.error, chatSearch.loading, chatSearch.chats.length]);

  // Setup coordination WebSocket listeners - REMOVIDO PARA EVITAR DUPLICAÇÃO
  // Os listeners já estão sendo gerenciados pelos hooks individuais (useChatSync e useChatSearch)
  // Isso evita processamento duplicado e melhora a performance

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup logic here if needed
    };
  }, [profileId]);

  // Determinar loading e error globais
  const loading = chatSearch.loading || chatSync.loading;
  const error = chatSearch.error || chatSync.error;

  return {
    // Estados de busca/filtros
    chats: chatSearch.chats,
    filteredChats: chatSearch.filteredChats,
    searchTerm: chatSearch.searchTerm,
    activeFilter: chatSearch.activeFilter,
    animationState: chatSearch.animationState || {
      animatingChatId: null,
      fromIndex: -1,
      toIndex: -1,
      isAnimating: false
    }, // Estado de animação com fallback
    
    // Estados de sincronização
    selectedChat: chatSync.selectedChat,
    messages: chatSync.messages,
    isTyping: chatSync.isTyping,
    
    // Estados gerais
    loading,
    error,
    profileStatus,
    currentProfileId,
    lastUpdate: Date.now(), // Valor padrão já que lastUpdate não existe
    lastSyncTime: chatSync.lastSyncTime,
    
    // Funções
    selectChat,
    sendMessage,
    loadChats,
    loadMoreChats: chatSearch.loadMoreChats, // Expor função de carregar mais chats
    updateFilters,
    reconnectProfile,
    
    // Estados de paginação
    hasMoreChats: chatSearch.hasMoreChats,
    
    // Funções específicas dos hooks (para casos avançados)
    chatSearch: {
      updateChatPreview: chatSearch.updateChatPreview,
      updateChatInList: chatSearch.updateChatInList
    },
    chatSync: {
      selectChat: chatSync.selectChat, // Adicionar selectChat
      loadMessages: chatSync.loadMessages,
      syncIncremental: chatSync.syncIncremental,
      updateChatPreview: chatSearch.updateChatPreview, // Usar a função do useChatSearch
      // Estados de paginação
      hasMoreMessages: chatSync.hasMoreMessages,
      isLoadingMoreMessages: chatSync.isLoadingMoreMessages,
      loadMoreMessages: chatSync.loadMoreMessages
    },
    
    // Estado completo para debug
    getState: (): WhatsAppChatOptimizedState => ({
      chats: chatSearch.chats,
      filteredChats: chatSearch.filteredChats,
      searchTerm: chatSearch.searchTerm,
      activeFilter: chatSearch.activeFilter,
      animationState: chatSearch.animationState || {
        animatingChatId: null,
        fromIndex: -1,
        toIndex: -1,
        isAnimating: false
      },
      selectedChat: chatSync.selectedChat,
      messages: chatSync.messages,
      isTyping: chatSync.isTyping,
      loading,
      error,
      profileStatus,
      currentProfileId,
      lastUpdate: Date.now(), // Valor padrão já que lastUpdate não existe
      lastSyncTime: chatSync.lastSyncTime
    })
  };
}; 