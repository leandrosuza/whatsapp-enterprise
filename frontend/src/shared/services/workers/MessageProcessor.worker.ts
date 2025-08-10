// MessageProcessor.worker.ts - Web Worker para processamento paralelo

interface WorkerMessage {
  type: 'message' | 'chat' | 'sync' | 'ui';
  data: any;
  taskId: string;
}

interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
}

// Processamento de mensagens otimizado
function processMessages(messages: any[]): any[] {
  const startTime = performance.now();
  
  try {
    // Processamento em lotes para melhor performance
    const batchSize = 100;
    const processedMessages = [];
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const processedBatch = batch.map(message => ({
        ...message,
        // Otimizações específicas para mensagens
        processedAt: Date.now(),
        // Formatação otimizada de data
        formattedTime: formatMessageTime(message.time),
        // Agrupamento por data
        dateKey: new Date(message.time).toDateString(),
        // Status otimizado
        status: message.status || 'sent'
      }));
      
      processedMessages.push(...processedBatch);
    }
    
    const processingTime = performance.now() - startTime;
    
    return processedMessages;
  } catch (error) {
    throw new Error(`Error processing messages: ${error}`);
  }
}

// Processamento de chats otimizado
function processChats(chats: any[]): any[] {
  const startTime = performance.now();
  
  try {
    // Ordenação otimizada por última atividade
    const sortedChats = chats.sort((a, b) => {
      const timeA = new Date(a.lastActivity || 0).getTime();
      const timeB = new Date(b.lastActivity || 0).getTime();
      return timeB - timeA; // Mais recente primeiro
    });
    
    // Processamento em paralelo usando Promise.all
    const processedChats = sortedChats.map(chat => ({
      ...chat,
      // Otimizações específicas para chats
      processedAt: Date.now(),
      // Preview otimizado da última mensagem
      lastMessagePreview: chat.lastMessage ? 
        chat.lastMessage.substring(0, 50) + (chat.lastMessage.length > 50 ? '...' : '') : '',
      // Status otimizado
      isActive: chat.unreadCount > 0,
      // Formatação de timestamp
      formattedLastActivity: formatChatTimestamp(chat.lastActivity)
    }));
    
    const processingTime = performance.now() - startTime;
    
    return processedChats;
  } catch (error) {
    throw new Error(`Error processing chats: ${error}`);
  }
}

// Sincronização otimizada
function processSync(syncData: any): any {
  const startTime = performance.now();
  
  try {
    // Processamento de sincronização incremental
    const processedSync = {
      ...syncData,
      processedAt: Date.now(),
      // Otimizações de sincronização
      incremental: true,
      // Timestamp de processamento
      syncTimestamp: Date.now()
    };
    
    const processingTime = performance.now() - startTime;
    
    return processedSync;
  } catch (error) {
    throw new Error(`Error processing sync: ${error}`);
  }
}

// Funções auxiliares otimizadas
function formatMessageTime(time: string | Date): string {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Otimização: usar timestamps para comparação
  if (diff < 60000) return 'Agora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

function formatChatTimestamp(time: string | Date): string {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 86400000) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

// Listener principal do worker
self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, data, taskId } = event.data;
  const startTime = performance.now();
  
  try {
    let result: any;
    
    switch (type) {
      case 'message':
        result = processMessages(data);
        break;
      case 'chat':
        result = processChats(data);
        break;
      case 'sync':
        result = processSync(data);
        break;
      default:
        throw new Error(`Unknown processing type: ${type}`);
    }
    
    const processingTime = performance.now() - startTime;
    
    const workerResult: WorkerResult = {
      taskId,
      success: true,
      data: result,
      processingTime
    };
    
    self.postMessage(workerResult);
    
  } catch (error) {
    const processingTime = performance.now() - startTime;
    
    const workerResult: WorkerResult = {
      taskId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    };
    
    self.postMessage(workerResult);
  }
};

// Otimizações de performance do worker
self.onerror = function(error) {
  console.error('Worker error:', error);
};

// Limpeza de recursos
self.onclose = function() {
  // Cleanup se necessário
}; 