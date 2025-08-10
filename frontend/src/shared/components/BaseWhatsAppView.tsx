'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WhatsAppChat, WhatsAppMessage } from '../types/whatsapp';
import { whatsappSync } from '../services/whatsappSync';

import ProfileStatusIndicator from './ProfileStatusIndicator';
import MessageStatusIndicator from './MessageStatusIndicator';
import MessageOptionsMenu from './MessageOptionsMenu';

interface BaseWhatsAppViewProps {
  profileId: string;
  profileName?: string;
  contactNumber?: string;
  isShared?: boolean;
  instanceId?: string;
  onBack?: () => void;
  canGoBack?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function BaseWhatsAppView({
  profileId,
  profileName = 'WhatsApp Profile',
  contactNumber,
  isShared = false,
  instanceId = 'default',
  onBack,
  canGoBack = false,
  className = '',
  children
}: BaseWhatsAppViewProps) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // State for message options menu
  const [messageMenuState, setMessageMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    messageId: string;
    message: WhatsAppMessage | null;
    menuPosition: 'above' | 'below' | 'centered' | 'header-dropdown';
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    messageId: '',
    message: null,
    menuPosition: 'above'
  });
  
  // State for visual notifications of new messages
  const [newMessageNotifications, setNewMessageNotifications] = useState<Set<string>>(new Set());

  // State for message pagination in conversation - OPTIMIZED
  const [displayedMessages, setDisplayedMessages] = useState<WhatsAppMessage[]>([]);
  const [messagePage, setMessagePage] = useState(1);
  const MESSAGES_PER_PAGE = 50; // Increased from 30 to 50 for better performance
  const [scrollPosition, setScrollPosition] = useState(0);
  const [shouldPreserveScroll, setShouldPreserveScroll] = useState(false);

  // Debug only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 BaseWhatsAppView [${instanceId}] - Profile Info:`, {
        profileId,
        profileName,
        contactNumber,
        isShared
      });
    }
  }, [profileId, profileName, contactNumber, isShared, instanceId]);

  // Auto-resize textarea optimized
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // Limit maximum height
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [messageText]);

  // Scroll to end of messages optimized
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Preserve scroll position optimized
  const preserveScrollPosition = useCallback(() => {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      setScrollPosition(chatContainer.scrollTop);
      setShouldPreserveScroll(true);
    }
  }, []);

  // Optimized scroll handler with debounce
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    // Detect if near top to load more messages
    if (scrollTop < 100) {
      // Implement loading of old messages here if necessary
    }
    
    // Preserve scroll position
    setScrollPosition(scrollTop);
  }, []);

  // Optimized global message update handler
  const handleGlobalMessageUpdate = useCallback((event: CustomEvent) => {
    const { chatId, message, isCurrentChat } = event.detail;
    
    if (isCurrentChat) {
      // Add visual notification for new message
      setNewMessageNotifications(prev => new Set([...prev, message.id]));
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        setNewMessageNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(message.id);
          return newSet;
        });
      }, 3000);
      
      // Scroll to end if close
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        if (isNearBottom) {
          scrollToBottom();
        }
      }
    }
  }, [scrollToBottom]);

  // Setup event listeners otimizado
  useEffect(() => {
    window.addEventListener('newMessageReceived', handleGlobalMessageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('newMessageReceived', handleGlobalMessageUpdate as EventListener);
    };
  }, [handleGlobalMessageUpdate]);

  // Enviar mensagem otimizado
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) return;
    
    try {
      // Implementar envio de mensagem aqui
      setMessageText('');
      
      // Scroll para o final após enviar
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending message:', error);
      }
    }
  }, [messageText, scrollToBottom]);

  // Handler de teclas otimizado
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Handler de digitação otimizado
  const handleTyping = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    
    // Debounce para indicador de digitação
    if (!isTyping) {
      setIsTyping(true);
      // Implementar envio de indicador de digitação aqui
    }
    
    // Limpar indicador de digitação após 2 segundos
    setTimeout(() => setIsTyping(false), 2000);
  }, [isTyping]);

  // Menu de opções de mensagem otimizado
  const handleMessageOptionsClick = useCallback((event: React.MouseEvent, message: WhatsAppMessage) => {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const menuPosition = rect.top > window.innerHeight / 2 ? 'above' : 'below';
    
    setMessageMenuState({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      messageId: message.id,
      message,
      menuPosition
    });
  }, []);

  const closeMessageMenu = useCallback(() => {
    setMessageMenuState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Funções de formatação otimizadas com memoização
  const formatTime = useCallback((date: Date | string | null | undefined) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  const formatDateSeparator = useCallback((date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateObj.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return dateObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }, []);

  // Agrupar mensagens por data otimizado
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: WhatsAppMessage[] } = {};
    
    displayedMessages.forEach(message => {
      const date = new Date(message.time);
      const dateKey = date.toDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups).map(([dateKey, messages]) => ({
      date: new Date(dateKey),
      messages: messages.sort((a, b) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
      )
    }));
  }, [displayedMessages]);

  return (
    <div className={`whatsapp-view ${className}`}>
      {/* Header */}
      <div className="chat-header">
        {canGoBack && onBack && (
          <button onClick={onBack} className="back-button">
            ← Voltar
          </button>
        )}
        <div className="chat-info">
          <h3>{profileName}</h3>
          <ProfileStatusIndicator status="connected" showLabel={true} />
        </div>
      </div>

      {/* Messages Container */}
      <div className="chat-messages" onScroll={handleScroll}>
        {groupedMessages.map(({ date, messages }) => (
          <div key={date.toDateString()} className="message-group">
            <div className="date-separator">
              {formatDateSeparator(date)}
            </div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.isSent ? 'sent' : 'received'} ${
                  newMessageNotifications.has(message.id) ? 'new-message' : ''
                }`}
              >
                <div className="message-content">
                  <div className="message-text">{message.text}</div>
                  <div className="message-meta">
                    <span className="message-time">{formatTime(message.time)}</span>
                    {message.isSent && (
                      <MessageStatusIndicator status={message.status} isSent={message.isSent} />
                    )}
                  </div>
                </div>
                <button
                  className="message-options"
                  onClick={(e) => handleMessageOptionsClick(e, message)}
                >
                  ⋮
                </button>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        <textarea
          ref={textareaRef}
          value={messageText}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          placeholder="Digite uma mensagem..."
          className="message-input"
          rows={1}
        />
        <button onClick={handleSendMessage} className="send-button">
          Enviar
        </button>
      </div>

      {/* Message Options Menu */}
      {messageMenuState.isOpen && (
        <MessageOptionsMenu
          isOpen={messageMenuState.isOpen}
          position={messageMenuState.position}
          messageId={messageMenuState.message?.id || ''}
          onClose={closeMessageMenu}
          onReact={() => {}}
          onReply={() => {}}
          onForward={() => {}}
          onCopy={() => {}}
          onDelete={() => {}}
          isSent={messageMenuState.message?.isSent || false}
          menuPosition={messageMenuState.menuPosition}
        />
      )}

      {/* Children for additional content */}
      {children}
    </div>
  );
} 