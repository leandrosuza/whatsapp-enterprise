import { WhatsAppMessage, WhatsAppChat } from '../types/whatsapp';

// Tipos de eventos
export interface WhatsAppEventData {
  type: 'message' | 'chat_update' | 'typing' | 'status' | 'sync';
  profileId: string;
  chatId?: string;
  message?: WhatsAppMessage;
  chat?: WhatsAppChat;
  isTyping?: boolean;
  messageId?: string;
  status?: string;
  timestamp: number;
}

// Sistema de eventos globais para sincronização
class WhatsAppEventService {
  private listeners: Map<string, Set<(data: WhatsAppEventData) => void>> = new Map();
  private messageQueue: WhatsAppEventData[] = [];
  private isProcessing = false;

  // Adicionar listener para um tipo de evento
  public addEventListener(eventType: string, callback: (data: WhatsAppEventData) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    
    console.log(`📡 WhatsAppEventService: Listener added for ${eventType}, total: ${this.listeners.get(eventType)!.size}`);
  }

  // Remover listener
  public removeEventListener(eventType: string, callback: (data: WhatsAppEventData) => void) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
      console.log(`📡 WhatsAppEventService: Listener removed for ${eventType}, remaining: ${eventListeners.size}`);
    }
  }

  // Emitir evento
  public emitEvent(eventData: WhatsAppEventData) {
    // Adicionar à fila para processamento assíncrono
    this.messageQueue.push(eventData);
    
    // Processar fila se não estiver sendo processada
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // Processar fila de eventos
  private async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const eventData = this.messageQueue.shift()!;
      
      try {
        // Notificar todos os listeners do tipo de evento
        const eventListeners = this.listeners.get(eventData.type);
        if (eventListeners) {
          eventListeners.forEach(callback => {
            try {
              callback(eventData);
            } catch (error) {
              console.error('❌ Error in event listener:', error);
            }
          });
        }
        
        // Também notificar listeners globais
        const globalListeners = this.listeners.get('*');
        if (globalListeners) {
          globalListeners.forEach(callback => {
            try {
              callback(eventData);
            } catch (error) {
              console.error('❌ Error in global event listener:', error);
            }
          });
        }
        
        console.log(`📡 WhatsAppEventService: Event processed: ${eventData.type} for chat ${eventData.chatId}`);
        
      } catch (error) {
        console.error('❌ Error processing event:', error);
      }
      
      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    this.isProcessing = false;
  }

  // Métodos específicos para diferentes tipos de eventos
  public emitMessageEvent(profileId: string, chatId: string, message: WhatsAppMessage) {
    this.emitEvent({
      type: 'message',
      profileId,
      chatId,
      message,
      timestamp: Date.now()
    });
  }

  public emitChatUpdateEvent(profileId: string, chat: WhatsAppChat) {
    this.emitEvent({
      type: 'chat_update',
      profileId,
      chatId: chat.id,
      chat,
      timestamp: Date.now()
    });
  }

  public emitTypingEvent(profileId: string, chatId: string, isTyping: boolean) {
    this.emitEvent({
      type: 'typing',
      profileId,
      chatId,
      isTyping,
      timestamp: Date.now()
    });
  }

  public emitStatusEvent(profileId: string, messageId: string, status: string) {
    this.emitEvent({
      type: 'status',
      profileId,
      messageId,
      status,
      timestamp: Date.now()
    });
  }

  public emitSyncEvent(profileId: string, chatId?: string) {
    this.emitEvent({
      type: 'sync',
      profileId,
      chatId,
      timestamp: Date.now()
    });
  }

  // Métodos para inscrever em eventos específicos por profileId
  public onMessageEvent(profileId: string, callback: (chatId: string, message: WhatsAppMessage) => void) {
    const eventKey = `message_${profileId}`;
    this.addEventListener(eventKey, (data) => {
      if (data.message && data.chatId) {
        callback(data.chatId, data.message);
      }
    });
    
    // Retornar função para desinscrever
    return () => {
      this.removeEventListener(eventKey, callback as any);
    };
  }

  public onChatUpdateEvent(profileId: string, callback: (chat: WhatsAppChat) => void) {
    const eventKey = `chat_update_${profileId}`;
    this.addEventListener(eventKey, (data) => {
      if (data.chat) {
        callback(data.chat);
      }
    });
    
    // Retornar função para desinscrever
    return () => {
      this.removeEventListener(eventKey, callback as any);
    };
  }

  public onTypingEvent(profileId: string, callback: (chatId: string, isTyping: boolean) => void) {
    const eventKey = `typing_${profileId}`;
    this.addEventListener(eventKey, (data) => {
      if (data.chatId !== undefined && data.isTyping !== undefined) {
        callback(data.chatId, data.isTyping);
      }
    });
    
    // Retornar função para desinscrever
    return () => {
      this.removeEventListener(eventKey, callback as any);
    };
  }

  public onStatusEvent(profileId: string, callback: (messageId: string, status: string) => void) {
    const eventKey = `status_${profileId}`;
    this.addEventListener(eventKey, (data) => {
      if (data.messageId && data.status) {
        callback(data.messageId, data.status);
      }
    });
    
    // Retornar função para desinscrever
    return () => {
      this.removeEventListener(eventKey, callback as any);
    };
  }

  public onSyncEvent(profileId: string, callback: (chatId?: string) => void) {
    const eventKey = `sync_${profileId}`;
    this.addEventListener(eventKey, (data) => {
      callback(data.chatId);
    });
    
    // Retornar função para desinscrever
    return () => {
      this.removeEventListener(eventKey, callback as any);
    };
  }

  // Limpar todos os listeners
  public clearAllListeners() {
    this.listeners.clear();
    this.messageQueue = [];
    this.isProcessing = false;
    console.log('🧹 WhatsAppEventService: All listeners cleared');
  }

  // Obter estatísticas
  public getStats() {
    const stats: Record<string, number> = {};
    this.listeners.forEach((listeners, eventType) => {
      stats[eventType] = listeners.size;
    });
    
    return {
      listeners: stats,
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

// Instância global do serviço
export const whatsappEvents = new WhatsAppEventService();

// Hook para usar o serviço de eventos
export const useWhatsAppEvents = () => {
  const addEventListener = (eventType: string, callback: (data: WhatsAppEventData) => void) => {
    whatsappEvents.addEventListener(eventType, callback);
  };

  const removeEventListener = (eventType: string, callback: (data: WhatsAppEventData) => void) => {
    whatsappEvents.removeEventListener(eventType, callback);
  };

  const emitMessageEvent = (profileId: string, chatId: string, message: WhatsAppMessage) => {
    whatsappEvents.emitMessageEvent(profileId, chatId, message);
  };

  const emitChatUpdateEvent = (profileId: string, chat: WhatsAppChat) => {
    whatsappEvents.emitChatUpdateEvent(profileId, chat);
  };

  const emitTypingEvent = (profileId: string, chatId: string, isTyping: boolean) => {
    whatsappEvents.emitTypingEvent(profileId, chatId, isTyping);
  };

  const emitStatusEvent = (profileId: string, messageId: string, status: string) => {
    whatsappEvents.emitStatusEvent(profileId, messageId, status);
  };

  const emitSyncEvent = (profileId: string, chatId?: string) => {
    whatsappEvents.emitSyncEvent(profileId, chatId);
  };

  return {
    addEventListener,
    removeEventListener,
    emitMessageEvent,
    emitChatUpdateEvent,
    emitTypingEvent,
    emitStatusEvent,
    emitSyncEvent,
    getStats: whatsappEvents.getStats.bind(whatsappEvents)
  };
}; 