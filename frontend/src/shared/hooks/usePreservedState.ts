import { useRef, useCallback, useMemo } from 'react';

interface PreservedStateOptions {
  maxSize?: number;
  persistToStorage?: boolean;
  storageKey?: string;
}

export const usePreservedState = <T>(initialValue: T, options: PreservedStateOptions = {}) => {
  const {
    maxSize = 100,
    persistToStorage = false,
    storageKey = 'preserved-state'
  } = options;

  const stateRef = useRef<T>(initialValue);
  const historyRef = useRef<T[]>([]);
  const isUpdatingRef = useRef(false);

  // Carregar estado do storage se habilitado
  const loadFromStorage = useCallback(() => {
    if (!persistToStorage || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        stateRef.current = parsed;
        return parsed;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error loading preserved state from storage:', error);
      }
    }
  }, [persistToStorage, storageKey]);

  // Salvar estado no storage se habilitado
  const saveToStorage = useCallback((value: T) => {
    if (!persistToStorage || typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error saving preserved state to storage:', error);
      }
    }
  }, [persistToStorage, storageKey]);

  // Carregar estado inicial do storage
  useMemo(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Função para atualizar estado preservando histórico
  const updateState = useCallback((newValue: T | ((prev: T) => T)) => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    try {
      const currentValue = stateRef.current;
      const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(currentValue) : newValue;

      // Adicionar ao histórico
      historyRef.current.push(currentValue);
      
      // Limitar tamanho do histórico
      if (historyRef.current.length > maxSize) {
        historyRef.current = historyRef.current.slice(-maxSize);
      }

      // Atualizar estado atual
      stateRef.current = nextValue;

      // Salvar no storage se habilitado
      saveToStorage(nextValue);

      return nextValue;
    } finally {
      isUpdatingRef.current = false;
    }
  }, [maxSize, saveToStorage]);

  // Função para obter estado atual
  const getState = useCallback(() => {
    return stateRef.current;
  }, []);

  // Função para reverter para estado anterior
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return stateRef.current;

    const previousState = historyRef.current.pop()!;
    stateRef.current = previousState;
    saveToStorage(previousState);
    return previousState;
  }, [saveToStorage]);

  // Função para limpar histórico
  const clearHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  // Função para obter histórico
  const getHistory = useCallback(() => {
    return [...historyRef.current];
  }, []);

  // Função para restaurar estado específico
  const restoreState = useCallback((state: T) => {
    stateRef.current = state;
    saveToStorage(state);
    return state;
  }, [saveToStorage]);

  // Função para verificar se há mudanças
  const hasChanges = useCallback(() => {
    return historyRef.current.length > 0;
  }, []);

  // Função para obter estatísticas
  const getStats = useCallback(() => ({
    currentState: stateRef.current,
    historyLength: historyRef.current.length,
    maxSize,
    isUpdating: isUpdatingRef.current,
    persistToStorage
  }), [maxSize, persistToStorage]);

  return {
    getState,
    updateState,
    undo,
    clearHistory,
    getHistory,
    restoreState,
    hasChanges,
    getStats
  };
};

// Hook especializado para preservar estado de mensagens
export const usePreservedMessages = (initialMessages: any[] = []) => {
  const preservedState = usePreservedState(initialMessages, {
    maxSize: 50,
    persistToStorage: true,
    storageKey: 'whatsapp-messages-state'
  });

  // Função para adicionar mensagem preservando estado
  const addMessage = useCallback((message: any) => {
    preservedState.updateState(prev => [...prev, message]);
  }, [preservedState]);

  // Função para atualizar mensagem específica
  const updateMessage = useCallback((messageId: string, updates: any) => {
    preservedState.updateState(prev => 
      prev.map(msg => msg.id === messageId ? { ...msg, ...updates } : msg)
    );
  }, [preservedState]);

  // Função para remover mensagem
  const removeMessage = useCallback((messageId: string) => {
    preservedState.updateState(prev => 
      prev.filter(msg => msg.id !== messageId)
    );
  }, [preservedState]);

  // Função para limpar mensagens
  const clearMessages = useCallback(() => {
    preservedState.updateState([]);
  }, [preservedState]);

  // Função para obter mensagens por chat
  const getMessagesByChat = useCallback((chatId: string) => {
    const messages = preservedState.getState();
    return messages.filter(msg => msg.chatId === chatId);
  }, [preservedState]);

  return {
    ...preservedState,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    getMessagesByChat
  };
};

// Hook especializado para preservar estado de chats
export const usePreservedChats = (initialChats: any[] = []) => {
  const preservedState = usePreservedState(initialChats, {
    maxSize: 20,
    persistToStorage: true,
    storageKey: 'whatsapp-chats-state'
  });

  // Função para adicionar chat
  const addChat = useCallback((chat: any) => {
    preservedState.updateState(prev => [...prev, chat]);
  }, [preservedState]);

  // Função para atualizar chat específico
  const updateChat = useCallback((chatId: string, updates: any) => {
    preservedState.updateState(prev => 
      prev.map(chat => chat.id === chatId ? { ...chat, ...updates } : chat)
    );
  }, [preservedState]);

  // Função para remover chat
  const removeChat = useCallback((chatId: string) => {
    preservedState.updateState(prev => 
      prev.filter(chat => chat.id !== chatId)
    );
  }, [preservedState]);

  // Função para obter chat por ID
  const getChatById = useCallback((chatId: string) => {
    const chats = preservedState.getState();
    return chats.find(chat => chat.id === chatId);
  }, [preservedState]);

  return {
    ...preservedState,
    addChat,
    updateChat,
    removeChat,
    getChatById
  };
};

export default usePreservedState; 