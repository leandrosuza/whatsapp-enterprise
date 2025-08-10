import { useCallback, useRef, useMemo } from 'react';
import { WhatsAppMessage } from '../types/whatsapp';

interface UseOptimizedProcessingOptions {
  maxMessages?: number;
  batchSize?: number;
  debounceMs?: number;
}

export const useOptimizedProcessing = (options: UseOptimizedProcessingOptions = {}) => {
  const {
    maxMessages = 1000,
    batchSize = 50,
    debounceMs = 100
  } = options;

  const processingQueue = useRef<WhatsAppMessage[]>([]);
  const isProcessing = useRef(false);
  const lastProcessTime = useRef(0);

  // Processar mensagens em lotes para melhor performance
  const processBatch = useCallback(async (messages: WhatsAppMessage[]) => {
    if (messages.length === 0) return [];

    const now = Date.now();
    if (now - lastProcessTime.current < debounceMs) {
      // Adicionar à fila se ainda não passou tempo suficiente
      processingQueue.current.push(...messages);
      return [];
    }

    lastProcessTime.current = now;

    // Processar em lotes
    const processedMessages: WhatsAppMessage[] = [];
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      // Normalizar mensagens do lote
      const normalizedBatch = batch.map(message => ({
        ...message,
        time: message.time instanceof Date ? message.time : new Date(message.time),
        id: message.id || `temp-${Date.now()}-${i}`
      }));

      processedMessages.push(...normalizedBatch);

      // Pequeno delay entre lotes para não bloquear a UI
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    return processedMessages;
  }, [batchSize, debounceMs]);

  // Função para adicionar mensagens à fila de processamento
  const addToProcessingQueue = useCallback((messages: WhatsAppMessage[]) => {
    processingQueue.current.push(...messages);
  }, []);

  // Função para processar fila pendente
  const processQueue = useCallback(async () => {
    if (isProcessing.current || processingQueue.current.length === 0) {
      return [];
    }

    isProcessing.current = true;
    const messagesToProcess = processingQueue.current.splice(0);
    
    try {
      const processed = await processBatch(messagesToProcess);
      return processed;
    } finally {
      isProcessing.current = false;
    }
  }, [processBatch]);

  // Função para limpar fila
  const clearQueue = useCallback(() => {
    processingQueue.current = [];
    isProcessing.current = false;
  }, []);

  // Função para obter estatísticas da fila
  const getQueueStats = useCallback(() => ({
    queueLength: processingQueue.current.length,
    isProcessing: isProcessing.current,
    lastProcessTime: lastProcessTime.current
  }), []);

  // Função para otimizar lista de mensagens (remover duplicatas, ordenar)
  const optimizeMessageList = useCallback((messages: WhatsAppMessage[]) => {
    if (messages.length === 0) return [];

    // Remover duplicatas por ID
    const uniqueMessages = messages.filter((message, index, self) => 
      index === self.findIndex(m => m.id === message.id)
    );

    // Ordenar por tempo
    const sortedMessages = uniqueMessages.sort((a, b) => {
      const timeA = a.time instanceof Date ? a.time : new Date(a.time);
      const timeB = b.time instanceof Date ? b.time : new Date(b.time);
      return timeA.getTime() - timeB.getTime();
    });

    // Limitar número de mensagens se necessário
    if (sortedMessages.length > maxMessages) {
      return sortedMessages.slice(-maxMessages);
    }

    return sortedMessages;
  }, [maxMessages]);

  // Função para detectar mensagens novas
  const detectNewMessages = useCallback((oldMessages: WhatsAppMessage[], newMessages: WhatsAppMessage[]) => {
    const oldIds = new Set(oldMessages.map(m => m.id));
    return newMessages.filter(message => !oldIds.has(message.id));
  }, []);

  // Função para agrupar mensagens por data
  const groupMessagesByDate = useCallback((messages: WhatsAppMessage[]) => {
    const groups: { date: string; messages: WhatsAppMessage[] }[] = [];
    
    messages.forEach((message) => {
      try {
        const messageDate = message.time instanceof Date ? message.time : new Date(message.time);
        const dateKey = messageDate.toDateString();
        
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
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error processing message date:', error);
        }
      }
    });
    
    return groups;
  }, []);

  // Função para calcular estatísticas de mensagens
  const calculateMessageStats = useCallback((messages: WhatsAppMessage[]) => {
    const stats = {
      total: messages.length,
      sent: 0,
      received: 0,
      unread: 0,
      byType: {} as Record<string, number>,
      byDate: {} as Record<string, number>
    };

    messages.forEach(message => {
      if (message.isSent) {
        stats.sent++;
      } else {
        stats.received++;
        // Não temos informação de leitura, então não contamos como não lida
        // stats.unread++;
      }

      // Contar por tipo
      const type = message.type || 'text';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Contar por data
      try {
        const date = message.time instanceof Date ? message.time : new Date(message.time);
        const dateKey = date.toDateString();
        stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
      } catch (error) {
        // Ignorar erros de data
      }
    });

    return stats;
  }, []);

  // Memoizar funções para evitar re-criação
  const memoizedFunctions = useMemo(() => ({
    processBatch,
    addToProcessingQueue,
    processQueue,
    clearQueue,
    getQueueStats,
    optimizeMessageList,
    detectNewMessages,
    groupMessagesByDate,
    calculateMessageStats
  }), [
    processBatch,
    addToProcessingQueue,
    processQueue,
    clearQueue,
    getQueueStats,
    optimizeMessageList,
    detectNewMessages,
    groupMessagesByDate,
    calculateMessageStats
  ]);

  return memoizedFunctions;
};

export default useOptimizedProcessing; 