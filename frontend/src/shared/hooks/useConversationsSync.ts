import { useState, useEffect, useCallback, useRef } from 'react';
import { whatsappSync } from '../services/whatsappSync';
import { WhatsAppChat } from '../types/whatsapp';

interface Conversation {
  id: string;
  contact: {
    id: string;
    name: string;
    number: string;
    avatar?: string;
    isOnline: boolean;
    isGroup: boolean;
  };
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  status: 'active' | 'archived' | 'pinned';
  tags: string[];
  assignedTo?: string;
  lastActivity: Date;
  profileId: string; // Adicionar profileId para identificar de qual perfil vem
  profileName: string; // Adicionar nome do perfil
}

interface ConversationStats {
  totalConversations: number;
  unreadMessages: number;
  activeProfiles: number;
  highPriority: number;
}

export const useConversationsSync = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<ConversationStats>({
    totalConversations: 0,
    unreadMessages: 0,
    activeProfiles: 0,
    highPriority: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs para controle de atualizações
  const isInitialized = useRef(false);
  const currentProfileId = useRef<string | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para converter WhatsAppChat para Conversation
  const convertChatToConversation = useCallback((chat: WhatsAppChat, profileId: string, profileName: string): Conversation => {
    const conversation = {
      id: chat.id,
      contact: {
        id: chat.contact.id,
        name: chat.contact.name,
        number: chat.contact.number,
        avatar: chat.contact.avatar,
        isOnline: chat.contact.isOnline,
        isGroup: chat.contact.isGroup
      },
      lastMessage: chat.contact.lastMessage || 'No message',
      lastTime: chat.contact.lastTime || new Date().toLocaleTimeString(),
      unreadCount: chat.unreadCount || 0,
      status: 'active' as const,
      tags: chat.contact.isGroup ? ['Grupos'] : ['Individual'],
      lastActivity: chat.lastActivity ? new Date(chat.lastActivity) : new Date(),
      profileId: profileId, // Adicionar profileId
      profileName: profileName // Adicionar nome do perfil
    };
    
    // Log para debug (apenas para as primeiras conversas)
    if (Math.random() < 0.1) { // 10% das conversas
      console.log('🔄 Converting chat to conversation:', {
        id: conversation.id,
        name: conversation.contact.name,
        unreadCount: conversation.unreadCount,
        lastMessage: conversation.lastMessage?.substring(0, 30),
        profileId: conversation.profileId,
        profileName: conversation.profileName
      });
    }
    
    return conversation;
  }, []);

  // Função para calcular estatísticas
  const calculateStats = useCallback((conversations: Conversation[]): ConversationStats => {
    const totalConversations = conversations.length;
    const unreadMessages = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    const activeProfiles = conversations.filter(c => c.status === 'active').length;
    const highPriority = conversations.filter(c => c.unreadCount > 0).length;

    return {
      totalConversations,
      unreadMessages,
      activeProfiles,
      highPriority
    };
  }, []);

  // Função para atualizar apenas as estatísticas
  const updateStatsOnly = useCallback(() => {
    setStats(prevStats => {
      const newStats = calculateStats(conversations);
      // Só atualiza se houve mudança
      if (JSON.stringify(prevStats) !== JSON.stringify(newStats)) {
        console.log('📊 Stats updated:', newStats);
        return newStats;
      }
      return prevStats;
    });
  }, [conversations, calculateStats]);

  // Função para atualizar conversa específica com otimização
  const updateConversation = useCallback((chatId: string, updates: Partial<Conversation>) => {
    setConversations(prev => {
      const exists = prev.find(c => c.id === chatId);
      if (exists) {
        const updated = prev.map(c => c.id === chatId ? { ...c, ...updates } : c);
        
        // Atualizar estatísticas de forma assíncrona para não bloquear a UI
        requestAnimationFrame(() => {
          updateStatsOnly();
        });
        
        return updated;
      }
      return prev;
    });
  }, [updateStatsOnly]);

  // Função para adicionar/atualizar conversa com lógica inteligente
  const addOrUpdateConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => {
      const exists = prev.find(c => c.id === conversation.id);
      
      if (exists) {
        // Atualizar conversa existente
        const updated = prev.map(c => c.id === conversation.id ? conversation : c);
        
        // Atualizar estatísticas de forma assíncrona para não bloquear a UI
        requestAnimationFrame(() => {
          updateStatsOnly();
        });
        
        return updated;
      } else {
        // Adicionar nova conversa no início da lista
        const newList = [conversation, ...prev];
        
        // Atualizar estatísticas de forma assíncrona
        requestAnimationFrame(() => {
          updateStatsOnly();
        });
        
        return newList;
      }
    });
  }, [updateStatsOnly]);

  // Função para verificar mudanças significativas com otimização anti-piscar
  const checkForSignificantChanges = useCallback((prev: Conversation[], next: Conversation[]): boolean => {
    // Se o número de conversas mudou, é uma mudança significativa
    if (prev.length !== next.length) {
      console.log('📊 Conversation count changed:', prev.length, '->', next.length);
      return true;
    }
    
    // Verificar apenas as primeiras 15 conversas para performance
    const maxCheck = Math.min(prev.length, 15);
    let significantChanges = 0;
    
    for (let i = 0; i < maxCheck; i++) {
      const prevConv = prev[i];
      const nextConv = next[i];
      
      // Verificar apenas mudanças críticas que afetam a ordenação
      if (
        prevConv.id !== nextConv.id ||
        prevConv.unreadCount !== nextConv.unreadCount ||
        Math.abs(prevConv.lastActivity.getTime() - nextConv.lastActivity.getTime()) > 10000 // 10 segundos
      ) {
        significantChanges++;
      }
    }
    
    // Considerar mudança significativa se mais de 30% das conversas verificadas mudaram
    const changeThreshold = Math.max(1, Math.floor(maxCheck * 0.3));
    const isSignificant = significantChanges >= changeThreshold;
    
    if (isSignificant) {
      console.log('📊 Significant changes detected:', significantChanges, 'out of', maxCheck, 'checked');
    }
    
    return isSignificant;
  }, []);

  // Função para atualizar lista de conversas de forma otimizada
  const updateConversationsList = useCallback((newConversations: Conversation[]) => {
    setConversations(prev => {
      // Verificar se realmente há mudanças significativas
      const hasSignificantChanges = checkForSignificantChanges(prev, newConversations);
      
      if (hasSignificantChanges) {
        console.log('🔄 Significant changes detected, updating conversations list');
        console.log('📊 Previous conversations:', prev.length);
        console.log('📊 New conversations:', newConversations.length);
        
        // Log das primeiras conversas para debug
        if (newConversations.length > 0) {
          console.log('📋 First conversation:', {
            id: newConversations[0].id,
            name: newConversations[0].contact.name,
            unreadCount: newConversations[0].unreadCount,
            lastMessage: newConversations[0].lastMessage?.substring(0, 50)
          });
        }
        
        return newConversations;
      } else {
        console.log('⏭️ No significant changes detected, keeping current list');
        return prev;
      }
    });
    
    // Atualizar estatísticas de forma assíncrona para não bloquear a UI
    requestAnimationFrame(() => {
      updateStatsOnly();
    });
  }, [updateStatsOnly, checkForSignificantChanges]);

  // Função para ordenar conversas de forma estável
  const sortConversationsStable = useCallback((conversations: Conversation[]): Conversation[] => {
    return conversations.sort((a, b) => {
      // Primeiro critério: data da última atividade (mais recente primeiro)
      const timeDiff = b.lastActivity.getTime() - a.lastActivity.getTime();
      
      // Se a diferença de tempo for menor que 1 segundo, usar critérios secundários
      if (Math.abs(timeDiff) < 1000) {
        // Segundo critério: número de mensagens não lidas (mais não lidas primeiro)
        const unreadDiff = b.unreadCount - a.unreadCount;
        if (unreadDiff !== 0) return unreadDiff;
        
        // Terceiro critério: ID da conversa para estabilidade
        return a.id.localeCompare(b.id);
      }
      
      return timeDiff;
    });
  }, []);

  // Função para carregar conversas iniciais
  const loadInitialConversations = useCallback(async () => {
    try {
      console.log('🔄 Loading initial conversations...');
      setLoading(true);
      setError(null);
      
      // Obter perfis disponíveis
      const profiles = await whatsappSync.getProfiles();
      console.log('📋 Profiles found:', profiles.length);
      
      if (profiles.length === 0) {
        setError('No WhatsApp profiles available');
        setConversations([]);
        setStats({
          totalConversations: 0,
          unreadMessages: 0,
          activeProfiles: 0,
          highPriority: 0
        });
        return;
      }
      
      // Carregar conversas de todos os perfis
      const allConversations: Conversation[] = [];
      
      for (const profile of profiles) {
        const profileId = profile.id.toString();
        console.log('🎯 Loading conversations for profile:', profile.name, 'ID:', profileId);
        
        // Entrar na sala do WhatsApp para este perfil
        whatsappSync.joinWhatsAppRoom(profileId);
        
        try {
          // Obter chats do WhatsApp para este perfil
          console.log('📥 Fetching chats from WhatsApp for profile:', profile.name);
          const chats = await whatsappSync.getChats(profileId);
          console.log('✅ Chats fetched for profile', profile.name + ':', chats.length);
          
          // Converter chats para formato de conversas
          const profileConversations: Conversation[] = chats.map(chat => 
            convertChatToConversation(chat, profileId, profile.name)
          );
          
          allConversations.push(...profileConversations);
          
        } catch (err) {
          console.error('❌ Error loading chats for profile', profile.name + ':', err);
        }
      }
      
      console.log('🔄 Total conversations from all profiles:', allConversations.length);
      
      // Não ordenar aqui - deixar a ordenação para o componente
      // Isso evita conflitos de ordenação e permite flexibilidade
      console.log('📊 Conversations ready for component sorting');
      
      // Atualizar estado
      updateConversationsList(allConversations);
      lastUpdateTime.current = Date.now();
      
      console.log('✅ Initial conversations loaded successfully');
      
    } catch (err) {
      console.error('❌ Error loading initial conversations:', err);
      setError('Nenhum perfil online foi detectado. Ative algum perfil para poder acompanhar as conversas recentes.');
      setConversations([]);
      setStats({
        totalConversations: 0,
        unreadMessages: 0,
        activeProfiles: 0,
        highPriority: 0
      });
    } finally {
      setLoading(false);
      isInitialized.current = true;
    }
  }, [convertChatToConversation, updateConversationsList, sortConversationsStable]);

  // Função para atualização incremental (sem recarregar tudo)
  const updateIncremental = useCallback(async () => {
    if (!isInitialized.current) return;
    
    try {
      console.log('🔄 Incremental update...');
      
      // Verificar se WebSocket está conectado
      if (!whatsappSync.isConnected()) {
        console.log('⚠️ WebSocket not connected, attempting to reconnect...');
        await whatsappSync.ensureConnection();
      }
      
      // Obter perfis disponíveis
      const profiles = await whatsappSync.getProfiles();
      if (profiles.length === 0) return;
      
      // Carregar conversas de todos os perfis
      const allConversations: Conversation[] = [];
      
      for (const profile of profiles) {
        const profileId = profile.id.toString();
        
        try {
          // Forçar atualização fresca dos dados para este perfil
          console.log('📥 Fetching fresh chats for profile:', profile.name);
          const chats = await whatsappSync.getChats(profileId, true); // forceRefresh = true
          console.log('✅ Fresh chats fetched for profile', profile.name + ':', chats.length);
          
          // Converter chats para formato de conversas
          const profileConversations: Conversation[] = chats.map(chat => 
            convertChatToConversation(chat, profileId, profile.name)
          );
          
          allConversations.push(...profileConversations);
          
        } catch (err) {
          console.error('❌ Error updating chats for profile', profile.name + ':', err);
        }
      }
      
      // Não ordenar aqui - deixar a ordenação para o componente
      // Isso evita conflitos de ordenação e permite flexibilidade
      
      // Atualizar lista de conversas
      updateConversationsList(allConversations);
      lastUpdateTime.current = Date.now();
      
      console.log('✅ Incremental update completed');
      
    } catch (err) {
      console.error('❌ Error in incremental update:', err);
    }
  }, [convertChatToConversation, updateConversationsList, sortConversationsStable]);

  // Função para forçar sincronização completa
  const forceSync = useCallback(() => {
    console.log('🔄 Force sync requested');
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      loadInitialConversations();
    }, 100); // Pequeno delay para evitar múltiplas chamadas
  }, [loadInitialConversations]);

  // Função para debug do WebSocket
  const debugWebSocket = useCallback(() => {
    console.log('🔍 WebSocket Debug Info:', whatsappSync.getDebugInfo());
    console.log('🔍 Current Profile ID:', currentProfileId.current);
    console.log('🔍 Is Initialized:', isInitialized.current);
    console.log('🔍 WebSocket Connected:', whatsappSync.isConnected());
  }, []);

  // Função para testar WebSocket
  const testWebSocket = useCallback(() => {
    console.log('🧪 Testing WebSocket connection...');
    
    if (!whatsappSync.isConnected()) {
      console.log('❌ WebSocket not connected');
      return;
    }
    
    if (!currentProfileId.current) {
      console.log('❌ No profile ID available');
      return;
    }
    
    // Emitir uma mensagem de teste
    const testMessage = {
      type: 'message',
      data: {
        id: 'test-message-' + Date.now(),
        chatId: 'test-chat-id',
        text: 'Test message from frontend',
        time: new Date(),
        isSent: false,
        status: 'sent',
        type: 'text',
        isGroup: false,
        sender: 'test-sender',
        timestamp: Date.now()
      },
      timestamp: new Date(),
      profileId: currentProfileId.current
    };
    
    console.log('🧪 Emitting test message:', testMessage);
    
    // Usar método público do serviço
    whatsappSync.emitTestMessage(testMessage);
  }, []);

  // Configurar listeners do WebSocket para atualizações em tempo real
  useEffect(() => {
    if (!isInitialized.current) return;

    console.log('🔧 Setting up WebSocket listeners for real-time updates...');

    // Listener para novas mensagens (evento correto do backend)
    const handleNewMessage = (data: any) => {
      console.log('📨 New message received via WebSocket:', data);
      if (data.type === 'message' && data.data) {
        // Atualizar conversa específica com nova mensagem
        updateConversation(data.data.chatId, {
          lastMessage: data.data.text,
          lastTime: new Date().toLocaleTimeString(),
          unreadCount: (conversations.find(c => c.id === data.data.chatId)?.unreadCount || 0) + 1,
          lastActivity: new Date()
        });
        console.log('✅ Conversation updated with new message');
      }
    };

    // Listener para atualizações de status
    const handleStatusUpdate = (data: any) => {
      console.log('📊 Status update received via WebSocket:', data);
      if (data.type === 'status' && data.data) {
        // Atualizar status de mensagem se necessário
        updateConversation(data.data.chatId, {
          lastActivity: new Date()
        });
      }
    };

    // Listener para sincronização geral
    const handleSyncUpdate = (data: any) => {
      console.log('🔄 Sync update received via WebSocket:', data);
      if (data.type === 'sync' && data.data) {
        // Atualizar conversas com dados de sincronização
        updateConversationsList(data.data.conversations || conversations);
      }
    };

    // Listener para eventos do WhatsApp (eventos específicos do backend)
    const handleWhatsAppMessage = (data: any) => {
      console.log('📱 WhatsApp message event received:', data);
      if (data && data.data && data.data.chatId) {
        // Atualizar conversa específica com nova mensagem
        updateConversation(data.data.chatId, {
          lastMessage: data.data.text || '',
          lastTime: new Date().toLocaleTimeString(),
          unreadCount: (conversations.find(c => c.id === data.data.chatId)?.unreadCount || 0) + 1,
          lastActivity: new Date()
        });
        console.log('✅ Conversation updated with WhatsApp message');
      }
    };

    const handleWhatsAppStatus = (data: any) => {
      console.log('📱 WhatsApp status event received:', data);
      if (data && data.data && data.data.chatId) {
        updateConversation(data.data.chatId, {
          lastActivity: new Date()
        });
      }
    };

    // Inscrever nos eventos corretos
    whatsappSync.subscribe('whatsapp_message', handleWhatsAppMessage);
    whatsappSync.subscribe('whatsapp_status', handleWhatsAppStatus);
    whatsappSync.subscribe('message', handleNewMessage);
    whatsappSync.subscribe('status', handleStatusUpdate);
    whatsappSync.subscribe('sync_update', handleSyncUpdate);

    console.log('✅ WebSocket listeners configured successfully');

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up WebSocket listeners...');
      whatsappSync.unsubscribe('whatsapp_message', handleWhatsAppMessage);
      whatsappSync.unsubscribe('whatsapp_status', handleWhatsAppStatus);
      whatsappSync.unsubscribe('message', handleNewMessage);
      whatsappSync.unsubscribe('status', handleStatusUpdate);
      whatsappSync.unsubscribe('sync_update', handleSyncUpdate);
    };
  }, [conversations, updateConversation, updateConversationsList]);

  // Carregar conversas iniciais
  useEffect(() => {
    console.log('🚀 Initializing conversations sync...');
    loadInitialConversations();
  }, [loadInitialConversations]);

  // Atualização incremental periódica (mais frequente)
  useEffect(() => {
    if (!isInitialized.current) return;

    const interval = setInterval(() => {
      updateIncremental();
    }, 2000); // 2 segundos para atualização mais frequente

    return () => clearInterval(interval);
  }, [updateIncremental]);

  // Debug do WebSocket a cada 10 segundos
  useEffect(() => {
    if (!isInitialized.current) return;

    const debugInterval = setInterval(() => {
      debugWebSocket();
    }, 10000); // 10 segundos

    return () => clearInterval(debugInterval);
  }, [debugWebSocket]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    conversations,
    stats,
    loading,
    error,
    loadConversations: loadInitialConversations,
    updateConversation,
    addOrUpdateConversation,
    forceSync,
    updateStatsOnly,
    debugWebSocket,
    testWebSocket
  };
}; 