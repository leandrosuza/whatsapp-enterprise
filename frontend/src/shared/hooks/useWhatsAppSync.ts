import { useEffect, useRef, useCallback } from 'react';
import { whatsappSync } from '../services/whatsappSync';
import { whatsappEvents } from '../services/whatsappEvents';
import { WhatsAppMessage, WhatsAppChat } from '../types/whatsapp';

interface UseWhatsAppSyncOptions {
  profileId: string;
  selectedChatId?: string;
  onNewMessage?: (message: WhatsAppMessage) => void;
  onChatUpdate?: (chat: WhatsAppChat) => void;
  onTypingUpdate?: (chatId: string, isTyping: boolean) => void;
  onStatusUpdate?: (messageId: string, status: string) => void;
  syncInterval?: number;
}

export const useWhatsAppSync = ({
  profileId,
  selectedChatId,
  onNewMessage,
  onChatUpdate,
  onTypingUpdate,
  onStatusUpdate,
  syncInterval = 1000 // Sincronização a cada 1 segundo por padrão
}: UseWhatsAppSyncOptions) => {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // Função para sincronização incremental ULTRA RÁPIDA
  const syncIncremental = useCallback(async () => {
    if (!profileId || !selectedChatId) return;

    try {
      // Buscar mensagens diretamente (mais rápido que endpoint /sync)
      const messagesData = await whatsappSync.getMessages(profileId, selectedChatId);
      
      if (messagesData && messagesData.length > 0) {
        // Processar apenas mensagens novas
        messagesData.forEach(message => {
          const messageKey = `${message.id}_${message.chatId}_${message.time}`;
          
          if (!processedMessagesRef.current.has(messageKey)) {
            processedMessagesRef.current.add(messageKey);
            
            // Notificar sobre nova mensagem
            if (onNewMessage) {
              onNewMessage(message);
            }
            
            // Disparar evento global para sincronização entre componentes
            whatsappEvents.emitMessageEvent(profileId, message.chatId, message);
          }
        });
      }
      
      lastSyncTimeRef.current = Date.now();
      
    } catch (error) {
      console.error('❌ Error in incremental sync:', error);
    }
  }, [profileId, selectedChatId, onNewMessage]);

  // Setup WebSocket listeners para sincronização instantânea
  useEffect(() => {
    if (!profileId) return;

    // Entrar na sala do WhatsApp
    whatsappSync.joinWhatsAppRoom(profileId);

    // Handler para novas mensagens via WebSocket
    const handleNewMessage = (message: WhatsAppMessage) => {
      console.log('🚀 New message received via WebSocket:', {
        chatId: message.chatId,
        text: message.text?.substring(0, 30),
        isSent: message.isSent,
        time: message.time
      });

      // Normalizar mensagem
      const normalizedMessage: WhatsAppMessage = {
        ...message,
        time: message.time instanceof Date ? message.time : new Date(message.time),
        chatId: message.chatId
      };

      // Verificar se é o chat atual
      const isCurrentChat = selectedChatId && message.chatId === selectedChatId;

      if (isCurrentChat) {
        console.log('🎯 Message is for current chat - processing INSTANTLY');
        
        // Notificar sobre nova mensagem imediatamente
        if (onNewMessage) {
          onNewMessage(normalizedMessage);
        }
      }

      // Disparar eventos globais para sincronização entre componentes
      whatsappEvents.emitMessageEvent(profileId, message.chatId, normalizedMessage);

      console.log('✅ Message processed INSTANTLY for chat:', message.chatId);
    };

    // Handler para status de mensagens
    const handleMessageStatus = (data: { messageId: string; status: string }) => {
      if (onStatusUpdate) {
        onStatusUpdate(data.messageId, data.status);
      }
      // Emitir evento global
      whatsappEvents.emitStatusEvent(profileId, data.messageId, data.status);
    };

    // Handler para indicador de digitação
    const handleTyping = (data: { chatId: string; isTyping: boolean }) => {
      if (onTypingUpdate) {
        onTypingUpdate(data.chatId, data.isTyping);
      }
      // Emitir evento global
      whatsappEvents.emitTypingEvent(profileId, data.chatId, data.isTyping);
    };

    // Handler para atualizações de chat
    const handleChatUpdate = (data: { chat: WhatsAppChat }) => {
      if (onChatUpdate) {
        onChatUpdate(data.chat);
      }
      // Emitir evento global
      whatsappEvents.emitChatUpdateEvent(profileId, data.chat);
    };

    // Inscrever nos eventos
    whatsappSync.subscribe('message', handleNewMessage);
    whatsappSync.subscribe('status', handleMessageStatus);
    whatsappSync.subscribe('state', handleTyping);
    whatsappSync.subscribe('chat_update', handleChatUpdate);

    return () => {
      // Desinscrever dos eventos
      whatsappSync.unsubscribe('message', handleNewMessage);
      whatsappSync.unsubscribe('status', handleMessageStatus);
      whatsappSync.unsubscribe('state', handleTyping);
      whatsappSync.unsubscribe('chat_update', handleChatUpdate);
    };
  }, [profileId, selectedChatId, onNewMessage, onStatusUpdate, onTypingUpdate, onChatUpdate]);

  // Setup sincronização automática
  useEffect(() => {
    if (!profileId || !selectedChatId) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Limpar intervalo anterior se existir
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    // Configurar novo intervalo de sincronização
    syncIntervalRef.current = setInterval(() => {
      syncIncremental();
    }, syncInterval);

    // Limpeza do cache de mensagens processadas a cada 5 minutos
    const cacheCleanupInterval = setInterval(() => {
      processedMessagesRef.current.clear();
      console.log('🧹 WhatsApp sync cache cleared');
    }, 5 * 60 * 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      clearInterval(cacheCleanupInterval);
    };
  }, [profileId, selectedChatId, syncIncremental, syncInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      processedMessagesRef.current.clear();
    };
  }, []);

  // Função para forçar sincronização manual
  const forceSync = useCallback(() => {
    if (profileId && selectedChatId) {
      console.log('🔄 Force sync requested');
      syncIncremental();
    }
  }, [profileId, selectedChatId, syncIncremental]);

  // Função para invalidar cache
  const invalidateCache = useCallback(() => {
    if (profileId) {
      whatsappSync.invalidateChatCache(profileId);
      if (selectedChatId) {
        whatsappSync.invalidateMessageCache(profileId, selectedChatId);
      }
      processedMessagesRef.current.clear();
      console.log('🧹 Cache invalidated');
    }
  }, [profileId, selectedChatId]);

  return {
    forceSync,
    invalidateCache,
    lastSyncTime: lastSyncTimeRef.current,
    isConnected: whatsappSync.isConnected()
  };
}; 