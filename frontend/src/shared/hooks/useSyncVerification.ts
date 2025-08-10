import { useState, useEffect, useRef, useCallback } from 'react';
import { whatsappSync } from '../services/whatsappSync';
import { WhatsAppMessage } from '../types/whatsapp';

interface SyncVerificationState {
  isChecking: boolean;
  needsSync: boolean;
  lastCheckTime: number;
  syncReason: string | null;
  syncData: {
    totalMessages: number;
    lastMessageId: string | null;
    lastMessageTimestamp: number | null;
    lastMessageText: string;
    lastMessageType: string;
  } | null;
}

interface UseSyncVerificationOptions {
  profileId: string;
  chatId: string;
  messages: WhatsAppMessage[];
  checkInterval?: number; // Intervalo em ms para verificação automática
  autoSync?: boolean; // Se deve sincronizar automaticamente quando detectar diferenças
  onSyncNeeded?: (reason: string) => void;
  onSyncCompleted?: () => void;
}

export const useSyncVerification = ({
  profileId,
  chatId,
  messages,
  checkInterval = 30000, // 30 segundos por padrão
  autoSync = false,
  onSyncNeeded,
  onSyncCompleted
}: UseSyncVerificationOptions) => {
  const [state, setState] = useState<SyncVerificationState>({
    isChecking: false,
    needsSync: false,
    lastCheckTime: 0,
    syncReason: null,
    syncData: null
  });

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);
  const messagesRef = useRef<WhatsAppMessage[]>([]);

  // Atualizar ref quando messages mudar
  messagesRef.current = messages;

  // Função para verificar sincronização
  const checkSync = useCallback(async (force: boolean = false) => {
    if (!profileId || !chatId) {
      return;
    }

    // Evitar verificações muito frequentes (mínimo 1 segundo entre verificações)
    const now = Date.now();
    if (!force && now - lastCheckRef.current < 1000) {
      return;
    }

    setState(prev => ({ ...prev, isChecking: true }));
    lastCheckRef.current = now;

    try {
      // Obter dados da última mensagem no frontend
      const lastMessage = messages.length > 0 ? messages[0] : null; // Assumindo que as mensagens estão ordenadas por timestamp (mais recente primeiro)
      
      const result = await whatsappSync.checkMessageSync(
        profileId,
        chatId,
        lastMessage?.id,
        lastMessage?.time ? new Date(lastMessage.time).getTime() : undefined,
        messages.length
      );

      setState(prev => ({
        ...prev,
        isChecking: false,
        needsSync: result.needsSync,
        lastCheckTime: now,
        syncReason: result.syncData.syncReason,
        syncData: result.syncData
      }));

      // Verificação adicional: comparar preview com mensagens do chat
      const shouldForceSync = result.needsSync || (
        messages.length > 0 && 
        result.syncData.totalMessages > 0 && 
        result.syncData.totalMessages !== messages.length
      );

      // Se precisa sincronizar e autoSync está habilitado
      if (shouldForceSync && autoSync) {
        const syncReason = result.syncData.syncReason || 'preview_mismatch';
        console.log('🔄 Auto-sync triggered due to:', syncReason);
        
        // Forçar sincronização imediata
        await whatsappSync.forceImmediateSync(profileId, chatId);
        
        if (onSyncNeeded) {
          onSyncNeeded(syncReason);
        }
      }

      // Se não precisa sincronizar e estava precisando antes
      if (!result.needsSync && state.needsSync) {
        if (onSyncCompleted) {
          onSyncCompleted();
        }
      }

    } catch (error) {
      console.error('❌ Error checking sync:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
        needsSync: true,
        lastCheckTime: now,
        syncReason: 'error_checking_sync'
      }));
    }
  }, [profileId, chatId, messages.length, autoSync, onSyncNeeded, onSyncCompleted, state.needsSync]);

  // Função para forçar verificação
  const forceCheck = useCallback(() => {
    checkSync(true);
  }, [checkSync]);

  // Função para sincronizar manualmente
  const manualSync = useCallback(async () => {
    if (!profileId || !chatId) return;

    console.log('🔄 Manual sync triggered');
    
    // Invalidar cache
    whatsappSync.invalidateMessageCache(profileId, chatId);
    
    // Forçar verificação após um pequeno delay
    setTimeout(() => {
      checkSync(true);
    }, 1000);
  }, [profileId, chatId, checkSync]);

  // Configurar verificação automática
  useEffect(() => {
    if (checkInterval > 0 && profileId && chatId) {
      // Limpar intervalo anterior
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }

      // Configurar novo intervalo
      checkIntervalRef.current = setInterval(() => {
        checkSync();
      }, checkInterval);

      // Primeira verificação imediata
      checkSync();

      // Segunda verificação após um delay
      const initialCheckTimeout = setTimeout(() => {
        checkSync();
      }, 2000);

      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        clearTimeout(initialCheckTimeout);
      };
    }
  }, [checkInterval, profileId, chatId, checkSync]);

  // Verificar quando messages mudar significativamente
  useEffect(() => {
    if (profileId && chatId) {
      // Verificar se houve mudança significativa nas mensagens
      const lastMessage = messages.length > 0 ? messages[0] : null;
      const lastMessageId = lastMessage?.id;
      const lastMessageTimestamp = lastMessage?.time ? new Date(lastMessage.time).getTime() : 0;

      // Se a última mensagem mudou, fazer uma verificação rápida
      if (lastMessageId && lastMessageTimestamp > lastCheckRef.current) {
        setTimeout(() => {
          checkSync();
        }, 200); // Reduzido para 200ms para resposta mais rápida
      }

      // Verificação adicional: se o número de mensagens mudou significativamente
      const previousMessageCount = messagesRef.current.length;
      if (Math.abs(messages.length - previousMessageCount) > 0) {
        setTimeout(() => {
          checkSync();
        }, 300);
      }
    }
  }, [messages, profileId, chatId, checkSync]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    checkSync,
    forceCheck,
    manualSync,
    isActive: checkInterval > 0
  };
}; 