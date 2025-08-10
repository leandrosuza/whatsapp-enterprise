// WhatsAppProcessor.ts - Sistema de processamento otimizado

interface ProcessingTask {
  id: string;
  type: 'message' | 'chat' | 'sync' | 'ui';
  priority: 'high' | 'medium' | 'low';
  data: any;
  timestamp: number;
}

interface ProcessingResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
}

interface ProcessingWorker extends Worker {
  busy: boolean;
}

class WhatsAppProcessor {
  private taskQueue: ProcessingTask[] = [];
  private processingWorkers: ProcessingWorker[] = [];
  private maxWorkers = navigator.hardwareConcurrency || 4;
  private isProcessing = false;
  private processingStats = {
    totalTasks: 0,
    completedTasks: 0,
    averageProcessingTime: 0,
    activeWorkers: 0
  };

  // Cache otimizado com LRU
  private messageCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private chatCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_TTL = 30000; // 30 segundos

  // Debounce para operações frequentes
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly DEBOUNCE_DELAY = 100; // 100ms

  constructor() {
    this.initializeWorkers();
    this.startProcessingLoop();
    this.startCacheCleanup();
  }

  private initializeWorkers() {
    // Criar Web Workers para processamento paralelo
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(new URL('./workers/MessageProcessor.worker.ts', import.meta.url)) as ProcessingWorker;
      worker.busy = false;
      
      worker.onmessage = (event) => {
        this.handleWorkerResult(event.data);
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        worker.busy = false;
      };

      this.processingWorkers.push(worker);
    }

    console.log(`🚀 Initialized ${this.maxWorkers} processing workers`);
  }

  // Processamento de mensagens otimizado
  public async processMessages(messages: any[], priority: 'high' | 'medium' | 'low' = 'medium'): Promise<any[]> {
    const taskId = `msg_${Date.now()}_${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      const task: ProcessingTask = {
        id: taskId,
        type: 'message',
        priority,
        data: messages,
        timestamp: Date.now()
      };

      this.addTask(task, (result: ProcessingResult) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(new Error(result.error));
        }
      });
    });
  }

  // Processamento de chats otimizado
  public async processChats(chats: any[], priority: 'high' | 'medium' | 'low' = 'medium'): Promise<any[]> {
    const taskId = `chat_${Date.now()}_${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      const task: ProcessingTask = {
        id: taskId,
        type: 'chat',
        priority,
        data: chats,
        timestamp: Date.now()
      };

      this.addTask(task, (result: ProcessingResult) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(new Error(result.error));
        }
      });
    });
  }

  // Sincronização otimizada com debounce
  public debouncedSync(profileId: string, chatId: string, callback: () => void) {
    const key = `sync_${profileId}_${chatId}`;
    
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    this.debounceTimers.set(key, setTimeout(() => {
      callback();
      this.debounceTimers.delete(key);
    }, this.DEBOUNCE_DELAY));
  }

  // Cache inteligente com LRU
  private getFromCache<T>(key: string, cache: Map<string, { data: T; timestamp: number; ttl: number }>): T | null {
    const cached = cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache<T>(key: string, data: T, cache: Map<string, { data: T; timestamp: number; ttl: number }>, ttl: number) {
    // Implementar LRU se cache estiver cheio
    if (cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    
    cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  // Adicionar tarefa à fila com prioridade
  private addTask(task: ProcessingTask, callback: (result: ProcessingResult) => void) {
    // Inserir na posição correta baseada na prioridade
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const insertIndex = this.taskQueue.findIndex(
      existingTask => priorityOrder[existingTask.priority] > priorityOrder[task.priority]
    );
    
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }

    this.processingStats.totalTasks++;
    
    // Armazenar callback para quando a tarefa for processada
    (task as any).callback = callback;
  }

  // Loop principal de processamento
  private startProcessingLoop() {
    setInterval(() => {
      if (this.taskQueue.length === 0 || this.isProcessing) return;
      
      this.isProcessing = true;
      this.processNextBatch();
    }, 10); // Verificar a cada 10ms
  }

  // Processar próximo lote de tarefas
  private processNextBatch() {
    const availableWorkers = this.processingWorkers.filter(worker => !worker.busy);
    const tasksToProcess = Math.min(availableWorkers.length, this.taskQueue.length);
    
    if (tasksToProcess === 0) {
      this.isProcessing = false;
      return;
    }

    this.processingStats.activeWorkers = tasksToProcess;

    for (let i = 0; i < tasksToProcess; i++) {
      const task = this.taskQueue.shift()!;
      const worker = availableWorkers[i];
      
      worker.busy = true;
      worker.postMessage({
        type: task.type,
        data: task.data,
        taskId: task.id
      });
    }
  }

  // Lidar com resultado do worker
  private handleWorkerResult(result: ProcessingResult) {
    const worker = this.processingWorkers.find(w => w.busy);
    if (worker) {
      worker.busy = false;
    }

    this.processingStats.completedTasks++;
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime + result.processingTime) / 2;

    // Chamar callback da tarefa
    const task = this.taskQueue.find(t => t.id === result.taskId);
    if (task && (task as any).callback) {
      (task as any).callback(result);
    }

    this.isProcessing = false;
  }

  // Limpeza de cache automática
  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      
      // Limpar cache de mensagens
      for (const [key, value] of this.messageCache.entries()) {
        if (now - value.timestamp > value.ttl) {
          this.messageCache.delete(key);
        }
      }
      
      // Limpar cache de chats
      for (const [key, value] of this.chatCache.entries()) {
        if (now - value.timestamp > value.ttl) {
          this.chatCache.delete(key);
        }
      }
    }, 60000); // Limpar a cada minuto
  }

  // Estatísticas de performance
  public getStats() {
    return {
      ...this.processingStats,
      queueLength: this.taskQueue.length,
      cacheSize: {
        messages: this.messageCache.size,
        chats: this.chatCache.size
      },
      debounceTimers: this.debounceTimers.size
    };
  }

  // Limpar recursos
  public cleanup() {
    this.processingWorkers.forEach(worker => worker.terminate());
    this.processingWorkers = [];
    this.taskQueue = [];
    this.messageCache.clear();
    this.chatCache.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

// Singleton para uso global
export const whatsAppProcessor = new WhatsAppProcessor();
export default WhatsAppProcessor; 