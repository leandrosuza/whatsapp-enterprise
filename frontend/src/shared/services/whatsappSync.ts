import { WhatsAppContact, WhatsAppMessage, WhatsAppChat, SyncMessage, MessageResponse } from '../types/whatsapp';
import { io, Socket } from 'socket.io-client';

class WhatsAppSyncService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduzido de 5 para 3
  private reconnectInterval = 5000; // Aumentado de 3000 para 5000
  private listeners: Map<string, Function[]> = new Map();
  private apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;
  
  // Smart cache otimizado para reduzir sobrecarga
  private chatCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private messageCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private lastSyncTimestamp: number = 0;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private pendingUpdates: Set<string> = new Set();
  
  // Cache TTL otimizado para melhor performance
  private readonly CHAT_CACHE_TTL = 1000; // 1 segundo para chats (reduzido para máxima velocidade)
  private readonly MESSAGE_CACHE_TTL = 500; // 500ms para mensagens (reduzido para máxima velocidade)
  private readonly SYNC_DEBOUNCE_DELAY = 10; // 10ms para debounce (reduzido drasticamente)
  private readonly ACTIVE_CHAT_CACHE_TTL = 100; // 100ms para active chat (reduzido para máxima velocidade)
  
  // Sistema para rastrear chat ativo
  private activeChatId: string | null = null;
  
  // Controle de rate limiting
  private lastRequestTime: Map<string, number> = new Map();
  private readonly MIN_REQUEST_INTERVAL = 50; // 50ms entre requests (reduzido drasticamente)
  
  // Métodos para gerenciar chat ativo
  public setActiveChat(chatId: string | null) {
    this.activeChatId = chatId;
    // Log reduzido para melhor performance
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Active chat set to:', chatId);
    }
  }
  
  public getActiveChat(): string | null {
    return this.activeChatId;
  }
  
  private shouldIgnoreCache(chatId: string): boolean {
    return chatId === this.activeChatId;
  }
  
  // Rate limiting para evitar sobrecarga
  private canMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(endpoint) || 0;
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      return false;
    }
    
    this.lastRequestTime.set(endpoint, now);
    return true;
  }
  
  // Método para emitir eventos para listeners
  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error in ${event} listener:`, error);
        }
      }
    });
  }
  
  constructor() {
    // Debug apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 WhatsAppSyncService - Configuration:', {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        apiUrl: this.apiUrl,
        isDevelopment: process.env.NODE_ENV === 'development'
      });
    }
    
    this.initializeSocket();
  }

  private initializeSocket() {
    if (this.isConnecting) return;
    
    // Clean up any existing socket before creating a new one
    if (this.socket) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔌 Cleaning up existing socket connection');
      }
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnecting = true;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔌 Initializing Socket.IO connection...');
      }
      
      this.socket = io(this.apiUrl, {
        transports: ['websocket'], // Apenas WebSocket para máxima velocidade
        timeout: 15000, // Reduzido para 15 segundos
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000, // Reduzido para 1 segundo
        reconnectionDelayMax: 5000, // Reduzido para 5 segundos
        forceNew: false,
        autoConnect: true,
        upgrade: true,
        rememberUpgrade: true
      });
      
      this.socket.on('connect', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Socket.IO connected successfully');
        }
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      });

      this.socket.on('whatsapp_message', (data: SyncMessage) => {
        // Validate message data before processing
        if (!data.data?.id || !data.data?.chatId) {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ Invalid message data received:', data);
          }
          return;
        }
        
        this.handleSyncMessage(data);
      });

      this.socket.on('whatsapp_status', (data: SyncMessage) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Frontend received status update:', data);
        }
        
        // Emitir evento para componentes
        this.emit('status', data);
      });

      this.socket.on('whatsapp_state', (data: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('⌨️ Frontend received typing state:', data);
        }
        
        // Emitir evento para componentes
        this.emit('state', data);
      });

      this.socket.on('sync_update', (data: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Frontend received sync update:', data);
        }
        
        // Emitir evento para componentes
        this.emit('sync_update', data);
      });

      this.socket.on('disconnect', (reason: string) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔌 Socket.IO disconnected:', reason);
        }
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.socket?.connect();
        }
      });

      this.socket.on('connect_error', (error: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Socket.IO connection error:', error);
        }
        
        this.isConnecting = false;
        
        // Implementar retry com backoff exponencial
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.reconnectInterval);
          
          setTimeout(() => {
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            }
            this.initializeSocket();
          }, delay);
        }
      });

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error initializing Socket.IO:', error);
      }
      this.isConnecting = false;
    }
  }

  private handleSyncMessage(syncMessage: SyncMessage) {
    // Log apenas raramente para não impactar performance
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
      console.log('⚡ ULTRA-FAST handleSyncMessage:', syncMessage.type, syncMessage.data?.chatId);
    }
    
    // Ensure timestamp is a valid Date object - OTIMIZADO
    let timestamp: Date;
    if (syncMessage.timestamp instanceof Date) {
      timestamp = syncMessage.timestamp;
    } else if (typeof syncMessage.timestamp === 'string') {
      timestamp = new Date(syncMessage.timestamp);
    } else if (typeof syncMessage.timestamp === 'number') {
      timestamp = new Date(syncMessage.timestamp);
    } else {
      timestamp = new Date();
    }
    
    // For new messages, process INSTANTLY like WhatsApp real - SEM DEBOUNCE
    if (syncMessage.type === 'message' && syncMessage.data?.chatId) {
      const chatId = syncMessage.data.chatId;
      
      // Invalidate cache IMMEDIATELY
      this.invalidateChatCache(syncMessage.profileId);
      this.invalidateMessageCache(syncMessage.profileId, chatId);
      
      // Emit event INSTANTLY for messages (no debounce, no delay, no logging)
      const messageListeners = this.listeners.get('message') || [];
      messageListeners.forEach(callback => {
        try {
          callback(syncMessage.data);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error in message listener:', error);
          }
        }
      });
      
      // Also emit sync_update INSTANTLY for messages
      const syncListeners = this.listeners.get('sync_update') || [];
      syncListeners.forEach(callback => {
        try {
          callback({
            chatIds: [chatId],
            timestamp: timestamp.getTime(),
            type: 'message',
            immediate: true, // Flag to indicate it's an immediate update
            isActiveChat: this.shouldIgnoreCache(chatId) // Flag for active chat
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error in sync listener:', error);
          }
        }
      });
      
      return; // Exit here for messages - don't use debounce
    }

    // For other types of events, use minimal debounce
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    
    this.syncDebounceTimer = setTimeout(() => {
      const listeners = this.listeners.get('sync_update') || [];
      listeners.forEach(callback => {
        try {
          callback({
            chatIds: syncMessage.data?.chatId ? [syncMessage.data.chatId] : [],
            timestamp: timestamp.getTime(),
            type: syncMessage.type
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error in sync listener:', error);
          }
        }
      });
    }, 10); // Reduzido para 10ms para máxima velocidade
  }

  // Smart cache methods
  public invalidateChatCache(profileId?: string) {
    if (profileId) {
      // Invalidate only the specific profile cache
      const cacheKey = `chats_${profileId}`;
      const wasDeleted = this.chatCache.delete(cacheKey);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧹 Chat cache invalidated for profile ${profileId}:`, wasDeleted ? 'deleted' : 'not found');
      }
    } else {
      // Invalidate all chat cache
      const cacheSize = this.chatCache.size;
      this.chatCache.clear();
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧹 All chat cache cleared (${cacheSize} entries)`);
      }
    }
    
    // Forçar limpeza de todos os caches relacionados
    this.messageCache.clear();
    this.pendingUpdates.clear();
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 All related caches cleared');
    }
  }

  public invalidateMessageCache(profileId?: string, chatId?: string) {
    if (profileId && chatId) {
      // Invalidate only the specific chat messages cache
      const cacheKey = `messages_${profileId}_${chatId}`;
      this.messageCache.delete(cacheKey);
    } else {
      // Invalidate all message cache
      this.messageCache.clear();
    }
  }

  private isCacheValid(cacheKey: string, cache: Map<string, { data: any; timestamp: number; ttl: number }>): boolean {
    const cached = cache.get(cacheKey);
    if (!cached) {
      return false;
    }
    
    const now = Date.now();
    const isValid = (now - cached.timestamp) < cached.ttl;
    
    if (!isValid) {
      cache.delete(cacheKey);
    }
    
    return isValid;
  }

  private setCache(cacheKey: string, data: any, cache: Map<string, { data: any; timestamp: number; ttl: number }>, ttl: number) {
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  public async ensureConnection(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      if (!this.socket) {
        this.initializeSocket();
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      const onConnect = () => {
        clearTimeout(timeout);
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        resolve();
      };

      const onError = (error: any) => {
        clearTimeout(timeout);
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        reject(error);
      };

      this.socket?.on('connect', onConnect);
      this.socket?.on('connect_error', onError);
    });

    return this.connectionPromise;
  }

  public joinWhatsAppRoom(profileId: string) {
    this.ensureConnection().then(() => {
      if (this.socket) {
        this.socket.emit('join-whatsapp', profileId);
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 Joined WhatsApp room for profile:', profileId);
        }
      }
    }).catch(error => {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to join WhatsApp room:', error);
      }
    });
  }

  public subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    if (process.env.NODE_ENV === 'development') {
      console.log(`📡 Subscribed to ${event}, total listeners:`, this.listeners.get(event)!.length);
    }
  }

  public unsubscribe(event: string, callback: Function) {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      if (process.env.NODE_ENV === 'development') {
        console.log(`📡 Unsubscribed from ${event}, remaining listeners:`, listeners.length);
      }
    }
  }

  private async makeRequest<T>(url: string, options?: RequestInit): Promise<T> {
    console.log(`🌐 Making request to: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Request successful:`, typeof data, Array.isArray(data) ? `${data.length} items` : 'object');
    return data;
  }

  public async testConnection(): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 Testing API connection...');
      }
      const response = await fetch(`${this.apiUrl}/api/whatsapp/test`);
      const data = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ API test successful:', data);
      }
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ API test failed:', error);
      }
      return false;
    }
  }

  public async getProfiles(): Promise<any[]> {
    try {
      console.log('📋 Fetching profiles...');
      const profiles = await this.makeRequest<any[]>(`${this.apiUrl}/api/whatsapp/profiles`);
      console.log('✅ Profiles fetched successfully:', profiles.length);
      return profiles;
    } catch (error) {
      console.error('❌ Error fetching profiles:', error);
      throw error;
    }
  }

  public async reconnectProfile(profileId: string): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Reconnecting profile:', profileId);
      }
      const response = await this.makeRequest<any>(`${this.apiUrl}/api/whatsapp/profiles/${profileId}/reconnect`, {
        method: 'POST'
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Profile reconnected successfully:', response);
      }
      return response.success;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error reconnecting profile:', error);
      }
      return false;
    }
  }

  public async getChats(profileId: string, forceRefresh: boolean = false): Promise<WhatsAppChat[]> {
    console.log('🔍 getChats called for profileId:', profileId);
    
    const cacheKey = `chats_${profileId}`;
    
    // Se não for forçar refresh, verificar cache primeiro
    if (!forceRefresh && this.isCacheValid(cacheKey, this.chatCache)) {
      const cachedData = this.chatCache.get(cacheKey);
      console.log('📦 Returning cached chats for profile', profileId + ':', cachedData?.data.length, 'chats');
      return cachedData?.data || [];
    }
    
    // Buscar dados frescos da API
    console.log('🌐 Fetching fresh chats for profile', profileId, 'from API...');
    
    try {
      const response = await this.makeRequest<any>(`${this.apiUrl}/api/whatsapp/profiles/${profileId}/chats`);
      
      if (response.success && response.chats) {
        console.log('📥 API response received for profile', profileId);
        
        // Processar e formatar os chats
        const processedChats = response.chats.map((chat: any) => ({
          id: chat.id,
          contact: {
            id: chat.contact.id,
            name: chat.contact.name,
            number: chat.contact.number,
            avatar: chat.contact.avatar,
            isOnline: chat.contact.isOnline,
            isGroup: chat.contact.isGroup,
            lastMessage: chat.contact.lastMessage,
            lastTime: chat.contact.lastTime
          },
          unreadCount: chat.unreadCount || 0,
          lastActivity: chat.lastActivity ? new Date(chat.lastActivity) : new Date()
        }));
        
        // Debug: Log das datas processadas
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('📅 Frontend chat processing debug:', {
            totalChats: processedChats.length,
            sampleChats: processedChats.slice(0, 3).map(chat => ({
              name: chat.contact.name,
              lastActivity: chat.lastActivity,
              lastActivityTime: chat.lastActivity.getTime(),
              unreadCount: chat.unreadCount
            }))
          });
        }
        
        console.log('✅ Raw chats received:', response.chats.length);
        
        // Armazenar no cache com TTL reduzido para atualizações mais frequentes
        const ttl = forceRefresh ? 500 : this.CHAT_CACHE_TTL; // 500ms para atualizações forçadas
        this.setCache(cacheKey, processedChats, this.chatCache, ttl);
        
        console.log('✅ Processed chats for profile', profileId + ':', processedChats.length, 'chats');
        return processedChats;
      } else {
        console.error('❌ Failed to fetch chats:', response.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching chats:', error);
      return [];
    }
  }

  public async getMessages(profileId: string, chatId: string, limit?: number): Promise<WhatsAppMessage[]> {
    const cacheKey = `messages_${profileId}_${chatId}`;
    
    // Verificar cache primeiro
    if (this.isCacheValid(cacheKey, this.messageCache) && !this.shouldIgnoreCache(chatId)) {
      const cached = this.messageCache.get(cacheKey);
      return cached!.data;
    }
    
    try {
      // Construir URL com parâmetro de limite se fornecido
      const url = limit 
        ? `${this.apiUrl}/api/whatsapp/profiles/${profileId}/chats/${chatId}/messages?limit=${limit}`
        : `${this.apiUrl}/api/whatsapp/profiles/${profileId}/chats/${chatId}/messages`;
      
      const response = await this.makeRequest<WhatsAppMessage[]>(url);
      
      // Validar resposta
      if (!Array.isArray(response)) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Invalid messages response:', response);
        }
        return [];
      }
      
      // Cache das mensagens com TTL reduzido para máxima responsividade
      const ttl = this.shouldIgnoreCache(chatId) ? this.ACTIVE_CHAT_CACHE_TTL : this.MESSAGE_CACHE_TTL;
      this.setCache(cacheKey, response, this.messageCache, ttl);
      
      return response;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error fetching messages:', error);
      }
      throw error;
    }
  }

  public async sendMessage(profileId: string, chatId: string, message: string): Promise<MessageResponse> {
    try {
      const response = await this.makeRequest<MessageResponse>(`${this.apiUrl}/api/whatsapp/profiles/${profileId}/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: message }),
      });
      
      return response;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error sending message:', error);
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  public async markAsRead(profileId: string, chatId: string, messageIds: string[]): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('👁️ Marking messages as read:', messageIds.length);
      }
      
      // Enviar via socket para o WhatsApp real
      if (this.socket && this.socket.connected) {
        this.socket.emit('markAsRead', { chatId, profileId });
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ markAsRead sent via socket');
        }
      }
      
      // Também enviar via API para persistir no banco
      const response = await fetch(`${this.apiUrl}/api/whatsapp/profiles/${profileId}/chats/${chatId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageIds }),
      });

      const success = response.ok;
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Messages marked as read:', success);
      }
      return success;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error marking as read:', error);
      }
      return false;
    }
  }

  public sendTypingIndicator(profileId: string, chatId: string, isTyping: boolean): void {
    try {
      if (this.socket && this.socket.connected) {
        this.socket.emit('typing', { chatId, profileId, isTyping });
        if (process.env.NODE_ENV === 'development') {
          console.log(`⌨️ Typing indicator sent: ${isTyping ? 'typing' : 'stopped'}`);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error sending typing indicator:', error);
      }
    }
  }

  public async getContactInfo(profileId: string, contactId: string): Promise<WhatsAppContact | null> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Fetching contact info:', contactId);
      }
      const contact = await this.makeRequest<WhatsAppContact>(`${this.apiUrl}/api/whatsapp/profiles/${profileId}/contacts/${contactId}`);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Contact info fetched successfully');
      }
      return contact;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error fetching contact info:', error);
      }
      return null;
    }
  }

  // Método para obter estatísticas das conversas
  public async getConversationStats(profileId: string): Promise<{
    totalConversations: number;
    unreadMessages: number;
    activeProfiles: number;
    highPriority: number;
    lastUpdated: string;
  } | null> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Fetching conversation stats for profile:', profileId);
      }
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          totalConversations: number;
          unreadMessages: number;
          activeProfiles: number;
          highPriority: number;
          lastUpdated: string;
        };
      }>(`${this.apiUrl}/api/analytics/conversations/stats?profileId=${profileId}`);
      
      if (response.success && response.data) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Conversation stats fetched successfully:', response.data);
        }
        return response.data;
      }
      
      return null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error fetching conversation stats:', error);
      }
      return null;
    }
  }

  public async createOrGetChat(profileId: string, number: string): Promise<any> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🆕 Creating/getting chat for number:', number, 'in profile:', profileId);
      }
      
      const response = await this.makeRequest<any>(`${this.apiUrl}/api/whatsapp/profiles/${profileId}/chats/create`, {
        method: 'POST',
        body: JSON.stringify({ number })
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Chat created/retrieved successfully:', {
          chatId: response.chat.id,
          isNew: response.isNew,
          contactName: response.chat.contact.name
        });
      }
      
      return response;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error creating/getting chat:', error);
      }
      throw error;
    }
  }

  public disconnect() {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔌 Disconnecting Socket.IO...');
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public emitTestMessage(message: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('whatsapp_message', message);
      console.log('✅ Test message emitted via WebSocket');
    } else {
      console.log('❌ WebSocket not available for test message');
    }
  }

  public getDebugInfo() {
    return {
      isConnected: this.socket?.connected || false,
      reconnectAttempts: this.reconnectAttempts,
      listeners: Object.fromEntries(
        Array.from(this.listeners.entries()).map(([key, value]) => [key, value.length])
      ),
      chatCacheSize: this.chatCache.size,
      messageCacheSize: this.messageCache.size,
      pendingUpdates: Array.from(this.pendingUpdates),
      lastSyncTimestamp: this.lastSyncTimestamp
    };
  }

  // Métodos para sincronização em tempo real
  public forceSync(profileId?: string, chatId?: string) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Force sync called for profileId:', profileId, 'chatId:', chatId);
    }
    
    // Invalidar cache específico
    if (profileId && chatId) {
      this.invalidateMessageCache(profileId, chatId);
      this.invalidateChatCache(profileId);
    } else {
      this.clearCache();
    }
    
    // Emitir evento de sync forçado
    const listeners = this.listeners.get('sync_update') || [];
    listeners.forEach(callback => {
      try {
        callback({
          chatIds: chatId ? [chatId] : ['all'],
          timestamp: Date.now(),
          type: 'force_sync',
          immediate: true,
          isActiveChat: chatId ? this.shouldIgnoreCache(chatId) : false
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error in force sync listener:', error);
        }
      }
    });
  }
  
  public forceActiveChatSync(profileId: string, chatId: string) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Force active chat sync:', chatId);
    }
    
    // Invalidar cache do chat ativo
    this.invalidateMessageCache(profileId, chatId);
    
    // Emitir evento imediato para o chat ativo
    const listeners = this.listeners.get('sync_update') || [];
    listeners.forEach(callback => {
      try {
        callback({
          chatIds: [chatId],
          timestamp: Date.now(),
          type: 'active_chat_sync',
          immediate: true,
          isActiveChat: true
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error in active chat sync listener:', error);
        }
      }
    });
  }


  public clearCache() {
    this.chatCache.clear();
    this.messageCache.clear();
    this.pendingUpdates.clear();
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ All caches cleared');
    }
  }

  // Clear all cache and force fresh sync
  clearAllCache() {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Clearing all cache...');
    }
    this.chatCache.clear();
    this.messageCache.clear();
    this.lastSyncTimestamp = 0;
    this.pendingUpdates.clear();
    
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ All cache cleared');
    }
  }

  public getCacheStats() {
    return {
      chatCache: {
        size: this.chatCache.size,
        keys: Array.from(this.chatCache.keys())
      },
      messageCache: {
        size: this.messageCache.size,
        keys: Array.from(this.messageCache.keys())
      },
      pendingUpdates: Array.from(this.pendingUpdates)
    };
  }

  // Método para sincronização incremental
  public async syncIncremental(profileId: string, lastSyncTime?: number) {
    try {
      const syncTime = lastSyncTime || this.lastSyncTimestamp;
      const url = `${this.apiUrl}/api/whatsapp/profiles/${profileId}/sync?since=${syncTime}`;
      
      const response = await this.makeRequest<any>(url);
      
      if (response.updates && response.updates.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Processing incremental sync:', response.updates.length, 'updates');
        }
        
        // Processar atualizações de forma mais inteligente
        const messageUpdates = response.updates.filter((update: any) => update.type === 'message');
        const chatUpdates = response.updates.filter((update: any) => update.type === 'chat');
        
        // Invalidar cache apenas quando necessário
        if (messageUpdates.length > 0) {
          messageUpdates.forEach((update: any) => {
            this.invalidateMessageCache(profileId, update.chatId);
          });
        }
        
        if (chatUpdates.length > 0) {
          this.invalidateChatCache(profileId);
        }
      }
      
      this.lastSyncTimestamp = Date.now();
      return response;
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error in incremental sync:', error);
      }
      throw error;
    }
  }

  // Método para verificar sincronização de mensagens
  public async checkMessageSync(
    profileId: string, 
    chatId: string, 
    lastMessageId?: string, 
    lastMessageTimestamp?: number,
    messageCount?: number
  ): Promise<{
    needsSync: boolean;
    syncData: {
      totalMessages: number;
      lastMessageId: string | null;
      lastMessageTimestamp: number | null;
      lastMessageText: string;
      lastMessageType: string;
      syncReason: string | null;
    };
  }> {
    try {
      const url = `${this.apiUrl}/api/whatsapp/profiles/${profileId}/chats/${chatId}/sync-check`;
      const params = new URLSearchParams();
      
      if (lastMessageId) params.append('lastMessageId', lastMessageId);
      if (lastMessageTimestamp) params.append('lastMessageTimestamp', lastMessageTimestamp.toString());
      if (messageCount) params.append('messageCount', messageCount.toString());

      const response = await this.makeRequest<{
        needsSync: boolean;
        syncData: {
          totalMessages: number;
          lastMessageId: string | null;
          lastMessageTimestamp: number | null;
          lastMessageText: string;
          lastMessageType: string;
          syncReason: string | null;
        };
      }>(`${url}?${params.toString()}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Sync check result:', response);
      }
      
      // Verificação adicional: se o backend não detectou problema mas há inconsistência
      if (!response.needsSync && messageCount && response.syncData.totalMessages !== messageCount) {
        console.log('⚠️ Frontend detectou inconsistência que o backend não viu');
        return {
          needsSync: true,
          syncData: {
            ...response.syncData,
            syncReason: 'frontend_detected_mismatch'
          }
        };
      }
      
      return response;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error checking message sync:', error);
      }
      
      // Em caso de erro, assumir que precisa sincronizar
      return {
        needsSync: true,
        syncData: {
          totalMessages: 0,
          lastMessageId: null,
          lastMessageTimestamp: null,
          lastMessageText: '',
          lastMessageType: '',
          syncReason: 'error_checking_sync'
        }
      };
    }
  }

  // Método para forçar sincronização imediata
  public async forceImmediateSync(profileId: string, chatId: string): Promise<void> {
    try {
      console.log('🚀 Forçando sincronização imediata para:', profileId, chatId);
      
      // Invalidar todos os caches relacionados
      this.invalidateMessageCache(profileId, chatId);
      this.invalidateChatCache(profileId);
      
      // Forçar atualização do chat ativo
      this.setActiveChat(chatId);
      
      // Emitir evento de sincronização forçada
      this.emit('force_sync', { profileId, chatId });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Sincronização imediata forçada');
      }
    } catch (error) {
      console.error('❌ Erro ao forçar sincronização:', error);
    }
  }
}

export const whatsappSync = new WhatsAppSyncService();