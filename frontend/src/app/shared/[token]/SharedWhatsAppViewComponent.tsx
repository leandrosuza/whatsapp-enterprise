'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSharedApp } from '../../../contexts/SharedAppContext';
import { useWhatsAppChatOptimized } from '../../../shared/hooks/useWhatsAppChatOptimized';
import { useWhatsAppSync } from '../../../shared/hooks/useWhatsAppSync';
import { useSyncVerification } from '../../../shared/hooks/useSyncVerification';
import { WhatsAppChat, WhatsAppMessage } from '../../../shared/types/whatsapp';
import { whatsappSync } from '../../../shared/services/whatsappSync';

import ProfileStatusIndicator from '../../../shared/components/ProfileStatusIndicator';
import MessageStatusIndicator from '../../../shared/components/MessageStatusIndicator';
import MessageOptionsMenu from '../../../shared/components/MessageOptionsMenu';
import SyncIndicator from '../../../shared/components/SyncIndicator';
import '../../admin/view/view.css';

interface SharedWhatsAppViewProps {
  profileId?: string;
  profileName?: string;
  contactNumber?: string;
  isShared?: boolean;
}

export default function SharedWhatsAppViewComponent({ profileId, profileName = 'WhatsApp Profile', contactNumber, isShared = true }: SharedWhatsAppViewProps) {
  const { 
    currentView, 
    setCurrentView, 
    subView, 
    setSubView, 
    viewParams, 
    setViewParams,
    canGoBack,
    goBack,
    getPreservedState,
    setPreservedState,
    instanceId
  } = useSharedApp();
  
  const searchParams = useSearchParams();
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get URL parameters (for compatibility)
  const urlProfileId = searchParams.get('profileId');
  const urlContactNumber = searchParams.get('contactNumber');
  const isStandalone = searchParams.get('standalone') === 'true';
  
  // Use profileId from URL if available, otherwise use prop
  const effectiveProfileId = urlProfileId || profileId;
  // Use contactNumber from prop if available, otherwise from URL
  const effectiveContactNumber = contactNumber || urlContactNumber;
  
  // State for message options menu
  const [messageMenuState, setMessageMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    messageId: string;
    message: WhatsAppMessage | null;
    menuPosition: 'above' | 'below' | 'centered' | 'header-dropdown';
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    messageId: '',
    message: null,
    menuPosition: 'above'
  });
  
  // State for visual notifications of new messages
  const [newMessageNotifications, setNewMessageNotifications] = useState<Set<string>>(new Set());

  // State for message pagination in conversation - NO ARTIFICIAL LIMITATIONS
  const [displayedMessages, setDisplayedMessages] = useState<WhatsAppMessage[]>([]);
  const [messagePage, setMessagePage] = useState(1);
  const MESSAGES_PER_PAGE = 30; // Load 30 messages at a time for performance
  const [scrollPosition, setScrollPosition] = useState(0);
  const [shouldPreserveScroll, setShouldPreserveScroll] = useState(false);

  // Debug only on first render
  useEffect(() => {
    console.log(`🔍 SharedWhatsAppView [${instanceId}] - Profile Info:`, {
      effectiveProfileId,
      profileName,
      urlProfileId,
      profileId,
      isShared
    });
    return () => {
      // Cleanup on unmount
    };
  }, [profileId, profileName, effectiveProfileId, urlProfileId, isShared, instanceId]);

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [messageText]);

  const {
    chats,
    filteredChats,
    selectedChat,
    messages,
    searchTerm,
    activeFilter,
    loading,
    error,
    profileStatus,
    currentProfileId,
    lastUpdate,
    lastSyncTime,
    animationState,
    isTyping: chatIsTyping,
    updateFilters,
    selectChat,
    sendMessage,
    loadMoreChats,
    hasMoreChats,
    reconnectProfile,
    chatSync
  } = useWhatsAppChatOptimized(effectiveProfileId || '');

  // Hook de sincronização ULTRA OTIMIZADO para velocidade máxima
  const { forceSync, invalidateCache, isConnected } = useWhatsAppSync({
    profileId: effectiveProfileId || '',
    selectedChatId: selectedChat?.id,
    onNewMessage: (message) => {
      // Log apenas raramente para não impactar performance
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log('⚡ SharedWhatsAppView: ULTRA-FAST message received:', message.text?.substring(0, 20));
      }
      // A mensagem será processada automaticamente pelo hook useWhatsAppChatOptimized
    },
    onChatUpdate: (chat) => {
      // Log apenas raramente para não impactar performance
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log('⚡ SharedWhatsAppView: Chat updated:', chat.contact.name);
      }
    },
    onTypingUpdate: (chatId, isTyping) => {
      // Log apenas raramente para não impactar performance
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log('⌨️ SharedWhatsAppView: Typing update:', chatId, isTyping);
      }
    },
    onStatusUpdate: (messageId, status) => {
      // Log apenas raramente para não impactar performance
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log('📊 SharedWhatsAppView: Status update:', messageId, status);
      }
    },
    syncInterval: 500 // Sincronização a cada 500ms para máxima velocidade
  });

  // Hook de verificação de sincronização
  const syncVerification = useSyncVerification({
    profileId: effectiveProfileId || '',
    chatId: selectedChat?.id || '',
    messages: messages,
    checkInterval: 5000, // Verificar a cada 5 segundos para correção mais rápida
    autoSync: true, // Sincronizar automaticamente quando detectar problemas
    onSyncNeeded: (reason) => {
      console.log('⚠️ SharedWhatsAppView: Sincronização necessária:', reason);
      showNotificationToast(`Corrigindo sincronização: ${reason}`, 'warning');
    },
    onSyncCompleted: () => {
      console.log('✅ SharedWhatsAppView: Sincronização completada');
      showNotificationToast('Mensagens sincronizadas automaticamente!', 'success');
    }
  });

  // Scroll automático para a última mensagem quando mensagens mudarem
  // Mas apenas quando for uma nova mensagem, não quando carregar mensagens antigas
  const previousMessagesLength = useRef<number>(0);
  const previousDisplayedMessagesLength = useRef<number>(0);
  const lastMessageTimeRef = useRef<Date | null>(null);
  
  useEffect(() => {
    // Só fazer scroll automático se:
    // 1. Não estamos preservando scroll (carregamento de mensagens antigas)
    // 2. O número de mensagens exibidas aumentou
    // 3. A última mensagem é realmente nova (mais recente que a anterior)
    if (messagesEndRef.current && 
        displayedMessages.length > 0 && 
        !shouldPreserveScroll &&
        !chatSync.isLoadingMoreMessages) {
      
      const currentLastMessage = displayedMessages[displayedMessages.length - 1];
      const currentLastMessageTime = currentLastMessage.time instanceof Date ? 
        currentLastMessage.time : new Date(currentLastMessage.time);
      
      // Verificar se é uma mensagem realmente nova
      const isNewMessage = !lastMessageTimeRef.current || 
        currentLastMessageTime > lastMessageTimeRef.current;
      
      // Verificar se o número de mensagens aumentou (não diminuiu por carregamento de antigas)
      const messagesIncreased = displayedMessages.length > previousDisplayedMessagesLength.current;
      
      if (isNewMessage && messagesIncreased) {
        // Scroll suave para a nova mensagem
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
        
        console.log('📜 SharedWhatsAppView: Scroll automático para nova mensagem');
      }
      
      // Atualizar referência da última mensagem
      lastMessageTimeRef.current = currentLastMessageTime;
    }
    
    previousMessagesLength.current = messages.length;
    previousDisplayedMessagesLength.current = displayedMessages.length;
  }, [displayedMessages, shouldPreserveScroll, chatSync.isLoadingMoreMessages]);

  // Atualizar mensagens exibidas quando messages mudar
  useEffect(() => {
    if (messages.length === 0) {
      setDisplayedMessages([]);
      setMessagePage(1);
      return;
    }

    // Mostrar as mensagens mais recentes primeiro (últimas 30, depois 60, 90, etc.)
    const startIndex = Math.max(0, messages.length - (messagePage * MESSAGES_PER_PAGE));
    const endIndex = messages.length;
    const newDisplayedMessages = messages.slice(startIndex, endIndex);
    
    setDisplayedMessages(newDisplayedMessages);
    
    // Verificar se há mais mensagens antigas para carregar
    // Se ainda há mensagens antes do startIndex, então há mais para carregar
    const hasMoreOldMessages = startIndex > 0;
    
    // Também verificar se o chatSync indica que há mais mensagens no servidor
    const hasMoreInServer = chatSync.hasMoreMessages || false;
    
    console.log(`📜 SharedWhatsAppView: ${newDisplayedMessages.length} mensagens exibidas (página ${messagePage})`);
    console.log(`📜 SharedWhatsAppView: Mais mensagens antigas: ${hasMoreOldMessages}, Mais no servidor: ${hasMoreInServer}`);
  }, [messages, messagePage, chatSync.hasMoreMessages]);

  // Função para carregar mais mensagens antigas - SEM LIMITE MÁXIMO
  const handleLoadMoreMessages = useCallback(async () => {
    if (!selectedChat || chatSync.isLoadingMoreMessages || !chatSync.hasMoreMessages) return;

    try {
      setShouldPreserveScroll(true);
      console.log(`📜 SharedWhatsAppView: Loading more messages for chat ${selectedChat.id}`);

      // Carregar mais mensagens usando o hook otimizado
      await chatSync.loadMoreMessages();
      
      console.log(`✅ SharedWhatsAppView: More messages loaded successfully`);
      
    } catch (error) {
      console.error('Erro ao carregar mais mensagens:', error);
    } finally {
      setShouldPreserveScroll(false);
    }
  }, [selectedChat, chatSync]);

  // Preservar posição do scroll após carregar mensagens antigas
  useEffect(() => {
    if (shouldPreserveScroll && messagesEndRef.current) {
      // Aguardar múltiplos frames para garantir que as novas mensagens foram renderizadas
      let frameCount = 0;
      const maxFrames = 3;
      
      const preserveScrollPosition = () => {
        frameCount++;
        
        if (frameCount >= maxFrames) {
          setShouldPreserveScroll(false);
          console.log('📜 SharedWhatsAppView: Posição do scroll preservada após carregar mensagens antigas');
        } else {
          requestAnimationFrame(preserveScrollPosition);
        }
      };
      
      requestAnimationFrame(preserveScrollPosition);
    }
  }, [displayedMessages, shouldPreserveScroll]);

  // Função para lidar com scroll da lista de chats
  const handleChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom && hasMoreChats && !loading) {
      loadMoreChats();
    }
  };

  // Função para lidar com scroll das mensagens
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    setScrollPosition(scrollTop);
    
    // Carregar mais mensagens antigas quando chegar ao topo
    if (scrollTop < 100 && chatSync.hasMoreMessages && !chatSync.isLoadingMoreMessages) {
      handleLoadMoreMessages();
    }
  };

  // Resetar paginação de mensagens quando conversa mudar
  useEffect(() => {
    setMessagePage(1);
    setShouldPreserveScroll(false);
    // Resetar referência da última mensagem para o novo chat
    lastMessageTimeRef.current = null;
    console.log('🔄 SharedWhatsAppView: Conversa selecionada, resetando paginação de mensagens');
  }, [selectedChat?.id]);

  // Função para mostrar notificação visual de nova mensagem
  const showNewMessageNotification = useCallback((chatId: string) => {
    setNewMessageNotifications(prev => new Set([...prev, chatId]));
    
    // Remover notificação após 1 segundo (mais rápido e sutil)
    setTimeout(() => {
      setNewMessageNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(chatId);
        return newSet;
      });
    }, 1000); // REDUZIDO PARA 1 SEGUNDO - MAIS SUTIL
  }, []);

  // Monitorar mudanças nas mensagens e atualizar preview do chat
  useEffect(() => {
    if (messages.length > 0 && selectedChat) {
      const lastMessage = messages[messages.length - 1];
      console.log('🔄 SharedWhatsAppView: Messages changed, updating chat preview:', {
        chatId: selectedChat.id,
        lastMessage: lastMessage.text,
        isSent: lastMessage.isSent,
        time: lastMessage.time
      });
      
      // Atualizar preview do chat na lista
      if (chatSync.updateChatPreview) {
        chatSync.updateChatPreview(selectedChat.id, lastMessage);
      }
      
      // Mostrar notificação visual se for uma mensagem nova (não enviada por nós)
      if (!lastMessage.isSent) {
        showNewMessageNotification(selectedChat.id);
      }
    }
  }, [messages, selectedChat?.id]);

  // Forçar sincronização quando chat for selecionado
  useEffect(() => {
    if (selectedChat && chatSync.syncIncremental) {
      console.log('🔄 SharedWhatsAppView: Chat selected, forcing sync:', selectedChat.id);
      // Pequeno delay para garantir que o chat foi carregado
      setTimeout(() => {
        chatSync.syncIncremental();
      }, 100);
    }
  }, [selectedChat?.id]);

  // Forçar carregamento de mensagens quando chat for selecionado
  useEffect(() => {
    if (selectedChat && chatSync.loadMessages) {
      console.log('🔄 SharedWhatsAppView: Chat selected, loading messages:', selectedChat.id);
      chatSync.loadMessages(selectedChat.id);
    }
  }, [selectedChat?.id]);

  // Listener para mensagens de todos os chats (não apenas o selecionado)
  useEffect(() => {
    const handleGlobalMessageUpdate = (event: CustomEvent) => {
      const { chatId, message } = event.detail;
      
      console.log('🌍 SharedWhatsAppView: Global message update received for chat:', chatId, 'Message:', message?.text?.substring(0, 30));
      
      if (message && message.text && chatId) {
        // Atualizar preview do chat na lista
        if (chatSync.updateChatPreview) {
          chatSync.updateChatPreview(chatId, message);
        }
        
        // Mostrar notificação visual se for uma mensagem nova (não enviada por nós)
        if (!message.isSent) {
          showNewMessageNotification(chatId);
        }
      }
    };

    // Adicionar listener para evento global de mensagens
    window.addEventListener('globalMessageUpdate', handleGlobalMessageUpdate as EventListener);

    return () => {
      window.removeEventListener('globalMessageUpdate', handleGlobalMessageUpdate as EventListener);
    };
  }, []); // Removidas todas as dependências para evitar re-criação do listener

  // Funções básicas para demonstração
  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat) {
      sendMessage(messageText);
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    if (selectedChat) {
      // Implementar setTypingStatus se necessário
    }
  };

  // Função para mostrar notificações toast
  const showNotificationToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    // Implementar sistema de notificações toast se necessário
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  // Função para lidar com clique nas opções da mensagem
  const handleMessageOptionsClick = (event: React.MouseEvent, message: WhatsAppMessage) => {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    // Determinar posição do menu
    let menuPosition: 'above' | 'below' | 'centered' | 'header-dropdown' = 'above';
    
    setMessageMenuState({
      isOpen: true,
      position: { x, y },
      messageId: message.id,
      message,
      menuPosition
    });
  };

  // Função para fechar menu de opções
  const closeMessageMenu = () => {
    setMessageMenuState(prev => ({ ...prev, isOpen: false }));
  };

  // Funções do menu de opções
  const handleMessageReaction = (reaction: string) => {
    console.log('Reaction:', reaction, 'on message:', messageMenuState.messageId);
    closeMessageMenu();
  };

  const handleMessageReply = () => {
    console.log('Reply to message:', messageMenuState.messageId);
    closeMessageMenu();
  };

  const handleMessageForward = () => {
    console.log('Forward message:', messageMenuState.messageId);
    closeMessageMenu();
  };

  const handleMessageCopy = () => {
    if (messageMenuState.message) {
      navigator.clipboard.writeText(messageMenuState.message.text);
      showNotificationToast('Mensagem copiada!', 'success');
    }
    closeMessageMenu();
  };

  const handleMessageDelete = () => {
    console.log('Delete message:', messageMenuState.messageId);
    closeMessageMenu();
  };

  // Função para lidar com redimensionamento da janela
  useEffect(() => {
    const handleResize = () => {
      // Ajustar posição do menu se necessário
      if (messageMenuState.isOpen) {
        closeMessageMenu();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [messageMenuState.isOpen]);

  // Funções de formatação
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <i className="fas fa-check text-xs text-gray-400"></i>;
      case 'delivered': return <i className="fas fa-check-double text-xs text-gray-400"></i>;
      case 'read': return <i className="fas fa-check-double text-xs text-blue-500"></i>;
      default: return <i className="fas fa-clock text-xs text-gray-400"></i>;
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <i className="fas fa-image text-blue-500"></i>;
      case 'video': return <i className="fas fa-video text-purple-500"></i>;
      case 'audio': return <i className="fas fa-microphone text-green-500"></i>;
      case 'document': return <i className="fas fa-file text-orange-500"></i>;
      default: return null;
    }
  };

  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return dateObj.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else {
      return dateObj.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
  };

  const formatLastSeen = (date: Date | string | null | undefined) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInMinutes = (now.getTime() - dateObj.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'agora mesmo';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return dateObj.toLocaleDateString('pt-BR');
  };

  const formatChatTimestamp = (date: Date | string | null | undefined) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes < 1 ? 'agora' : `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 48) {
      return 'ontem';
    } else {
      return dateObj.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const formatDateSeparator = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const messageDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    
    let text = '';
    let className = 'date-separator-other';
    
    if (messageDate.getTime() === today.getTime()) {
      text = 'Hoje';
      className = 'date-separator-today';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      text = 'Ontem';
      className = 'date-separator-yesterday';
    } else {
      const diffInDays = Math.floor((today.getTime() - messageDate.getTime()) / (24 * 60 * 60 * 1000));
      if (diffInDays < 7) {
        text = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      } else {
        text = dateObj.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: 'long',
          year: 'numeric'
        });
      }
    }
    
    return { text, className };
  };

  const groupMessagesByDate = (messages: WhatsAppMessage[]) => {
    const groups: { date: Date; messages: WhatsAppMessage[] }[] = [];
    
    messages.forEach(message => {
      const messageDate = new Date(message.time);
      const dateKey = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
      
      let group = groups.find(g => 
        g.date.getTime() === dateKey.getTime()
      );
      
      if (!group) {
        group = { date: dateKey, messages: [] };
        groups.push(group);
      }
      
      group.messages.push(message);
    });
    
    return groups.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  // Renderizar loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#f0f2f5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25D366]"></div>
        <span className="ml-3 text-gray-600">Loading conversations...</span>
      </div>
    );
  }

  // Renderizar erro
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f0f2f5]">
        <div className="text-red-500 text-6xl mb-4">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Nenhum perfil online foi detectado</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => reconnectProfile()}
          className="px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors"
        >
          <i className="fas fa-redo mr-2"></i>
          Reconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-full bg-[#f0f2f5] w-full">
      {/* Navbar - Lista de conversas */}
      <div className="w-full max-w-[350px] min-w-[280px] border-r border-gray-200 bg-white flex flex-col h-full">
        <div className="p-3 bg-[#f0f2f5] border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={(e) => updateFilters({ searchTerm: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-[#25D366] text-sm"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>
          {/* Indicador de conversas carregadas */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            {filteredChats.length} conversas
            {hasMoreChats && (
              <span className="ml-1 text-[#25D366]">
                • Deslize para carregar mais
              </span>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto" onScroll={handleChatScroll}>
          {filteredChats.map((chat, index) => (
            <div
              key={chat.id}
              onClick={() => selectChat(chat)}
              className={`p-3 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-[#f5f6f6] ${
                selectedChat?.id === chat.id ? 'bg-[#f0f2f5]' : ''
              } ${
                newMessageNotifications.has(chat.id) ? 'bg-green-50' : ''
              }`}
              style={{
                animationDelay: `${index * 10}ms`,
                animationName: 'fadeInUp',
                animationDuration: '0.3s',
                animationTimingFunction: 'ease-out',
                animationFillMode: 'forwards'
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {chat.contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium truncate text-sm ${
                      newMessageNotifications.has(chat.id) ? 'text-green-700 font-semibold' : 'text-gray-900'
                    }`}>
                      {chat.contact.name}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatChatTimestamp(chat.contact.lastTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-sm truncate flex-1 ${
                      newMessageNotifications.has(chat.id) ? 'text-green-600 font-medium' : 'text-gray-600'
                    }`}>
                      {chat.contact.lastMessage ? (
                        <span className="flex items-center">
                          {chat.contact.status === 'sent' && (
                            <i className="fas fa-check text-xs mr-1 text-[#25D366]"></i>
                          )}
                          {chat.contact.lastMessage}
                        </span>
                      ) : 'No message'}
                    </p>
                    <div className="flex items-center space-x-1 ml-2">
                      {chat.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-[#25D366] text-white text-xs rounded-full font-medium">
                          {chat.unreadCount}
                        </span>
                      )}
                      {chat.contact.lastMessage && !chat.unreadCount && chat.contact.status === 'sent' && (
                        <i className="fas fa-check-double text-xs text-gray-400"></i>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Indicador de carregamento de mais conversas */}
          {loading && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#25D366]"></div>
              <span className="ml-2 text-sm text-gray-500">Carregando conversas...</span>
            </div>
          )}
          
          {/* Botão para carregar mais conversas do servidor */}
          {!loading && hasMoreChats && (
            <div className="flex justify-center py-3 border-t border-gray-100">
              <button
                onClick={loadMoreChats}
                disabled={loading}
                className="px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <i className="fas fa-chevron-down mr-2"></i>
                {loading ? 'Carregando...' : 'Carregar mais conversas'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Chat aberto - lado direito */}
      <div className="flex-1 flex flex-col bg-[#efeae2] h-full min-w-0">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-[#008069] text-white px-6 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedChat.contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{selectedChat.contact.name}</h2>
                    <p className="text-sm text-white text-opacity-80">
                      {selectedChat.contact.isGroup ? 'Group' : 'Contact'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Indicador de sincronização */}
                  <SyncIndicator
                    isChecking={syncVerification.isChecking}
                    needsSync={syncVerification.needsSync}
                    syncReason={syncVerification.syncReason}
                    lastCheckTime={syncVerification.lastCheckTime}
                    onManualSync={syncVerification.manualSync}
                    onForceCheck={syncVerification.forceCheck}
                    className="text-white"
                  />
                  
                  <button className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                    <i className="fas fa-search"></i>
                  </button>
                  <button className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                    <i className="fas fa-ellipsis-v"></i>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Mensagens (área com scroll) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] min-h-0" onScroll={handleScroll}>
              {/* Indicador de carregamento de mensagens antigas */}
              {chatSync.isLoadingMoreMessages && (
                <div className="flex justify-center py-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 bg-white bg-opacity-70 rounded-lg px-4 py-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#25D366]"></div>
                    <span>Carregando mensagens antigas...</span>
                  </div>
                </div>
              )}

              {/* Botão manual para carregar mais mensagens */}
              {chatSync.hasMoreMessages && !chatSync.isLoadingMoreMessages && displayedMessages.length > 0 && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={handleLoadMoreMessages}
                    className="px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors text-sm flex items-center space-x-2"
                  >
                    <i className="fas fa-chevron-up"></i>
                    <span>Carregar mais mensagens antigas</span>
                  </button>
                </div>
              )}
              
              {/* Indicador de mensagens carregadas */}
              {displayedMessages.length > 0 && (
                <div className="text-center py-2 text-xs text-gray-400 bg-white bg-opacity-50 rounded-lg mx-4">
                  <div className="flex items-center justify-center space-x-2">
                    <span>📜 {displayedMessages.length} mensagens exibidas</span>
                    <span className="text-gray-500">(página {messagePage})</span>
                    {chatSync.hasMoreMessages && (
                      <span className="text-[#25D366] font-medium">
                        • Deslize para cima para carregar mais antigas
                      </span>
                    )}
                    {!chatSync.hasMoreMessages && displayedMessages.length > 0 && (
                      <span className="text-green-600 font-medium">
                        ✓ Início da conversa alcançado
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Indicador de início da conversa */}
              {!chatSync.hasMoreMessages && displayedMessages.length > 0 && (
                <div className="text-center py-4 text-xs text-gray-500 bg-white bg-opacity-30 rounded-lg mx-4 border border-gray-200">
                  <div className="flex items-center justify-center space-x-2">
                    <i className="fas fa-flag-checkered text-green-600"></i>
                    <span className="font-medium">Início da conversa</span>
                    <span>• Esta é a primeira mensagem trocada</span>
                  </div>
                </div>
              )}
              
              {/* Renderizar mensagens agrupadas por data */}
              {(() => {
                const messageGroups = groupMessagesByDate(displayedMessages);
                let globalIndex = 0;
                
                                 return messageGroups.map((group, groupIndex) => (
                   <div key={group.date.toISOString()}>
                    {/* Separador de data */}
                    {(() => {
                      const dateInfo = formatDateSeparator(group.date);
                      return (
                        <div className="flex justify-center my-6 date-separator">
                          <div className={`date-separator-badge date-separator-animation px-6 py-2 rounded-full text-sm font-medium shadow-md bg-white border border-gray-200 ${dateInfo.className}`}>
                            {dateInfo.text}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Mensagens do grupo */}
                    {group.messages.map((message, messageIndex) => {
                      globalIndex++;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${message.isSent ? 'justify-end' : 'justify-start'} group mb-2`}
                          style={{
                            animationDelay: `${globalIndex * 5}ms`,
                            animationName: 'fadeInUp',
                            animationDuration: '0.3s',
                            animationTimingFunction: 'ease-out',
                            animationFillMode: 'forwards'
                          }}
                        >
                          <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl shadow-md relative ${
                            message.isSent
                              ? 'bg-[#dcf8c6] text-gray-800 border border-[#b8e6b8]' 
                              : 'bg-white text-gray-800 border border-gray-100'
                          } hover:shadow-lg transition-all duration-200`}>
                            <div className="flex items-start space-x-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm leading-relaxed break-words">{message.text}</p>
                                <div className="flex items-center justify-end mt-2 space-x-2">
                                  <span className="text-xs text-gray-500 font-medium">
                                    {formatTime(message.time)}
                                  </span>
                                  {message.isSent && (
                                    <MessageStatusIndicator status={message.status} isSent={message.isSent} />
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleMessageOptionsClick(e, message)}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-black hover:bg-opacity-10 rounded-full transition-all duration-200 flex-shrink-0"
                              >
                                <i className="fas fa-ellipsis-v text-xs"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
              {chatIsTyping && (
                <div className="flex justify-start mb-2">
                  <div className="bg-white px-4 py-3 rounded-2xl shadow-md border border-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">typing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Barra de mensagem fixa igual WhatsApp */}
            <div className="bg-[#f0f2f5] border-t border-gray-200 px-4 py-3 flex items-center gap-2 sticky bottom-0 z-10">
              <button className="text-gray-500 hover:text-[#25D366] text-xl p-2 rounded-full transition-colors" title="Emoji">
                <i className="far fa-smile"></i>
              </button>
              <button className="text-gray-500 hover:text-[#25D366] text-xl p-2 rounded-full transition-colors" title="Anexar arquivo">
                <i className="fas fa-paperclip"></i>
              </button>
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={handleTyping}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message"
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-[#25D366] transition-all duration-200 text-sm"
                  rows={1}
                  maxLength={1000}
                  style={{ minHeight: '38px', maxHeight: '90px' }}
                />
              </div>
              <button className="text-gray-500 hover:text-[#25D366] text-xl p-2 rounded-full transition-colors" title="Gravar áudio">
                <i className="fas fa-microphone"></i>
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="bg-[#25D366] text-white rounded-full p-3 ml-1 flex items-center justify-center text-xl disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
                title="Send message"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">
                <i className="fab fa-whatsapp"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a contact to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Message Options Menu */}
      {messageMenuState.isOpen && (
        <MessageOptionsMenu
          isOpen={messageMenuState.isOpen}
          position={messageMenuState.position}
          menuPosition={messageMenuState.menuPosition}
          messageId={messageMenuState.messageId}
          isSent={messageMenuState.message?.isSent || false}
          onClose={closeMessageMenu}
          onReact={handleMessageReaction}
          onReply={handleMessageReply}
          onForward={handleMessageForward}
          onCopy={handleMessageCopy}
          onDelete={handleMessageDelete}
        />
      )}
    </div>
  );
} 