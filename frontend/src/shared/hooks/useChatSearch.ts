import { useState, useEffect, useCallback, useRef } from 'react';
import { WhatsAppChat } from '../types/whatsapp';
import { whatsappSync } from '../services/whatsappSync';

export interface ChatSearchFilters {
  searchTerm: string;
  activeFilter: 'all' | 'unread' | 'favorites' | 'groups';
}

export interface ChatSearchState {
  chats: WhatsAppChat[];
  filteredChats: WhatsAppChat[];
  loading: boolean;
  error: string | null;
  lastUpdate: number;
}

export interface ChatAnimationState {
  animatingChatId: string | null;
  fromIndex: number;
  toIndex: number;
  isAnimating: boolean;
}

export const useChatSearch = (profileId: string) => {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [filteredChats, setFilteredChats] = useState<WhatsAppChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>('all');
  
  // Estado para controlar sincronização
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Estado de paginação
  const [displayedChats, setDisplayedChats] = useState<WhatsAppChat[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const CHATS_PER_PAGE = 30; // Carregar 30 conversas por vez
  
  // Estado de animação para mover chats para o topo
  const [animationState, setAnimationState] = useState<{
    isAnimating: boolean;
    animatingChatId: string | null;
    fromIndex: number;
    toIndex: number;
  }>({
    isAnimating: false,
    animatingChatId: null,
    fromIndex: -1,
    toIndex: -1
  });
  
  // Refs para debounce e controle de animação
  const animationDebounceRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const animationQueueRef = useRef<Set<string>>(new Set());
  const lastSyncAttempt = useRef<number>(0);
  const profileIdRef = useRef<string>(profileId);
  
  // Atualizar ref quando profileId mudar
  useEffect(() => {
    profileIdRef.current = profileId;
  }, [profileId]);
  
  // Função para carregar chats com paginação
  const loadChats = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!profileIdRef.current) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log(`📥 Loading chats page ${page} for profile ${profileIdRef.current}`);
      
      const response = await fetch(`/api/whatsapp/profiles/${profileIdRef.current}/chats?page=${page}&limit=${CHATS_PER_PAGE}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const newChats = data.chats || [];
      
      console.log(`📨 Received ${newChats.length} chats for page ${page}`);
      
      if (append) {
        // Adicionar novos chats ao final da lista
        setChats(prev => [...prev, ...newChats]);
      } else {
        // Substituir lista completa (primeira página)
        setChats(newChats);
        setCurrentPage(1);
      }
      
      // Verificar se há mais chats para carregar
      setHasMoreChats(newChats.length === CHATS_PER_PAGE);
      
    } catch (err) {
      console.error('❌ Error loading chats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Função para carregar mais chats (lazy loading)
  const loadMoreChats = useCallback(async () => {
    if (isLoadingMore || !hasMoreChats) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      console.log(`📥 Loading more chats, page ${nextPage}`);
      
      const response = await fetch(`/api/whatsapp/profiles/${profileIdRef.current}/chats?page=${nextPage}&limit=${CHATS_PER_PAGE}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const newChats = data.chats || [];
      
      console.log(`📨 Received ${newChats.length} more chats for page ${nextPage}`);
      
      // Adicionar novos chats ao final da lista
      setChats(prev => [...prev, ...newChats]);
      setCurrentPage(nextPage);
      
      // Verificar se há mais chats para carregar (baseado na resposta do servidor)
      setHasMoreChats(newChats.length === CHATS_PER_PAGE);
      
    } catch (err) {
      console.error('❌ Error loading more chats:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMoreChats, isLoadingMore]);
  
  // Carregar primeira página na inicialização
  useEffect(() => {
    loadChats(1, false);
  }, [loadChats]);
  
  // Aplicar filtros aos chats exibidos
  useEffect(() => {
    let filtered = chats; // Usar todos os chats em vez de apenas displayedChats
    
    // Aplicar filtro de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(chat => 
        chat.contact.name.toLowerCase().includes(term) ||
        chat.contact.lastMessage?.toLowerCase().includes(term)
      );
    }
    
    // Aplicar filtros ativos
    switch (activeFilter) {
      case 'unread':
        filtered = filtered.filter(chat => chat.unreadCount > 0);
        break;
      case 'groups':
        filtered = filtered.filter(chat => chat.contact.isGroup);
        break;
      default:
        break;
    }
    
    // Aplicar paginação aos resultados filtrados
    const startIndex = (currentPage - 1) * CHATS_PER_PAGE;
    const endIndex = startIndex + CHATS_PER_PAGE;
    const paginatedFiltered = filtered.slice(startIndex, endIndex);
    
    setFilteredChats(paginatedFiltered);
    setDisplayedChats(paginatedFiltered); // Atualizar displayedChats também
    setHasMoreChats(filtered.length > endIndex);
  }, [chats, searchTerm, activeFilter, currentPage]);

  // Função para aplicar filtros
  const applyFilters = useCallback((chats: WhatsAppChat[], filters: ChatSearchFilters): WhatsAppChat[] => {
    const { searchTerm, activeFilter } = filters;
    
    const filteredChats = chats.filter(chat => {
      // Filtro por texto de busca
      if (searchTerm.trim()) {
        const matchesSearch = chat.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             chat.contact.number.includes(searchTerm);
        
        if (!matchesSearch) return false;
      }
      
      // Filtro por tipo
      switch (activeFilter) {
        case 'unread':
          return chat.unreadCount > 0;
        case 'favorites':
          return chat.isPinned;
        case 'groups':
          return chat.contact.isGroup;
        case 'all':
        default:
          return true;
      }
    });
    
    // Manter a ordenação original (por unreadCount e lastActivity) após aplicar filtros
    return filteredChats.sort((a, b) => {
      // Primeiro, chats com mensagens não lidas têm prioridade
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // Se ambos têm ou não têm mensagens não lidas, ordenar por lastActivity
      const timeA = a.lastActivity instanceof Date ? a.lastActivity : new Date(a.lastActivity);
      const timeB = b.lastActivity instanceof Date ? b.lastActivity : new Date(b.lastActivity);
      return timeB.getTime() - timeA.getTime(); // Ordem decrescente (mais recente primeiro)
    });
  }, []);

  // Função para atualizar filtros
  const updateFilters = useCallback((filters: { searchTerm?: string; activeFilter?: 'all' | 'unread' | 'groups' }) => {
    if (filters.searchTerm !== undefined) {
      setSearchTerm(filters.searchTerm);
    }
    if (filters.activeFilter !== undefined) {
      setActiveFilter(filters.activeFilter);
    }
    
    // Reset pagination when filters change
    setCurrentPage(1);
  }, []);

  // Função para atualizar preview de um chat específico - INSTANTÂNEA E RESPONSIVA
  const updateChatPreview = useCallback((chatId: string, message: any) => {
    if (!message || !message.text) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ updateChatPreview: Invalid message data:', message);
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 updateChatPreview called for chat:', chatId, 'Message:', message.text.substring(0, 30));
    }
    
    // ATUALIZAÇÃO INSTANTÂNEA - SEM DEBOUNCE PARA MÁXIMA VELOCIDADE
    setChats(prev => {
      const chatIndex = prev.findIndex(chat => chat.id === chatId);
      if (chatIndex === -1) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Chat not found in list:', chatId);
        }
        return prev;
      }
      
      const messageTime = message.time instanceof Date ? message.time : new Date(message.time);
      const currentChat = prev[chatIndex];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 Updating chat preview INSTANTLY:', {
          chatId,
          oldMessage: currentChat.contact.lastMessage,
          newMessage: message.text,
          oldTime: currentChat.contact.lastTime,
          newTime: messageTime.toISOString()
        });
      }
      
      // Verificar se a mensagem é mais recente que a atual (com tolerância reduzida de 1 segundo)
      const currentLastActivity = currentChat.lastActivity instanceof Date ? 
        currentChat.lastActivity : 
        (currentChat.lastActivity ? new Date(currentChat.lastActivity) : null);
      
      const timeDiff = currentLastActivity ? 
        Math.abs(messageTime.getTime() - currentLastActivity.getTime()) : 0;
      
      // Se a mensagem é mais antiga que a atual (com tolerância reduzida), verificar se é uma mensagem não lida
      if (currentLastActivity && messageTime < currentLastActivity && timeDiff > 1000) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⏭️ Message is significantly older than current lastActivity, skipping update');
        }
        return prev;
      }
      
      // Criar novo array para forçar re-render
      const newChats = [...prev];
      const updatedChat = {
        ...currentChat,
        lastActivity: messageTime,
        unreadCount: (currentChat.unreadCount || 0) + (message.isSent ? 0 : 1),
        contact: {
          ...currentChat.contact,
          lastMessage: message.text,
          lastTime: messageTime.toISOString(),
          unreadCount: (currentChat.contact.unreadCount || 0) + (message.isSent ? 0 : 1),
          status: message.isSent ? ('sent' as const) : ('none' as const)
        }
      };
      
      // LÓGICA OTIMIZADA PARA MOVER PARA O TOPO - MAIS AGRESSIVA
      const shouldMoveToTop = chatIndex > 0 && (
        // SEMPRE mover se é uma mensagem nova (não enviada por nós)
        !message.isSent ||
        // Ou se o chat tem mensagens não lidas
        updatedChat.unreadCount > 0 ||
        // Ou se a mensagem é mais recente (mesmo que seja nossa)
        (currentLastActivity && messageTime > currentLastActivity) ||
        // Ou se é uma mensagem nossa e o chat não está no topo (para manter conversas ativas no topo)
        (message.isSent && chatIndex > 0)
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Chat move decision:', {
          chatId,
          shouldMoveToTop,
          isSent: message.isSent,
          unreadCount: updatedChat.unreadCount,
          reason: !message.isSent ? 'new_message' : 
                 updatedChat.unreadCount > 0 ? 'unread' : 
                 (currentLastActivity && messageTime > currentLastActivity) ? 'newer' : 
                 (message.isSent && chatIndex > 0) ? 'active_conversation' : 'no_move'
        });
      }
      
      // Se deve mover para o topo, fazer IMEDIATAMENTE sem animação
      if (shouldMoveToTop) {
        // Atualizar o chat na posição atual primeiro
        newChats[chatIndex] = updatedChat;
        
        // Mover para o topo IMEDIATAMENTE (sem animação)
        const movedChat = newChats.splice(chatIndex, 1)[0];
        newChats.unshift(movedChat);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 Chat moved to top instantly:', chatId);
        }
      } else {
        // Apenas atualizar o chat na posição atual
        newChats[chatIndex] = updatedChat;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Chat preview updated INSTANTLY:', chatId);
      }
      return newChats;
    });
    
    // Atualizar filteredChats também para refletir as mudanças
    setFilteredChats(prev => {
      const chatIndex = prev.findIndex(chat => chat.id === chatId);
      if (chatIndex === -1) return prev;
      
      const currentChat = prev[chatIndex];
      const messageTime = message.time instanceof Date ? message.time : new Date(message.time);
      
      const updatedChat = {
        ...currentChat,
        lastActivity: messageTime,
        unreadCount: (currentChat.unreadCount || 0) + (message.isSent ? 0 : 1),
        contact: {
          ...currentChat.contact,
          lastMessage: message.text,
          lastTime: messageTime.toISOString(),
          unreadCount: (currentChat.contact.unreadCount || 0) + (message.isSent ? 0 : 1),
          status: message.isSent ? ('sent' as const) : ('none' as const)
        }
      };
      
      const newFilteredChats = [...prev];
      newFilteredChats[chatIndex] = updatedChat;
      
      // Mover para o topo também na lista filtrada se necessário
      const currentLastActivityFiltered = currentChat.lastActivity instanceof Date ? 
        currentChat.lastActivity : 
        (currentChat.lastActivity ? new Date(currentChat.lastActivity) : null);
      
      if (chatIndex > 0 && (
        !message.isSent ||
        updatedChat.unreadCount > 0 ||
        (currentLastActivityFiltered && messageTime > currentLastActivityFiltered) ||
        (message.isSent && chatIndex > 0)
      )) {
        const movedChat = newFilteredChats.splice(chatIndex, 1)[0];
        newFilteredChats.unshift(movedChat);
      }
      
      return newFilteredChats;
    });
    
    // Disparar evento global para notificar outros componentes
    const globalEvent = new CustomEvent('chatPreviewUpdated', {
      detail: {
        chatId,
        message,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(globalEvent);
    
  }, [animationState.isAnimating, animationState.animatingChatId]);

  // Função para atualizar um chat específico na lista
  const updateChatInList = useCallback((chatId: string, chatData: any) => {
    if (!chatData) {
      console.warn('⚠️ updateChatInList: chatData is undefined for chatId:', chatId);
      return;
    }
    

    
    setChats(prev => {
      const updatedChats = prev.map(chat => {
        if (chat.id === chatId) {
          const updatedChat = { ...chat };
          
          // Atualizar campos específicos se fornecidos
          if (chatData.lastMessage !== undefined) {
            updatedChat.contact = {
              ...updatedChat.contact,
              lastMessage: chatData.lastMessage
            };
          }
          
          if (chatData.lastMessageTime !== undefined) {
            updatedChat.lastActivity = chatData.lastMessageTime;
            updatedChat.contact = {
              ...updatedChat.contact,
              lastTime: chatData.lastMessageTime.toISOString()
            };
          }
          
          if (chatData.unreadCount !== undefined) {
            updatedChat.unreadCount = chatData.unreadCount;
            updatedChat.contact = {
              ...updatedChat.contact,
              unreadCount: chatData.unreadCount
            };
          }
          

          
          return updatedChat;
        }
        return chat;
      });
      
      return updatedChats;
    });
  }, []);

  // Aplicar filtros sempre que chats ou filtros mudarem
  useEffect(() => {
    const filters: ChatSearchFilters = { searchTerm, activeFilter };
    const filtered = applyFilters(chats, filters);
    setFilteredChats(filtered);
    

  }, [chats, searchTerm, activeFilter, applyFilters]);

  // Função para sincronização incremental (sem loading, sem recriar interface)
  const syncIncremental = useCallback(async (): Promise<void> => {
    if (!profileIdRef.current || loading || error || isSyncing) {
      return;
    }

    setIsSyncing(true);
    try {
      console.log(`🔄 syncIncremental for profileId: ${profileIdRef.current}`);
      const chatsData = await whatsappSync.getChats(profileIdRef.current);
      console.log(`📥 syncIncremental received ${chatsData.length} chats for profile ${profileIdRef.current}`);
      
      // Validar dados recebidos
      if (!Array.isArray(chatsData)) {
        console.error('❌ Invalid chats data received:', chatsData);
        return;
      }

      // Atualizar apenas os campos alterados, sem recriar array
      setDisplayedChats(prevChats => {
        const updatedChats = prevChats.map(prevChat => {
          const newChat = chatsData.find(c => c.id === prevChat.id);
          if (!newChat) return prevChat;
          
          // Garantir que lastActivity seja sempre um Date válido
          const prevLastActivity = prevChat.lastActivity instanceof Date ? 
            prevChat.lastActivity : 
            (prevChat.lastActivity ? new Date(prevChat.lastActivity) : new Date());
          
          const newLastActivity = newChat.lastActivity instanceof Date ? 
            newChat.lastActivity : 
            (newChat.lastActivity ? new Date(newChat.lastActivity) : new Date());
          
          // Verificar se há mudanças significativas
          const hasChanges = 
            newChat.contact.lastMessage !== prevChat.contact.lastMessage ||
            newChat.unreadCount !== prevChat.unreadCount ||
            newLastActivity.getTime() !== prevLastActivity.getTime();
          
          if (!hasChanges) return prevChat;
          
          // Atualizar apenas os campos alterados
          return {
            ...prevChat,
            contact: {
              ...prevChat.contact,
              lastMessage: newChat.contact.lastMessage,
              lastTime: newChat.contact.lastTime || prevChat.contact.lastTime
            },
            unreadCount: newChat.unreadCount,
            lastActivity: newLastActivity
          };
        });
        
        // Adicionar novos chats se houver
        const existingIds = new Set(prevChats.map(c => c.id));
        const newChats = chatsData.filter(c => !existingIds.has(c.id));
        
        let finalChats = [...updatedChats, ...newChats];
        
        // Reordenar chats por unreadCount (prioridade) e lastActivity (mais recente primeiro) após atualizações
        finalChats.sort((a, b) => {
          // Primeiro, chats com mensagens não lidas têm prioridade
          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
          if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
          
          // Se ambos têm ou não têm mensagens não lidas, ordenar por lastActivity
          const timeA = a.lastActivity instanceof Date ? a.lastActivity : 
            (a.lastActivity ? new Date(a.lastActivity) : new Date());
          const timeB = b.lastActivity instanceof Date ? b.lastActivity : 
            (b.lastActivity ? new Date(b.lastActivity) : new Date());
          return timeB.getTime() - timeA.getTime(); // Ordem decrescente (mais recente primeiro)
        });
        
        return finalChats;
      });

    } catch (err) {
      console.error('❌ Error in silent incremental sync:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [loading, error, isSyncing]);

  // Cleanup e safety timeout
  useEffect(() => {
    if (profileId) {
      // Reset initial load flag when profile changes
      // initialLoadDoneRef.current = false; // This ref is removed, so no need to reset
      
      // Limpar cache do perfil anterior para forçar recarregamento
      whatsappSync.clearCache();
    }
    
    // Safety timeout to reset loading state
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⚠️ Safety timeout triggered - resetting loading state');
        setLoading(false);
      }
    }, 15000); // 15 seconds
    
    return () => {
      clearTimeout(timeout);
      if (loading) {
        setLoading(false);
      }
    };
  }, [profileId, loadChats, loading]);

  // Setup WebSocket listeners para atualizações de chat - OTIMIZADO PARA EVITAR DUPLICAÇÃO
  useEffect(() => {
    if (!profileId) return;


    
    const handleSyncUpdate = (data: { chatIds: string[]; timestamp: number; type?: string; immediate?: boolean }) => {
      console.log('🔄 handleSyncUpdate received:', data);
      
      // Se for uma atualização imediata de mensagem, apenas invalidar cache
      // A animação será tratada pelo evento customizado chatPreviewUpdate
      if (data.immediate && data.type === 'message' && data.chatIds.length > 0) {
        console.log('📨 Immediate message update detected for chats:', data.chatIds);
        
        // Apenas invalidar cache - não recarregar lista
        whatsappSync.invalidateChatCache(profileId);
        // NÃO chamar loadChats() - deixar a animação cuidar da atualização
      }
    };

    const handleTyping = (data: { chatId: string; isTyping: boolean }) => {

      setChats(prev => 
        prev.map(chat => 
          chat.id === data.chatId 
            ? { ...chat, contact: { ...chat.contact, isTyping: data.isTyping } }
            : chat
        )
      );
    };

    // REMOVIDO: handleNewMessage duplicado - já está sendo gerenciado pelo useChatSync
    // Isso evita processamento duplicado e conflitos

    whatsappSync.subscribe('sync_update', handleSyncUpdate);
    whatsappSync.subscribe('state', handleTyping);

    return () => {
      whatsappSync.unsubscribe('sync_update', handleSyncUpdate);
      whatsappSync.unsubscribe('state', handleTyping);
    };
  }, [profileId, loadChats]);

  // Setup listener para eventos customizados de atualização de preview
  useEffect(() => {
    const handleChatPreviewUpdate = (event: CustomEvent) => {
      const { chatId, message } = event.detail;
      
      console.log('📨 Custom event chatPreviewUpdate received for chat:', chatId);
      
      if (message && message.text) {
        console.log('✅ Processing message update for chat:', chatId, 'Message:', message.text.substring(0, 30));
        updateChatPreview(chatId, message);
      } else {
        console.warn('⚠️ Invalid message data in chatPreviewUpdate event:', message);
      }
    };

    // Adicionar listener para evento customizado
    window.addEventListener('chatPreviewUpdate', handleChatPreviewUpdate as EventListener);

    return () => {
      window.removeEventListener('chatPreviewUpdate', handleChatPreviewUpdate as EventListener);
    };
  }, [updateChatPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Limpar todos os timeouts de animação
      animationDebounceRef.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      animationDebounceRef.current.clear();
      animationQueueRef.current.clear();
      
      // Limpar estado de animação
      setAnimationState({
        isAnimating: false,
        animatingChatId: null,
        fromIndex: -1,
        toIndex: -1
      });
    };
  }, []);

  return {
    // Estados principais
    chats,
    filteredChats: displayedChats, // Usar displayedChats (paginated) em vez de filteredChats
    loading,
    error,
    searchTerm,
    activeFilter,
    animationState,
    
    // Estados de paginação
    hasMoreChats,
    isLoadingMore,
    currentPage,
    
    // Funções
    loadChats,
    loadMoreChats, // Nova função para carregar mais chats
    updateFilters,
    updateChatPreview,
    updateChatInList,
    syncIncremental,
    
    // Estado completo para debug
    getState: () => ({
      chats,
      filteredChats: displayedChats,
      loading,
      error,
      searchTerm,
      activeFilter
    })
  };
}; 