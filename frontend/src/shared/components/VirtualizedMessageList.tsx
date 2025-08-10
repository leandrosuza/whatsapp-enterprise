'use client';

import React, { useCallback, useMemo } from 'react';
import { WhatsAppMessage } from '../types/whatsapp';

interface VirtualizedMessageListProps {
  messages: WhatsAppMessage[];
  height: number;
  itemSize: number;
  onMessageClick?: (message: WhatsAppMessage) => void;
  onMessageOptionsClick?: (event: React.MouseEvent, message: WhatsAppMessage) => void;
  formatTime: (date: Date | string | null | undefined) => string;
  MessageStatusIndicator?: React.ComponentType<{ status: string; isSent: boolean }>;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: WhatsAppMessage[];
    onMessageClick?: (message: WhatsAppMessage) => void;
    onMessageOptionsClick?: (event: React.MouseEvent, message: WhatsAppMessage) => void;
    formatTime: (date: Date | string | null | undefined) => string;
    MessageStatusIndicator?: React.ComponentType<{ status: string; isSent: boolean }>;
  };
}

const Row: React.FC<RowProps> = React.memo(({ index, style, data }) => {
  const { messages, onMessageClick, onMessageOptionsClick, formatTime, MessageStatusIndicator } = data;
  const message = messages[index];

  if (!message) return null;

  const handleClick = useCallback(() => {
    onMessageClick?.(message);
  }, [message, onMessageClick]);

  const handleOptionsClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onMessageOptionsClick?.(event, message);
  }, [message, onMessageOptionsClick]);

  return (
    <div style={style}>
      <div
        className={`flex ${message.isSent ? 'justify-end' : 'justify-start'} group mb-2`}
        onClick={handleClick}
      >
        <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl shadow-md relative ${
          message.isSent 
            ? 'bg-[#dcf8c6] text-gray-800 border border-[#b8e6b8]' 
            : 'bg-white text-gray-800 border border-gray-100'
        } hover:shadow-lg transition-all duration-200`}>
          <div className="flex items-start space-x-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed break-words">{message.text}</p>
              <div className="flex items-center justify-end mt-2 space-x-2">
                <span className="text-xs text-gray-500 font-medium">
                  {formatTime(message.time)}
                </span>
                {message.isSent && MessageStatusIndicator && (
                  <MessageStatusIndicator status={message.status} isSent={message.isSent} />
                )}
              </div>
            </div>
            {onMessageOptionsClick && (
              <button
                onClick={handleOptionsClick}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-black hover:bg-opacity-10 rounded-full transition-all duration-200 flex-shrink-0"
              >
                <i className="fas fa-ellipsis-v text-xs"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

Row.displayName = 'Row';

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  height,
  itemSize,
  onMessageClick,
  onMessageOptionsClick,
  formatTime,
  MessageStatusIndicator
}) => {
  const itemData = useMemo(() => ({
    messages,
    onMessageClick,
    onMessageOptionsClick,
    formatTime,
    MessageStatusIndicator
  }), [messages, onMessageClick, onMessageOptionsClick, formatTime, MessageStatusIndicator]);

  const renderRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <Row index={index} style={style} data={itemData} />
  ), [itemData]);

  // If there aren't many messages, render normally
  if (messages.length < 100) {
    return (
      <div style={{ height }}>
        {messages.map((message, index) => (
          <Row
            key={message.id || index}
            index={index}
            style={{ height: itemSize }}
            data={itemData}
          />
        ))}
      </div>
    );
  }

  // For large lists, use virtualization
  return (
    <div style={{ height }}>
      {/* Implementar virtualização real aqui quando necessário */}
      {messages.map((message, index) => (
        <Row
          key={message.id || index}
          index={index}
          style={{ height: itemSize }}
          data={itemData}
        />
      ))}
    </div>
  );
};

export default VirtualizedMessageList; 