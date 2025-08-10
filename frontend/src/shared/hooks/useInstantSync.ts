import { useEffect, useRef, useCallback } from 'react';
import { whatsappSync } from '../services/whatsappSync';
import { WhatsAppMessage, WhatsAppChat } from '../types/whatsapp';

interface UseInstantSyncProps {
  profileId: string;
  selectedChatId?: string;
  onNewMessage?: (message: WhatsAppMessage) => void;
  onChatUpdate?: (chat: WhatsAppChat) => void;
  onTypingUpdate?: (chatId: string, isTyping: boolean) => void;
  onStatusUpdate?: (messageId: string, status: string) => void;
  syncInterval?: number;
}

export const useInstantSync = ({
  profileId,
  selectedChatId,
  onNewMessage,
  onChatUpdate,
  onTypingUpdate,
  onStatusUpdate,
  syncInterval = 1000 // 1 segundo para máxima velocidade
}: UseInstantSyncProps) => {
  const profileIdRef = useRef<string>(profileId);
  const selectedChatIdRef = useRef<string | undefined>(selectedChatId);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  
  // Update refs when props change
  profileIdRef.current = profileId;
  selectedChatIdRef.current = selectedChatId;

  // Handler para novas mensagens - INSTANTÂNEO
  const handleNewMessage = useCallback((message: WhatsAppMessage) => {
    // Processar IMEDIATAMENTE sem verificações desnecessárias
    if (onNewMessage) {
      onNewMessage(message);
    }
    
    // Invalidar cache imediatamente
    whatsappSync.invalidateMessageCache(profileIdRef.current, message.chatId);
    whatsappSync.invalidateChatCache(profileIdRef.current);
    
    // Forçar sincronização se for o chat ativo
    if (selectedChatIdRef.current === message.chatId) {
      whatsappSync.forceActiveChatSync(profileIdRef.current, message.chatId);
    }
  }, [onNewMessage]);

  // Handler para atualizações de chat
  const handleChatUpdate = useCallback((data: any) => {
    if (onChatUpdate && data.chat) {
      onChatUpdate(data.chat);
    }
  }, [onChatUpdate]);

  // Handler para indicador de digitação
  const handleTypingUpdate = useCallback((data: any) => {
    if (onTypingUpdate && data.chatId && typeof data.isTyping === 'boolean') {
      onTypingUpdate(data.chatId, data.isTyping);
    }
  }, [onTypingUpdate]);

  // Handler para atualizações de status
  const handleStatusUpdate = useCallback((data: any) => {
    if (onStatusUpdate && data.messageId && data.status) {
      onStatusUpdate(data.messageId, data.status);
    }
  }, [onStatusUpdate]);

  // Handler para sincronização incremental
  const handleSyncUpdate = useCallback((data: any) => {
    // Se for uma atualização imediata, não fazer nada extra
    if (data.immediate) {
      return;
    }
    
    // Processar apenas se o chat atual foi afetado
    if (selectedChatIdRef.current && data.chatIds?.includes(selectedChatIdRef.current)) {
      // Forçar sincronização do chat ativo
      whatsappSync.forceActiveChatSync(profileIdRef.current, selectedChatIdRef.current);
    }
  }, []);

  // Setup WebSocket listeners
  useEffect(() => {
    if (!profileId) return;

    // Entrar na sala do WhatsApp
    whatsappSync.joinWhatsAppRoom(profileId);
    
    // Inscrever nos eventos
    whatsappSync.subscribe('message', handleNewMessage);
    whatsappSync.subscribe('sync_update', handleSyncUpdate);
    whatsappSync.subscribe('state', handleTypingUpdate);
    whatsappSync.subscribe('status', handleStatusUpdate);

    return () => {
      // Desinscrever dos eventos
      whatsappSync.unsubscribe('message', handleNewMessage);
      whatsappSync.unsubscribe('sync_update', handleSyncUpdate);
      whatsappSync.unsubscribe('state', handleTypingUpdate);
      whatsappSync.unsubscribe('status', handleStatusUpdate);
    };
  }, [profileId, handleNewMessage, handleSyncUpdate, handleTypingUpdate, handleStatusUpdate]);

  // Setup sincronização automática otimizada
  useEffect(() => {
    if (!profileId || !selectedChatId) {
      return;
    }

    const performSync = () => {
      const now = Date.now();
      
      // Evitar sincronizações muito frequentes
      if (now - lastSyncTimeRef.current < syncInterval) {
        return;
      }
      
      lastSyncTimeRef.current = now;
      
      // Forçar sincronização do chat ativo
      whatsappSync.forceActiveChatSync(profileId, selectedChatId);
    };

    // Sincronização inicial
    performSync();

    // Setup interval para sincronização contínua
    syncTimeoutRef.current = setInterval(performSync, syncInterval);

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, [profileId, selectedChatId, syncInterval]);

  // Função para forçar sincronização manual
  const forceSync = useCallback(() => {
    if (profileIdRef.current) {
      whatsappSync.forceSync(profileIdRef.current, selectedChatIdRef.current);
    }
  }, []);

  // Função para invalidar cache
  const invalidateCache = useCallback(() => {
    if (profileIdRef.current) {
      whatsappSync.invalidateChatCache(profileIdRef.current);
      if (selectedChatIdRef.current) {
        whatsappSync.invalidateMessageCache(profileIdRef.current, selectedChatIdRef.current);
      }
    }
  }, []);

  // Função para verificar se está conectado
  const isConnected = useCallback(() => {
    return whatsappSync.isConnected();
  }, []);

  return {
    forceSync,
    invalidateCache,
    isConnected: isConnected()
  };
}; 