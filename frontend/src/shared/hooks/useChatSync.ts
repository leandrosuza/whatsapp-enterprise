import { useState, useEffect, useCallback, useRef } from 'react';
import { WhatsAppChat, WhatsAppMessage } from '../types/whatsapp';
import { whatsappSync } from '../services/whatsappSync';

export interface ChatSyncState {
  selectedChat: WhatsAppChat | null;
  messages: WhatsAppMessage[];
  loading: boolean;
  error: string | null;
  lastSyncTime: number;
  isTyping: boolean;
}

export const useChatSync = (profileId: string) => {
  
  // Log reduzido para melhor performance
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 useChatSync initialized for profileId: ${profileId}`);
  }
  
  // Estados principais
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  
  // Estado de paginação para mensagens
  const [displayedMessages, setDisplayedMessages] = useState<WhatsAppMessage[]>([]);
  const [currentMessagePage, setCurrentMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [totalMessagesLoaded, setTotalMessagesLoaded] = useState(0);
  const MESSAGES_PER_PAGE = 30; // Carregar 30 mensagens por vez
  
  // Estados para sincronização otimizada
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<number>(0);
  const [processedMessages, setProcessedMessages] = useState<Set<string>>(new Set());
  
  // Estados para manter conversas recentes
  const [autoScrollToBottom, setAutoScrollToBottom] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [shouldPreserveScroll, setShouldPreserveScroll] = useState(false);
  
  // Refs para acesso sem closure dependencies
  const selectedChatRef = useRef<WhatsAppChat | null>(null);
  const messagesRef = useRef<WhatsAppMessage[]>([]);
  const profileIdRef = useRef<string>('');
  const loadingRef = useRef<boolean>(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const autoUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update refs when states change
  selectedChatRef.current = selectedChat;
  messagesRef.current = messages;
  profileIdRef.current = profileId;
  loadingRef.current = loading;
  lastSyncTimeRef.current = lastSyncTime;

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

  // Função para atualizar preview do chat
  const updateChatPreview = useCallback((chatId: string, data: any) => {
    if (!data) {
      console.warn('⚠️ updateChatPreview: No data provided for chatId:', chatId);
      return;
    }
    
    console.log('📝 Chat preview update requested for:', chatId, {
      type: data.type || 'unknown',
      text: data.text?.substring(0, 30),
      lastMessage: data.lastMessage?.substring(0, 30)
    });
    
    // Esta função será implementada pelo hook pai que gerencia a lista de chats
    // Por enquanto, apenas log para debug
  }, []);

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

  // Função para carregar mensagens com cache invalidation
  const loadMessages = useCallback(async (chatId: string, page: number = 1, append: boolean = false): Promise<void> => {
    if (!profileIdRef.current || !chatId) {
      console.log(`⏭️ loadMessages skipped - profileId: ${profileIdRef.current}, chatId: ${chatId}`);
      return;
    }

    console.log(`📥 loadMessages started for profile ${profileIdRef.current}, chat ${chatId}, page ${page}`);
    
    try {
      // Definir chat ativo para otimizar cache
      whatsappSync.setActiveChat(chatId);
      
      // Invalidar cache antes de carregar
      whatsappSync.invalidateMessageCache(profileIdRef.current, chatId);
      
      // Carregar as primeiras 30 mensagens para começar
      const messagesData = await whatsappSync.getMessages(profileIdRef.current, chatId, MESSAGES_PER_PAGE);
      console.log(`📨 loadMessages received ${messagesData.length} messages for chat ${chatId}`);
      
      // Validar e ordenar mensagens
      const validatedMessages = messagesData
        .map(msg => ({
          ...msg,
          time: msg.time instanceof Date ? msg.time : new Date(msg.time)
        }))
        .sort((a, b) => {
          const timeA = a.time instanceof Date ? a.time : new Date(a.time);
          const timeB = b.time instanceof Date ? b.time : new Date(b.time);
          return timeA.getTime() - timeB.getTime(); // Ordem crescente (mais antiga primeiro)
        });
      
      if (append) {
        // Adicionar novas mensagens ao início (mensagens mais antigas)
        setMessages(prev => [...validatedMessages, ...prev]);
        setDisplayedMessages(prev => [...validatedMessages, ...prev]);
        setShouldPreserveScroll(true); // Preservar scroll ao carregar mensagens antigas
      } else {
        // Para a primeira página, mostrar todas as mensagens carregadas
        setMessages(validatedMessages);
        setDisplayedMessages(validatedMessages);
        setCurrentMessagePage(1);
        setTotalMessagesLoaded(validatedMessages.length);
        setShouldPreserveScroll(false); // Não preservar scroll ao recarregar
        setAutoScrollToBottom(true); // Auto-scroll para baixo
      }
      
      // Verificar se há mais mensagens para carregar
      // Se recebemos exatamente 30 mensagens, provavelmente há mais
      setHasMoreMessages(validatedMessages.length >= MESSAGES_PER_PAGE);
      
      console.log(`📊 Message loading summary:`, {
        totalMessages: validatedMessages.length,
        displayedMessages: validatedMessages.length,
        hasMoreMessages: validatedMessages.length >= MESSAGES_PER_PAGE,
        totalMessagesLoaded: validatedMessages.length
      });
      
    } catch (err) {
      console.error('❌ Error loading messages:', err);
      setError(getFriendlyErrorMessage(err));
    }
  }, []);
  
  // Função para atualizar mensagens automaticamente (manter conversas recentes)
  const updateMessages = useCallback(async () => {
    if (!selectedChatRef.current || !profileIdRef.current) return;
    
    try {
      // Buscar mensagens mais recentes sem invalidar cache completamente
      const currentMessageCount = messagesRef.current.length;
      const newMessages = await whatsappSync.getMessages(
        profileIdRef.current, 
        selectedChatRef.current.id, 
        currentMessageCount + 10 // Buscar algumas mensagens extras
      );
      
      // Verificar se há novas mensagens
      if (newMessages.length > currentMessageCount) {
        console.log(`🔄 Auto-update: ${newMessages.length - currentMessageCount} new messages detected`);
        
        // Validar e ordenar mensagens
        const validatedMessages = newMessages
          .map(msg => ({
            ...msg,
            time: msg.time instanceof Date ? msg.time : new Date(msg.time)
          }))
          .sort((a, b) => {
            const timeA = a.time instanceof Date ? a.time : new Date(a.time);
            const timeB = b.time instanceof Date ? b.time : new Date(b.time);
            return timeA.getTime() - timeB.getTime();
          });
        
        // Atualizar mensagens mantendo scroll
        setMessages(validatedMessages);
        setDisplayedMessages(validatedMessages);
        setLastMessageCount(validatedMessages.length);
        
        // Auto-scroll apenas se estava no final
        if (autoScrollToBottom) {
          setAutoScrollToBottom(true);
        }
      }
    } catch (error) {
      console.error('❌ Error in auto-update:', error);
    }
  }, []);

  // Função para carregar mais mensagens (lazy loading) - SEM LIMITE MÁXIMO
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMoreMessages || !hasMoreMessages || !selectedChat) return;
    
    setIsLoadingMoreMessages(true);
    const nextPage = currentMessagePage + 1;
    
    try {
      console.log(`📜 Loading more messages for chat ${selectedChat.id}, page ${nextPage}`);
      
      // Calcular quantas mensagens já foram carregadas
      const messagesToLoad = MESSAGES_PER_PAGE;
      const currentTotal = totalMessagesLoaded;
      
      // Buscar mais mensagens do servidor com limite progressivo
      console.log(`🌐 Fetching ${messagesToLoad} more messages from server for chat ${selectedChat.id}`);
      
      // Buscar mais mensagens do servidor com limite específico
      const newMessages = await whatsappSync.getMessages(profileIdRef.current, selectedChat.id, currentTotal + messagesToLoad);
      
      if (newMessages.length > 0) {
        // Validar e ordenar mensagens
        const validatedMessages = newMessages
          .map(msg => ({
            ...msg,
            time: msg.time instanceof Date ? msg.time : new Date(msg.time)
          }))
          .sort((a, b) => {
            const timeA = a.time instanceof Date ? a.time : new Date(a.time);
            const timeB = b.time instanceof Date ? b.time : new Date(b.time);
            return timeA.getTime() - timeB.getTime();
          });
        
        // Se são as primeiras mensagens, substituir completamente
        if (currentTotal === 0) {
          setMessages(validatedMessages);
          setDisplayedMessages(validatedMessages.slice(-MESSAGES_PER_PAGE));
        } else {
          // Adicionar novas mensagens ao estado completo
          setMessages(prev => {
            // Combinar mensagens existentes com novas, evitando duplicatas
            const combined = [...prev, ...validatedMessages];
            const uniqueMessages = combined.filter((msg, index, self) => 
              index === self.findIndex(m => m.id === msg.id)
            );
            return uniqueMessages.sort((a, b) => {
              const timeA = a.time instanceof Date ? a.time : new Date(a.time);
              const timeB = b.time instanceof Date ? b.time : new Date(b.time);
              return timeA.getTime() - timeB.getTime();
            });
          });
          
          // Adicionar às mensagens exibidas (mensagens mais antigas no topo)
          const olderMessages = validatedMessages.slice(0, validatedMessages.length - currentTotal);
          if (olderMessages.length > 0) {
            setDisplayedMessages(prev => [...olderMessages, ...prev]);
          }
        }
        
        setCurrentMessagePage(nextPage);
        setTotalMessagesLoaded(validatedMessages.length);
        
        // Verificar se há mais mensagens para carregar
        // Se recebemos exatamente o que pedimos, provavelmente há mais
        setHasMoreMessages(validatedMessages.length >= currentTotal + messagesToLoad);
        
        console.log(`✅ Loaded ${validatedMessages.length} total messages (${validatedMessages.length - currentTotal} new)`);
      } else {
        // Não há mais mensagens para carregar
        setHasMoreMessages(false);
        console.log('✅ No more messages to load');
      }
    } catch (err) {
      console.error('❌ Error loading more messages:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [currentMessagePage, hasMoreMessages, isLoadingMoreMessages, selectedChat, totalMessagesLoaded]);

  // Função para adicionar nova mensagem - OTIMIZADO PARA VELOCIDADE MÁXIMA
  const addNewMessage = useCallback((message: WhatsAppMessage) => {
    // Normalizar timestamp da mensagem
    const normalizedMessage: WhatsAppMessage = {
      ...message,
      time: message.time instanceof Date ? message.time : new Date(message.time)
    };

    // Atualizar mensagens do chat atual se for o chat selecionado - IMEDIATO
    if (selectedChatRef.current && message.chatId === selectedChatRef.current.id) {
      setMessages(prev => {
        // Verificação mais robusta para evitar duplicatas usando ID da mensagem
        if (message.id && prev.some(msg => msg.id === message.id)) {
          console.log('⚠️ Message with same ID already exists, skipping:', message.text?.substring(0, 20));
          return prev;
        }
        
        // Verificação adicional por conteúdo e timestamp (para mensagens sem ID único)
        const messageKey = `${message.text}_${message.isSent}_${message.time instanceof Date ? message.time.getTime() : new Date(message.time).getTime()}`;
        
        // Verificar se a mensagem já foi processada
        if (processedMessages.has(messageKey)) {
          return prev;
        }
        
        // Verificar se já existe uma mensagem com a mesma chave
        const exists = prev.some(msg => {
          const msgKey = `${msg.text}_${msg.isSent}_${msg.time instanceof Date ? msg.time.getTime() : new Date(msg.time).getTime()}`;
          return msgKey === messageKey;
        });
        
        if (exists) {
          return prev;
        }
        
        // Adicionar ao cache de mensagens processadas
        setProcessedMessages(prevCache => new Set([...prevCache, messageKey]));
        
        // Remover mensagens temporárias que correspondem a esta mensagem real
        const filteredPrev = prev.filter(msg => 
          !(msg.isTemp && msg.text === message.text && msg.isSent === message.isSent)
        );
        
        const newMessages = [...filteredPrev, normalizedMessage].sort((a, b) => {
          const timeA = a.time instanceof Date ? a.time : new Date(a.time);
          const timeB = b.time instanceof Date ? b.time : new Date(b.time);
          return timeA.getTime() - timeB.getTime();
        });
        
        // Atualizar displayedMessages também para refletir imediatamente
        setDisplayedMessages(prevDisplayed => {
          // Verificar se a mensagem já existe no displayedMessages
          const messageExists = prevDisplayed.some(msg => 
            msg.id === normalizedMessage.id || 
            (msg.text === normalizedMessage.text && 
             msg.isSent === normalizedMessage.isSent && 
             Math.abs(msg.time.getTime() - normalizedMessage.time.getTime()) < 1000)
          );
          
          if (messageExists) {
            console.log('⚠️ Message already exists in displayedMessages, skipping');
            return prevDisplayed;
          }
          
          // Se a nova mensagem é mais recente que a última exibida, adicionar ao final
          const lastDisplayed = prevDisplayed[prevDisplayed.length - 1];
          if (!lastDisplayed || normalizedMessage.time > lastDisplayed.time) {
            console.log('✅ Adding new message to displayedMessages:', normalizedMessage.text?.substring(0, 30));
            return [...prevDisplayed, normalizedMessage];
          }
          
          // Se a mensagem é mais antiga, inserir na posição correta
          const insertIndex = prevDisplayed.findIndex(msg => msg.time > normalizedMessage.time);
          if (insertIndex === -1) {
            // Adicionar ao final se não encontrou posição
            return [...prevDisplayed, normalizedMessage];
          } else {
            // Inserir na posição correta
            const newDisplayed = [...prevDisplayed];
            newDisplayed.splice(insertIndex, 0, normalizedMessage);
            return newDisplayed;
          }
        });
        
        console.log('✅ Message added INSTANTLY to chat:', message.chatId);
        return newMessages;
      });

      // Marcar como lida se não foi enviada por nós
      if (!message.isSent && profileIdRef.current && selectedChatRef.current) {
        whatsappSync.markAsRead(profileIdRef.current, selectedChatRef.current.id, [message.id]).catch(err => {
          console.error('Error marking as read:', err);
        });
      }
    }

    // Atualizar preview do chat - IMEDIATO E FORÇADO
    updateChatPreview(message.chatId, normalizedMessage);
    
    // Disparar evento global para notificar outros componentes
    const globalEvent = new CustomEvent('globalMessageUpdate', {
      detail: {
        chatId: message.chatId,
        message: normalizedMessage,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(globalEvent);
    
    console.log('🚀 Global message event dispatched for chat:', message.chatId);
  }, [updateChatPreview]);

  // Função para controlar auto-scroll
  const setAutoScroll = useCallback((enabled: boolean) => {
    setAutoScrollToBottom(enabled);
  }, []);

  // Função para sincronização incremental ULTRA OTIMIZADA
  const syncIncremental = useCallback(async (): Promise<void> => {
    if (!profileIdRef.current || isSyncing || !selectedChatRef.current) {
      return;
    }

    // Debounce otimizado para velocidade máxima
    const now = Date.now();
    if (now - lastSyncAttempt < 100) { // REDUZIDO PARA 100ms - INSTANTÂNEO
      return;
    }
    setLastSyncAttempt(now);

    setIsSyncing(true);
    
    try {
      
      // Buscar mensagens diretamente (mais rápido que endpoint /sync)
      const messagesData = await whatsappSync.getMessages(profileIdRef.current, selectedChatRef.current.id);
      
      if (messagesData && messagesData.length > 0) {
        // Verificar se há mensagens novas com deduplicação mais robusta
        setMessages(prevMessages => {
          // Criar um mapa de mensagens existentes por ID primeiro
          const existingMessagesById = new Map();
          prevMessages.forEach(msg => {
            if (msg.id) {
              existingMessagesById.set(msg.id, true);
            }
          });
          
          // Criar um mapa de mensagens existentes por conteúdo e timestamp
          const existingMessagesByContent = new Map();
          prevMessages.forEach(msg => {
            const key = `${msg.text}_${msg.isSent}_${msg.time instanceof Date ? msg.time.getTime() : new Date(msg.time).getTime()}`;
            existingMessagesByContent.set(key, true);
          });
          
          // Filtrar mensagens novas
          const newMessages = messagesData.filter(msg => {
            // Verificar por ID primeiro
            if (msg.id && existingMessagesById.has(msg.id)) {
              return false;
            }
            
            // Verificar por conteúdo e timestamp
            const key = `${msg.text}_${msg.isSent}_${msg.time instanceof Date ? msg.time.getTime() : new Date(msg.time).getTime()}`;
            return !existingMessagesByContent.has(key);
          });
          
          // Remover mensagens temporárias que foram substituídas por mensagens reais
          const tempMessagesToRemove = prevMessages.filter(msg => 
            msg.isTemp && newMessages.some(newMsg => 
              newMsg.text === msg.text && newMsg.isSent === msg.isSent
            )
          );
          
          if (newMessages.length > 0) {
            // Remover mensagens temporárias que foram substituídas
            const filteredPrevMessages = prevMessages.filter(msg => 
              !tempMessagesToRemove.some(tempMsg => tempMsg.id === msg.id)
            );
            
            // Adicionar apenas as mensagens novas
            const allMessages = [...filteredPrevMessages, ...newMessages].sort((a, b) => {
              const timeA = a.time instanceof Date ? a.time : new Date(a.time);
              const timeB = b.time instanceof Date ? b.time : new Date(b.time);
              return timeA.getTime() - timeB.getTime();
            });
            
            // Não limitar o número de mensagens - permitir histórico completo
            // O sistema de paginação no frontend vai gerenciar a performance
            return allMessages;
          }
          
          return prevMessages;
        });
      }
      
      setLastSyncTime(Date.now());
      
    } catch (error) {
      console.error('❌ Error in fast incremental sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Função para enviar mensagem
  const sendMessage = useCallback(async (text: string) => {
    if (!profileId || !selectedChat || !text.trim()) return;

    // Verificar se já existe uma mensagem temporária com o mesmo texto para evitar duplicatas
    const trimmedText = text.trim();
    const hasTempMessage = messages.some(msg => 
      msg.isTemp && msg.text === trimmedText && msg.isSent
    );
    
    if (hasTempMessage) {
      return;
    }

    const tempMessage: WhatsAppMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chatId: selectedChat.id,
      text: trimmedText,
      time: new Date(),
      isSent: true,
      status: 'sent',
      type: 'text',
      isTemp: true
    };

    // Adicionar mensagem temporária imediatamente
    setMessages(prev => {
      const newMessages = [...prev, tempMessage];
      return newMessages;
    });
    
    // Adicionar também ao displayedMessages para aparecer instantaneamente
    setDisplayedMessages(prev => {
      console.log('✅ Adding temp message to displayedMessages:', tempMessage.text);
      return [...prev, tempMessage];
    });

    try {
      const response = await whatsappSync.sendMessage(profileId, selectedChat.id, text.trim());
      
      if (response.success) {
        // Atualizar a mensagem temporária com dados reais e marcar como não temporária
        const updatedMessage: WhatsAppMessage = { 
          ...tempMessage, 
          id: response.messageId || tempMessage.id, 
          status: 'sent' as const, 
          isTemp: false 
        };
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? updatedMessage : msg
          )
        );
        
        // Atualizar também no displayedMessages
        setDisplayedMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? updatedMessage : msg
          )
        );
        
        console.log('✅ Message sent successfully, updated temp message');
      } else {
        console.error('❌ Failed to send message:', response.error);
        
        // Remover mensagem temporária em caso de erro
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setDisplayedMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setError('Falha ao enviar mensagem. Tente novamente.');
      }
    } catch (err) {
      console.error('❌ Error sending message:', err);
      
      // Remover mensagem temporária em caso de erro
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setError('Erro ao enviar mensagem. Tente novamente.');
    }
  }, [profileId, selectedChat, messages]);

  // Função para selecionar chat
  const selectChat = useCallback((chat: WhatsAppChat) => {
    console.log(`🎯 selectChat called for profile ${profileIdRef.current}:`, {
      chatId: chat.id,
      chatName: chat.contact?.name,
      chatNumber: chat.contact?.number,
      unreadCount: chat.unreadCount
    });
    
    setSelectedChat(chat);
    setMessages([]); // Limpar mensagens antes de carregar novas
    setError(null);
    setProcessedMessages(new Set()); // Limpar cache de mensagens processadas
    
    // Carregar mensagens para o chat selecionado
    if (profileIdRef.current) {
      loadMessages(chat.id);
    }
    
    // Marcar mensagens como lidas
    if (chat.unreadCount > 0 && profileIdRef.current) {
      whatsappSync.markAsRead(profileIdRef.current, chat.id, []).catch(err => {
        console.error('Error marking as read:', err);
      });
    }
  }, [loadMessages]);

  // WebSocket message handler - ULTRA OTIMIZADO PARA VELOCIDADE MÁXIMA
  const handleNewMessage = useCallback((message: WhatsAppMessage) => {
    // Log apenas raramente para não impactar performance
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.02) {
      console.log('⚡ ULTRA-FAST message received:', message.chatId, message.text?.substring(0, 20));
    }
    
    // NORMALIZAR MENSAGEM IMEDIATAMENTE - SEM VERIFICAÇÕES DESNECESSÁRIAS
    const normalizedMessage: WhatsAppMessage = {
      ...message,
      time: message.time instanceof Date ? message.time : new Date(message.time),
      chatId: message.chatId
    };
    
    // VERIFICAR SE É O CHAT ATUAL - CRÍTICO PARA VELOCIDADE
    const isCurrentChat = selectedChatRef.current && message.chatId === selectedChatRef.current.id;
    
    if (isCurrentChat) {
      // ADICIONAR IMEDIATAMENTE AO DISPLAYEDMESSAGES - SEM VERIFICAÇÕES COMPLEXAS
      setDisplayedMessages(prev => {
        // Verificação mínima de duplicata por ID apenas
        if (message.id && prev.some(msg => msg.id === message.id)) {
          return prev;
        }
        return [...prev, normalizedMessage];
      });
      
      // ADICIONAR TAMBÉM AO MESSAGES COMPLETO - SEM ORDENAÇÃO COMPLEXA
      setMessages(prev => {
        if (message.id && prev.some(msg => msg.id === message.id)) {
          return prev;
        }
        // Adicionar ao final e ordenar apenas se necessário
        const newMessages = [...prev, normalizedMessage];
        if (newMessages.length > 1) {
          const lastMessage = newMessages[newMessages.length - 2];
          if (normalizedMessage.time < lastMessage.time) {
            // Só ordenar se a nova mensagem é mais antiga que a anterior
            return newMessages.sort((a, b) => {
              const timeA = a.time instanceof Date ? a.time : new Date(a.time);
              const timeB = b.time instanceof Date ? b.time : new Date(b.time);
              return timeA.getTime() - timeB.getTime();
            });
          }
        }
        return newMessages;
      });
      
      // MARCAR COMO LIDA IMEDIATAMENTE SE NÃO FOI ENVIADA POR NÓS
      if (!message.isSent && profileIdRef.current && selectedChatRef.current) {
        whatsappSync.markAsRead(profileIdRef.current, selectedChatRef.current.id, [message.id]).catch(() => {
          // Silenciar erro para não impactar performance
        });
      }
    }
    
    // ATUALIZAR PREVIEW DO CHAT NA LISTA - SEMPRE
    updateChatPreview(message.chatId, normalizedMessage);
    
    // DISPARAR EVENTOS GLOBAIS PARA SINCRONIZAÇÃO - SEM LOGGING
    const messageEvent = new CustomEvent('newMessageReceived', {
      detail: {
        chatId: message.chatId,
        message: normalizedMessage,
        timestamp: Date.now(),
        isCurrentChat
      }
    });
    window.dispatchEvent(messageEvent);
    
    const customEvent = new CustomEvent('chatPreviewUpdate', {
      detail: {
        chatId: message.chatId,
        message: normalizedMessage,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(customEvent);
  }, [updateChatPreview]);

  // Message status handler
  const handleMessageStatus = useCallback((data: { messageId: string; status: string }) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: data.status as any }
          : msg
      )
    );
  }, []);

  // Typing indicator handler
  const handleTyping = useCallback((data: { chatId: string; isTyping: boolean }) => {
    // Só atualizar se for o chat atual
    if (selectedChatRef.current && data.chatId === selectedChatRef.current.id) {
      setIsTyping(data.isTyping);
    }
  }, []);

  // Sync update handler - ULTRA OTIMIZADO
  const handleSyncUpdate = useCallback((data: { chatIds: string[]; timestamp: number; type?: string; immediate?: boolean }) => {
    // Se for uma atualização imediata (mensagem nova), não fazer nada extra
    // pois já foi processada pelo handleNewMessage
    if (data.immediate) {
      return;
    }
    
    // Processar apenas se o chat atual foi afetado
    if (selectedChatRef.current && data.chatIds.includes(selectedChatRef.current.id)) {
      syncIncremental();
    }
  }, [syncIncremental]);

  // Setup WebSocket listeners
  useEffect(() => {
    if (!profileId) return;

    whatsappSync.joinWhatsAppRoom(profileId);
    whatsappSync.subscribe('message', handleNewMessage);
    whatsappSync.subscribe('status', handleMessageStatus);
    whatsappSync.subscribe('state', handleTyping);
    whatsappSync.subscribe('sync_update', handleSyncUpdate);

    return () => {
      whatsappSync.unsubscribe('message', handleNewMessage);
      whatsappSync.unsubscribe('status', handleMessageStatus);
      whatsappSync.unsubscribe('state', handleTyping);
      whatsappSync.unsubscribe('sync_update', handleSyncUpdate);
    };
  }, [profileId, handleNewMessage, handleMessageStatus, handleTyping, handleSyncUpdate]);

  // Setup automatic sync interval - ULTRA OTIMIZADO PARA VELOCIDADE MÁXIMA
  useEffect(() => {
    if (!profileId || !selectedChat) {
      return;
    }

    const interval = setInterval(() => {
      syncIncremental();
    }, 1000); // Reduzido para 1 segundo para máxima velocidade
    
    // Atualização automática de mensagens (manter conversas recentes)
    const autoUpdateInterval = setInterval(() => {
      if (!loadingRef.current && selectedChatRef.current) {
        updateMessages();
      }
    }, 2000); // Atualizar a cada 2 segundos
    
    // Limpar cache de mensagens processadas a cada 10 minutos para evitar crescimento excessivo
    const cacheCleanupInterval = setInterval(() => {
      setProcessedMessages(new Set());
    }, 10 * 60 * 1000); // 10 minutos (aumentado para reduzir overhead)
    
    setSyncInterval(interval);
    autoUpdateIntervalRef.current = autoUpdateInterval;
    
    return () => {
      if (interval) {
        clearInterval(interval);
        setSyncInterval(null);
      }
      if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateIntervalRef.current = null;
      }
      if (cacheCleanupInterval) {
        clearInterval(cacheCleanupInterval);
      }
    };
  }, [profileId, selectedChat?.id, syncIncremental, updateMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (messageSyncIntervalRef.current) {
        clearInterval(messageSyncIntervalRef.current);
      }
      if (autoUpdateIntervalRef.current) {
        clearInterval(autoUpdateIntervalRef.current);
      }
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [syncInterval, profileId]);

  return {
    // Estados principais
    selectedChat,
    messages: displayedMessages, // Retornar apenas as mensagens exibidas
    loading,
    error,
    lastSyncTime,
    isTyping,
    
    // Estados de paginação
    hasMoreMessages,
    isLoadingMoreMessages,
    currentMessagePage,
    
    // Estados de auto-scroll
    autoScrollToBottom,
    shouldPreserveScroll,
    
    // Funções principais
    selectChat, // Adicionar a função selectChat
    setSelectedChat,
    loadMessages,
    loadMoreMessages, // Nova função para carregar mais mensagens
    sendMessage,
    updateChatPreview,
    syncIncremental,
    setAutoScroll, // Nova função para controlar auto-scroll
    
    // Estados de debug
    isSyncing,
    lastSyncAttempt: lastSyncAttempt,
    processedMessages: Array.from(processedMessages)
  };
};