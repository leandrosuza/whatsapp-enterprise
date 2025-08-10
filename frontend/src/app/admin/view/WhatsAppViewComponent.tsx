'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '../../../contexts/AppContext';
import { useWhatsAppChatOptimized } from '../../../shared/hooks/useWhatsAppChatOptimized';
import { useWhatsAppSync } from '../../../shared/hooks/useWhatsAppSync';
import { useSyncVerification } from '../../../shared/hooks/useSyncVerification';
import { WhatsAppChat, WhatsAppMessage } from '../../../shared/types/whatsapp';
import { whatsappSync } from '../../../shared/services/whatsappSync';

import ProfileStatusIndicator from '../../../shared/components/ProfileStatusIndicator';
import MessageStatusIndicator from '../../../shared/components/MessageStatusIndicator';
import MessageOptionsMenu from '../../../shared/components/MessageOptionsMenu';
import SyncIndicator from '../../../shared/components/SyncIndicator';
import './view.css';

interface WhatsAppViewProps {
  profileId?: string;
  profileName?: string;
  contactNumber?: string;
  isShared?: boolean;
}

export default function WhatsAppViewComponent({ profileId, profileName = 'WhatsApp Profile', contactNumber, isShared = false }: WhatsAppViewProps) {
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
    setPreservedState
  } = useApp();
  const searchParams = useSearchParams();
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Obter parâmetros da URL (para compatibilidade)
  const urlProfileId = searchParams.get('profileId');
  const urlContactNumber = searchParams.get('contactNumber');
  const isStandalone = searchParams.get('standalone') === 'true';
  
  // Usar profileId da URL se disponível, senão usar o prop
  const effectiveProfileId = urlProfileId || profileId || '10';
  // Usar contactNumber do prop se disponível, senão da URL
  const effectiveContactNumber = contactNumber || urlContactNumber;
  
  // Estado para o menu de opções das mensagens
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
  
  // Estado para notificações visuais de novas mensagens
  const [newMessageNotifications, setNewMessageNotifications] = useState<Set<string>>(new Set());

  // Estado para paginação de mensagens na conversa
  // SEM LIMITAÇÕES ARTIFICIAIS - Suporta conversas com dezenas de milhares de mensagens
  const [displayedMessages, setDisplayedMessages] = useState<WhatsAppMessage[]>([]);
  const [messagePage, setMessagePage] = useState(1);
  const MESSAGES_PER_PAGE = 30; // Carregar 30 mensagens por vez para performance
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [shouldPreserveScroll, setShouldPreserveScroll] = useState(false);

  // Debug apenas na primeira renderização
  useEffect(() => {
    console.log('🔍 WhatsAppView - Profile Info:', {
      effectiveProfileId,
      profileName,
      urlProfileId,
      profileId
    });
    return () => {
      // Cleanup on unmount
    };
  }, [profileId, profileName, effectiveProfileId, urlProfileId]);

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [messageText]);

  // Controlar auto-scroll baseado na posição do scroll
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px de tolerância
      
      // Atualizar auto-scroll baseado na posição
      setShouldPreserveScroll(!isAtBottom);
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    
    return () => {
      messagesContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const {
    chats,
    filteredChats,
    selectedChat,
    messages,
    loading,
    error,
    currentProfileId,
    profileStatus,
    searchTerm,
    activeFilter,
    animationState, // Estado de animação
    sendMessage,
    selectChat,
    loadChats,
    loadMoreChats, // Nova função para carregar mais chats
    updateFilters,
    reconnectProfile,
    hasMoreChats, // Estado de paginação
    chatSync
  } = useWhatsAppChatOptimized(effectiveProfileId);

  // Auto-scroll para baixo quando necessário
  useEffect(() => {
    if (messagesEndRef.current && !shouldPreserveScroll) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, shouldPreserveScroll]);
  
  // Hook de sincronização global para máxima velocidade
  const { forceSync, invalidateCache, isConnected } = useWhatsAppSync({
    profileId: effectiveProfileId,
    selectedChatId: selectedChat?.id,
    onNewMessage: (message) => {
      console.log('🔄 WhatsAppView: Nova mensagem recebida via sync:', message.text?.substring(0, 30));
      // A mensagem será processada automaticamente pelo hook useWhatsAppChatOptimized
    },
    onChatUpdate: (chat) => {
      console.log('🔄 WhatsAppView: Chat atualizado via sync:', chat.contact.name);
    },
    onTypingUpdate: (chatId, isTyping) => {
      console.log('⌨️ WhatsAppView: Typing update:', chatId, isTyping);
    },
    onStatusUpdate: (messageId, status) => {
      console.log('📊 WhatsAppView: Status update:', messageId, status);
    },
    syncInterval: 1000 // Sincronização a cada 1 segundo
  });

  // Hook de verificação de sincronização
  const syncVerification = useSyncVerification({
    profileId: effectiveProfileId,
    chatId: selectedChat?.id || '',
    messages: messages,
    checkInterval: 5000, // Verificar a cada 5 segundos para correção mais rápida
    autoSync: true, // Sincronizar automaticamente quando detectar problemas
    onSyncNeeded: (reason) => {
      console.log('⚠️ WhatsAppView: Sincronização necessária:', reason);
      showNotificationToast(`Corrigindo sincronização: ${reason}`, 'warning');
    },
    onSyncCompleted: () => {
      console.log('✅ WhatsAppView: Sincronização completada');
      showNotificationToast('Mensagens sincronizadas automaticamente!', 'success');
    }
  });

  // Estado para paginação de conversas
  const [displayedChats, setDisplayedChats] = useState<WhatsAppChat[]>([]);
  const [chatPage, setChatPage] = useState(1);
  const CHATS_PER_PAGE = 30; // Máximo 30 conversas por vez, igual WhatsApp

  // Atualizar conversas exibidas quando filteredChats mudar
  useEffect(() => {
    const startIndex = 0;
    const endIndex = chatPage * CHATS_PER_PAGE;
    setDisplayedChats(filteredChats.slice(startIndex, endIndex));
  }, [filteredChats, chatPage]);

  // Resetar paginação quando o filtro de busca mudar
  useEffect(() => {
    setChatPage(1);
  }, [searchTerm]);

  // Resetar paginação de mensagens quando conversa mudar
  useEffect(() => {
    setMessagePage(1);
    setShouldPreserveScroll(false);
    // Resetar referência da última mensagem para o novo chat
    lastMessageTimeRef.current = null;
    console.log('🔄 Conversa selecionada, resetando paginação de mensagens');
  }, [selectedChat?.id]);

  // Função para carregar mais conversas da navbar
  const loadMoreDisplayedChats = useCallback(() => {
    if (displayedChats.length < filteredChats.length) {
      setChatPage(prev => prev + 1);
    }
  }, [displayedChats.length, filteredChats.length]);

  // Detecção de scroll para carregar mais conversas na navbar
  const chatListRef = useRef<HTMLDivElement>(null);
  const chatScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const container = chatListRef.current;
    if (!container) return;

    const handleChatScroll = () => {
      // Debounce para evitar múltiplas chamadas
      if (chatScrollTimeoutRef.current) {
        clearTimeout(chatScrollTimeoutRef.current);
      }
      
      chatScrollTimeoutRef.current = setTimeout(() => {
        // Se o usuário está próximo do final (últimos 100px), carregar mais conversas
        const scrollPosition = container.scrollTop + container.clientHeight;
        const scrollHeight = container.scrollHeight;
        
        if (scrollHeight - scrollPosition < 100 && displayedChats.length < filteredChats.length) {
          console.log('📜 Scroll detectado próximo ao final da lista de conversas, carregando mais...');
          loadMoreDisplayedChats();
        }
      }, 300); // Debounce de 300ms
    };

    container.addEventListener('scroll', handleChatScroll);
    return () => {
      container.removeEventListener('scroll', handleChatScroll);
      if (chatScrollTimeoutRef.current) {
        clearTimeout(chatScrollTimeoutRef.current);
      }
    };
  }, [displayedChats.length, filteredChats.length, loadMoreDisplayedChats]);
  
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
        !isLoadingMoreMessages) {
      
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
        
        console.log('📜 Scroll automático para nova mensagem');
      }
      
      // Atualizar referência da última mensagem
      lastMessageTimeRef.current = currentLastMessageTime;
    }
    
    previousMessagesLength.current = messages.length;
    previousDisplayedMessagesLength.current = displayedMessages.length;
  }, [displayedMessages, shouldPreserveScroll, isLoadingMoreMessages]);

  // Atualizar mensagens exibidas quando messages mudar
  useEffect(() => {
    if (messages.length === 0) {
      setDisplayedMessages([]);
      setMessagePage(1);
      setHasMoreMessages(true);
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
    
    setHasMoreMessages(hasMoreOldMessages || hasMoreInServer);
    
    console.log(`📜 Mensagens: ${newDisplayedMessages.length} carregadas (página ${messagePage})`);
    console.log(`📜 Mais mensagens antigas: ${hasMoreOldMessages}, Mais no servidor: ${hasMoreInServer}`);
  }, [messages, messagePage, chatSync.hasMoreMessages]);

  // Função para carregar mais mensagens antigas - SEM LIMITE MÁXIMO
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMoreMessages || !hasMoreMessages || !selectedChat) return;

    console.log('📜 WhatsAppView: Iniciando carregamento de mensagens antigas...');
    
    // Marcar que estamos carregando mensagens antigas para evitar scroll automático
    setIsLoadingMoreMessages(true);
    setShouldPreserveScroll(true);
    
    // Salvar a posição atual do scroll antes de carregar
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const currentScrollTop = container.scrollTop;
      const currentScrollHeight = container.scrollHeight;
      
      console.log('📜 Posição do scroll antes do carregamento:', {
        scrollTop: currentScrollTop,
        scrollHeight: currentScrollHeight
      });
    }

    try {
      // Carregar mais mensagens do histórico do servidor usando o hook otimizado
      if (chatSync.loadMoreMessages) {
        await chatSync.loadMoreMessages();
        console.log('📜 WhatsAppView: Carregadas mais mensagens antigas do servidor');
      }
      
      // Incrementar página para mostrar mais mensagens antigas
      setMessagePage(prev => prev + 1);
      
      console.log('📜 WhatsAppView: Carregadas mais mensagens antigas - página:', messagePage + 1);
      
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens antigas:', error);
    } finally {
      // Aguardar um pouco antes de marcar como não carregando para garantir que o DOM foi atualizado
      setTimeout(() => {
        setIsLoadingMoreMessages(false);
      }, 100);
    }
  }, [isLoadingMoreMessages, hasMoreMessages, selectedChat, chatSync, messagePage]);

  // Detecção de scroll para carregar mais mensagens
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Debounce para evitar múltiplas chamadas
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        // Salvar posição atual do scroll
        setScrollPosition(container.scrollTop);
        
        // Se o usuário está próximo do topo (primeiros 100px), carregar mais mensagens
        if (container.scrollTop < 100 && hasMoreMessages && !isLoadingMoreMessages) {
          console.log('📜 Scroll detectado próximo ao topo, carregando mais mensagens antigas...');
          loadMoreMessages();
        }
      }, 300); // Debounce de 300ms
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [hasMoreMessages, isLoadingMoreMessages, loadMoreMessages]);

  // Preservar posição do scroll após carregar mensagens antigas
  useEffect(() => {
    if (shouldPreserveScroll && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      
      // Aguardar múltiplos frames para garantir que as novas mensagens foram renderizadas
      let frameCount = 0;
      const maxFrames = 3;
      
      const preserveScrollPosition = () => {
        frameCount++;
        
        if (frameCount >= maxFrames) {
          const newScrollHeight = container.scrollHeight;
          const oldScrollHeight = newScrollHeight - (MESSAGES_PER_PAGE * 80); // Estimativa mais precisa
          
          // Calcular nova posição para manter o conteúdo visível
          const scrollDifference = newScrollHeight - oldScrollHeight;
          container.scrollTop = scrollDifference;
          
          setShouldPreserveScroll(false);
          console.log('📜 Posição do scroll preservada após carregar mensagens antigas');
        } else {
          requestAnimationFrame(preserveScrollPosition);
        }
      };
      
      requestAnimationFrame(preserveScrollPosition);
    }
  }, [displayedMessages, shouldPreserveScroll]);

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
      console.log('🔄 Messages changed, updating chat preview:', {
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
  }, [messages, selectedChat?.id]); // Removido chatSync e showNewMessageNotification das dependências

  // Forçar sincronização quando chat for selecionado
  useEffect(() => {
    if (selectedChat && chatSync.syncIncremental) {
      console.log('🔄 Chat selected, forcing sync:', selectedChat.id);
      // Pequeno delay para garantir que o chat foi carregado
      setTimeout(() => {
        chatSync.syncIncremental();
      }, 100);
    }
  }, [selectedChat?.id]); // Removido chatSync das dependências

  // Forçar carregamento de mensagens quando chat for selecionado
  useEffect(() => {
    if (selectedChat && chatSync.loadMessages) {
      console.log('🔄 Chat selected, loading messages:', selectedChat.id);
      chatSync.loadMessages(selectedChat.id);
    }
  }, [selectedChat?.id]); // Removido chatSync das dependências

  // REMOVIDO: useEffect duplicado que estava causando loop infinito
  // useEffect(() => {
  //   if (selectedChat && messages.length > 0) {
  //     const lastMessage = messages[messages.length - 1];
  //     console.log('🔄 Forcing preview update for chat:', selectedChat.id, 'with message:', lastMessage.text);
  //     
  //     if (chatSync.updateChatPreview) {
  //       chatSync.updateChatPreview(selectedChat.id, lastMessage);
  //     }
  //   }
  // }, [messages, selectedChat, chatSync]);

  // Listener para mensagens de todos os chats (não apenas o selecionado)
  useEffect(() => {
    const handleGlobalMessageUpdate = (event: CustomEvent) => {
      const { chatId, message } = event.detail;
      
      console.log('🌍 Global message update received for chat:', chatId, 'Message:', message?.text?.substring(0, 30));
      
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

  // Debug: Log do profileId sendo usado
  console.log('🔍 WhatsAppView - Profile Info:', {
    effectiveProfileId,
    currentProfileId,
    profileName,
    contactNumber: effectiveContactNumber
  });

  // Debug: Log das mensagens para identificar problemas
  console.log('📨 WhatsAppView - Messages Debug:', {
    messagesCount: messages.length,
    selectedChatId: selectedChat?.id,
    selectedChatName: selectedChat?.contact?.name,
    lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
    isTyping
  });

  // Debug: Log dos chats para identificar problemas de preview (reduzido)
  if (selectedChat) {
    console.log('💬 Selected Chat Preview:', {
      id: selectedChat.id,
      name: selectedChat.contact.name,
      lastMessage: selectedChat.contact.lastMessage,
      lastTime: selectedChat.contact.lastTime,
      unreadCount: selectedChat.unreadCount
    });
  }

  // Função para mostrar notificações toast
  const showNotificationToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    // Implementar sistema de notificação toast aqui
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  // Função para enviar mensagem
  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;

    const messageToSend = messageText.trim();
    setMessageText('');
    setIsTyping(false);

    // Criar mensagem temporária para preview imediata
    const tempMessage: WhatsAppMessage = {
      id: `temp-${Date.now()}`,
      chatId: selectedChat.id,
      text: messageToSend,
      time: new Date(),
      isSent: true,
      status: 'pending',
      type: 'text'
    };

    // Atualizar preview do chat na lista imediatamente
    if (selectedChat) {
      // Atualizar preview do chat na lista
      chatSync.updateChatPreview(selectedChat.id, tempMessage);
    }

    sendMessage(messageToSend)
      .then(() => {
        showNotificationToast('Message sent successfully!', 'success');
      })
      .catch((error) => {
        console.error('Error sending message:', error);
        showNotificationToast('Error sending message', 'error');
        setMessageText(messageToSend); // Restaurar mensagem em caso de erro
      });
  };

  // Função para lidar com tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Função para lidar com clique nas opções de mensagem
  const handleMessageOptionsClick = (event: React.MouseEvent, message: WhatsAppMessage) => {
    event.preventDefault();
    event.stopPropagation();

    // Sempre centralizar o modal na tela
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 280; // Largura estimada do menu
    const menuHeight = 200; // Altura estimada do menu

    // Calcular posição central
    const centerX = (viewportWidth - menuWidth) / 2;
    const centerY = (viewportHeight - menuHeight) / 2;

    setMessageMenuState({
      isOpen: true,
      position: { x: centerX, y: centerY },
      messageId: message.id,
      message,
      menuPosition: 'centered' // Sempre usar posição centralizada
    });
  };

  // Função para fechar menu de opções
  const closeMessageMenu = () => {
    setMessageMenuState(prev => ({ ...prev, isOpen: false }));
  };

  // Funções para ações do menu de mensagem
  const handleMessageReaction = (reaction: string) => {
    console.log('Reação:', reaction, 'para mensagem:', messageMenuState.messageId);
    closeMessageMenu();
  };

  const handleMessageReply = () => {
    console.log('Responder mensagem:', messageMenuState.messageId);
    closeMessageMenu();
  };

  const handleMessageForward = () => {
    console.log('Encaminhar mensagem:', messageMenuState.messageId);
    closeMessageMenu();
  };

  const handleMessageCopy = () => {
    if (messageMenuState.message) {
      navigator.clipboard.writeText(messageMenuState.message.text);
      showNotificationToast('Message copied!', 'success');
    }
    closeMessageMenu();
  };

  const handleMessageDelete = () => {
    console.log('Deletar mensagem:', messageMenuState.messageId);
    showNotificationToast('Message deleted!', 'success');
    closeMessageMenu();
  };

  // Efeito para ajustar altura do textarea
  useEffect(() => {
    const handleResize = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    };

    if (textareaRef.current) {
      textareaRef.current.addEventListener('input', handleResize);
      return () => textareaRef.current?.removeEventListener('input', handleResize);
    }
  }, []);

  // Função para lidar com digitação
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    setIsTyping(e.target.value.length > 0);
    
    // Auto-resize do textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Funções auxiliares para ícones e formatação
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return 'fas fa-check';
      case 'delivered': return 'fas fa-check-double';
      case 'read': return 'fas fa-check-double text-blue-500';
      case 'failed': return 'fas fa-exclamation-triangle text-red-500';
      default: return 'fas fa-clock text-gray-400';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return 'fas fa-image';
      case 'video': return 'fas fa-video';
      case 'audio': return 'fas fa-microphone';
      case 'document': return 'fas fa-file';
      case 'location': return 'fas fa-map-marker-alt';
      case 'contact': return 'fas fa-user';
      default: return 'fas fa-comment';
    }
  };

  // Função para formatar hora
  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return '';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      
      return dateObj.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Error formatting time:', error);
      return '';
    }
  };

  // Função para formatar "última vez visto"
  const formatLastSeen = (date: Date | string | null | undefined) => {
    if (!date) return '';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch (error) {
      console.warn('Error formatting last seen:', error);
      return '';
    }
  };

  // Função para formatar timestamp da lista de conversas
  const formatChatTimestamp = (date: Date | string | null | undefined) => {
    if (!date) return '';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const messageDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      
      // If it's today, show time
      if (messageDate.getTime() === today.getTime()) {
        return dateObj.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // If it's yesterday, show "Ontem"
      if (messageDate.getTime() === yesterday.getTime()) {
        return 'Ontem';
      }
      
      // If it's this week, show day name
      const diffInDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffInDays < 7) {
        return dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
      }
      
      // Check if it's from a different year
      const isDifferentYear = dateObj.getFullYear() !== now.getFullYear();
      
      // Otherwise show date with year if different
      return dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        ...(isDifferentYear && { year: '2-digit' })
      });
    } catch (error) {
      console.warn('Error formatting chat timestamp:', error);
      return '';
    }
  };

  // Função para formatar data para separadores (igual WhatsApp)
  const formatDateSeparator = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return { text: '', className: 'date-separator-invalid' };
      }
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const messageDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      
      if (messageDate.getTime() === today.getTime()) {
        return { text: 'Hoje', className: 'date-separator-today' };
      } else if (messageDate.getTime() === yesterday.getTime()) {
        return { text: 'Ontem', className: 'date-separator-yesterday' };
      } else {
        // Formato: "Segunda-feira, 15 de janeiro"
        const options: Intl.DateTimeFormatOptions = { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        };
        return { 
          text: dateObj.toLocaleDateString('pt-BR', options), 
          className: 'date-separator-other' 
        };
      }
    } catch (error) {
      console.warn('Error formatting date separator:', error);
      return { text: '', className: 'date-separator-invalid' };
    }
  };

  // Função para agrupar mensagens por data
  const groupMessagesByDate = (messages: WhatsAppMessage[]) => {
    const groups: { date: string; messages: WhatsAppMessage[] }[] = [];
    
    messages.forEach((message) => {
      try {
        const messageDate = message.time instanceof Date ? message.time : new Date(message.time);
        
        // Check if the date is valid
        if (isNaN(messageDate.getTime())) {
          console.warn('Invalid message time:', message.time);
          return; // Skip this message
        }
        
        const dateKey = messageDate.toDateString(); // Chave única para cada dia
        
        let group = groups.find(g => {
          const groupDate = new Date(g.date);
          return groupDate.toDateString() === dateKey;
        });
        
        if (!group) {
          group = { date: dateKey, messages: [] };
          groups.push(group);
        }
        
        group.messages.push(message);
      } catch (error) {
        console.warn('Error processing message date:', error);
      }
    });
    
    return groups;
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
            {displayedChats.length} de {filteredChats.length} conversas
            {filteredChats.length > CHATS_PER_PAGE && (
              <span className="ml-1 text-[#25D366]">
                • Deslize para carregar mais
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" ref={chatListRef}>
          {displayedChats.map((chat, index) => (
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
          
          {/* Indicador de carregamento de mais conversas da navbar */}
          {displayedChats.length < filteredChats.length && (
            <div className="flex justify-center py-3 border-t border-gray-100">
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#25D366] mr-2"></div>
                Carregando mais conversas...
              </div>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] min-h-0" ref={messagesContainerRef}>
                          {/* Indicador de carregamento de mensagens antigas */}
            {isLoadingMoreMessages && (
              <div className="flex justify-center py-3">
                <div className="flex items-center space-x-2 text-sm text-gray-500 bg-white bg-opacity-70 rounded-lg px-4 py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#25D366]"></div>
                  <span>Carregando mensagens antigas...</span>
                </div>
              </div>
            )}

            {/* Botão manual para carregar mais mensagens */}
            {hasMoreMessages && !isLoadingMoreMessages && displayedMessages.length > 0 && (
              <div className="flex justify-center py-3">
                <button
                  onClick={loadMoreMessages}
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
                  {messages.length > 1000 && (
                    <span className="text-blue-600 font-medium">
                      • Conversa extensa detectada
                    </span>
                  )}
                  {hasMoreMessages && (
                    <span className="text-[#25D366] font-medium">
                      • Deslize para cima para carregar mais antigas
                    </span>
                  )}
                  {!hasMoreMessages && displayedMessages.length > 0 && (
                    <span className="text-green-600 font-medium">
                      ✓ Início da conversa alcançado
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Indicador de início da conversa */}
            {!hasMoreMessages && displayedMessages.length > 0 && (
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
                            <div key={group.date}>
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
              {isTyping && (
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