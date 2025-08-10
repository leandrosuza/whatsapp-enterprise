import { useState, useEffect, useCallback } from 'react';
import { WhatsAppChat, WhatsAppMessage } from '../types/whatsapp';

interface UseWhatsAppChatSharedReturn {
  chats: WhatsAppChat[];
  selectedChat: WhatsAppChat | null;
  setSelectedChat: (chat: WhatsAppChat | null) => void;
  isLoading: boolean;
  error: string | null;
  refreshChats: () => void;
  sendMessage: (chatId: string, text: string) => void;
  markAsRead: (chatId: string) => void;
  typingStatus: { [chatId: string]: boolean };
  setTypingStatus: (chatId: string, isTyping: boolean) => void;
}

export const useWhatsAppChatShared = (profileId: string): UseWhatsAppChatSharedReturn => {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingStatus, setTypingStatusState] = useState<{ [chatId: string]: boolean }>({});

  // Função para buscar chats do perfil
  const fetchChats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Se não há profileId, não fazer a requisição
      if (!profileId || profileId.trim() === '') {
        setError('ID do perfil não especificado');
        setIsLoading(false);
        return;
      }
      
      console.log(`🔍 Fetching chats for profile: ${profileId}`);
      
      const response = await fetch(`/api/whatsapp/profiles/${profileId}/chats`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ao buscar chats: ${response.status}`;
        
        if (response.status === 404) {
          throw new Error('Perfil não encontrado. Verifique se o link de compartilhamento está correto.');
        } else if (response.status === 400) {
          throw new Error(errorMessage || 'Perfil não está conectado ao WhatsApp.');
        } else {
          throw new Error(errorMessage || 'Erro ao carregar conversas');
        }
      }
      
      const data = await response.json();
      console.log(`📥 Response data:`, data);
      
      if (data.success && data.chats) {
        setChats(data.chats);
        
        // Selecionar o primeiro chat se não houver nenhum selecionado
        if (!selectedChat && data.chats.length > 0) {
          setSelectedChat(data.chats[0]);
        }
      } else {
        console.error('❌ Invalid response format:', data);
        throw new Error('Dados inválidos recebidos do servidor');
      }
    } catch (err) {
      console.error('Erro ao buscar chats:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [profileId, selectedChat]);

  // Função para enviar mensagem
  const sendMessage = useCallback(async (chatId: string, text: string) => {
    try {
      const response = await fetch(`/api/whatsapp/profiles/${profileId}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar mensagem: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Atualizar a mensagem no chat selecionado
        if (selectedChat && selectedChat.id === chatId) {
          setSelectedChat(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [...prev.messages, data.message],
              lastMessage: data.message
            };
          });
        }
        
        // Atualizar a lista de chats
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              lastMessage: data.message
            };
          }
          return chat;
        }));
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    }
  }, [profileId, selectedChat]);

  // Função para marcar como lido
  const markAsRead = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/profiles/${profileId}/chats/${chatId}/read`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Erro ao marcar como lido: ${response.status}`);
      }

      // Atualizar o status das mensagens no chat
      if (selectedChat && selectedChat.id === chatId) {
        setSelectedChat(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map(msg => ({
              ...msg,
              isRead: true
            }))
          };
        });
      }
    } catch (err) {
      console.error('Erro ao marcar como lido:', err);
    }
  }, [profileId, selectedChat]);

  // Função para definir status de digitação
  const setTypingStatus = useCallback((chatId: string, isTyping: boolean) => {
    setTypingStatusState(prev => ({
      ...prev,
      [chatId]: isTyping
    }));
  }, []);

  // Função para atualizar chats
  const refreshChats = useCallback(() => {
    fetchChats();
  }, [fetchChats]);

  // Carregar chats na inicialização
  useEffect(() => {
    if (profileId && profileId.trim() !== '') {
      fetchChats();
    }
  }, [fetchChats, profileId]);

  // Atualizar chats periodicamente (a cada 5 segundos para máxima velocidade)
  useEffect(() => {
    if (!profileId || profileId.trim() === '') {
      return;
    }
    
    const interval = setInterval(() => {
      fetchChats();
    }, 5000); // Reduzido de 30 segundos para 5 segundos

    return () => clearInterval(interval);
  }, [fetchChats, profileId]);

  return {
    chats,
    selectedChat,
    setSelectedChat,
    isLoading,
    error,
    refreshChats,
    sendMessage,
    markAsRead,
    typingStatus,
    setTypingStatus,
  };
}; 