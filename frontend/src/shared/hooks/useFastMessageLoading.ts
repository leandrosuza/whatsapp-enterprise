import { useState, useCallback, useRef, useMemo } from 'react';
import { WhatsAppMessage } from '../types/whatsapp';
import { whatsappSync } from '../services/whatsappSync';

interface UseFastMessageLoadingOptions {
  initialBatchSize?: number;
  loadMoreBatchSize?: number;
  preloadThreshold?: number;
  enableVirtualization?: boolean;
  cacheEnabled?: boolean;
}

export const useFastMessageLoading = (
  profileId: string,
  chatId: string,
  options: UseFastMessageLoadingOptions = {}
) => {
  const {
    initialBatchSize = 30,
    loadMoreBatchSize = 50,
    preloadThreshold = 10,
    enableVirtualization = true,
    cacheEnabled = true
  } = options;

  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedTime, setLastLoadedTime] = useState<number>(0);

  // Refs para controle de estado
  const loadingRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const loadedMessageIdsRef = useRef<Set<string>>(new Set());
  const preloadQueueRef = useRef<WhatsAppMessage[]>([]);

  // Função para carregar mensagens iniciais rapidamente
  const loadInitialMessages = useCallback(async () => {
    if (loadingRef.current || !profileId || !chatId) return;

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 Loading initial messages for chat ${chatId}`);
      }

      // Carregar mensagens iniciais
      const initialMessages = await whatsappSync.getMessages(profileId, chatId, initialBatchSize);
      
      if (initialMessages && initialMessages.length > 0) {
        // Normalizar e processar mensagens
        const normalizedMessages = initialMessages.map(msg => ({
          ...msg,
          time: msg.time instanceof Date ? msg.time : new Date(msg.time),
          id: msg.id || `temp-${Date.now()}-${Math.random()}`
        }));

        // Ordenar por tempo
        const sortedMessages = normalizedMessages.sort((a, b) => {
          const timeA = a.time instanceof Date ? a.time : new Date(a.time);
          const timeB = b.time instanceof Date ? b.time : new Date(b.time);
          return timeA.getTime() - timeB.getTime();
        });

        setMessages(sortedMessages);
        setHasMore(initialMessages.length >= initialBatchSize);
        
        // Armazenar IDs das mensagens carregadas
        sortedMessages.forEach(msg => {
          if (msg.id) {
            loadedMessageIdsRef.current.add(msg.id);
          }
        });

        // Definir última mensagem carregada
        if (sortedMessages.length > 0) {
          lastMessageIdRef.current = sortedMessages[sortedMessages.length - 1].id;
        }

        setLastLoadedTime(Date.now());

        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Loaded ${sortedMessages.length} initial messages`);
        }
      } else {
        setMessages([]);
        setHasMore(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error loading initial messages:', err);
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [profileId, chatId, initialBatchSize]);

  // Função para carregar mais mensagens (lazy loading)
  const loadMoreMessages = useCallback(async () => {
    if (loadingRef.current || isLoadingMore || !hasMore || !profileId || !chatId) return;

    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`📜 Loading more messages for chat ${chatId}`);
      }

      // Carregar mais mensagens do servidor
      const moreMessages = await whatsappSync.getMessages(profileId, chatId, loadMoreBatchSize);
      
      if (moreMessages && moreMessages.length > 0) {
        // Filtrar mensagens já carregadas
        const newMessages = moreMessages.filter(msg => {
          if (!msg.id) return true;
          return !loadedMessageIdsRef.current.has(msg.id);
        });

        if (newMessages.length > 0) {
          // Normalizar e processar novas mensagens
          const normalizedNewMessages = newMessages.map(msg => ({
            ...msg,
            time: msg.time instanceof Date ? msg.time : new Date(msg.time),
            id: msg.id || `temp-${Date.now()}-${Math.random()}`
          }));

          // Adicionar ao estado existente
          setMessages(prev => {
            const combined = [...prev, ...normalizedNewMessages];
            
            // Ordenar por tempo
            const sorted = combined.sort((a, b) => {
              const timeA = a.time instanceof Date ? a.time : new Date(a.time);
              const timeB = b.time instanceof Date ? b.time : new Date(b.time);
              return timeA.getTime() - timeB.getTime();
            });

            // Remover duplicatas
            const unique = sorted.filter((msg, index, self) => 
              index === self.findIndex(m => m.id === msg.id)
            );

            return unique;
          });

          // Armazenar IDs das novas mensagens
          normalizedNewMessages.forEach(msg => {
            if (msg.id) {
              loadedMessageIdsRef.current.add(msg.id);
            }
          });

          setHasMore(moreMessages.length >= loadMoreBatchSize);
          setLastLoadedTime(Date.now());

          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Loaded ${normalizedNewMessages.length} more messages`);
          }
        } else {
          // Não há mensagens novas
          setHasMore(false);
        }
      } else {
        // Não há mais mensagens
        setHasMore(false);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error loading more messages:', err);
      }
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [profileId, chatId, loadMoreBatchSize, hasMore, isLoadingMore]);

  // Função para adicionar nova mensagem instantaneamente
  const addNewMessage = useCallback((message: WhatsAppMessage) => {
    if (!message.id || loadedMessageIdsRef.current.has(message.id)) {
      return;
    }

    const normalizedMessage = {
      ...message,
      time: message.time instanceof Date ? message.time : new Date(message.time),
      id: message.id
    };

    setMessages(prev => {
      const updated = [...prev, normalizedMessage];
      
      // Ordenar por tempo
      const sorted = updated.sort((a, b) => {
        const timeA = a.time instanceof Date ? a.time : new Date(a.time);
        const timeB = b.time instanceof Date ? b.time : new Date(b.time);
        return timeA.getTime() - timeB.getTime();
      });

      return sorted;
    });

    loadedMessageIdsRef.current.add(message.id);
    lastMessageIdRef.current = message.id;

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Added new message instantly: ${message.text?.substring(0, 30)}`);
    }
  }, []);

  // Função para atualizar mensagem existente
  const updateMessage = useCallback((messageId: string, updates: Partial<WhatsAppMessage>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Função para remover mensagem
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    loadedMessageIdsRef.current.delete(messageId);
  }, []);

  // Função para limpar mensagens
  const clearMessages = useCallback(() => {
    setMessages([]);
    loadedMessageIdsRef.current.clear();
    lastMessageIdRef.current = null;
    setHasMore(true);
  }, []);

  // Função para recarregar mensagens
  const reloadMessages = useCallback(async () => {
    clearMessages();
    await loadInitialMessages();
  }, [clearMessages, loadInitialMessages]);

  // Função para verificar se mensagem está carregada
  const isMessageLoaded = useCallback((messageId: string) => {
    return loadedMessageIdsRef.current.has(messageId);
  }, []);

  // Função para obter estatísticas
  const getStats = useCallback(() => ({
    totalMessages: messages.length,
    loadedMessageIds: loadedMessageIdsRef.current.size,
    hasMore,
    isLoading,
    isLoadingMore,
    lastLoadedTime,
    lastMessageId: lastMessageIdRef.current
  }), [messages.length, hasMore, isLoading, isLoadingMore, lastLoadedTime]);

  // Memoizar valores para evitar re-renders desnecessários
  const memoizedValues = useMemo(() => ({
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    lastLoadedTime
  }), [messages, isLoading, isLoadingMore, hasMore, error, lastLoadedTime]);

  return {
    // Estados
    ...memoizedValues,
    
    // Funções
    loadInitialMessages,
    loadMoreMessages,
    addNewMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    reloadMessages,
    isMessageLoaded,
    getStats
  };
};

export default useFastMessageLoading; 