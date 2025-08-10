'use client';

import { useState, useRef, useEffect } from 'react';

interface MessageOptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  messageId: string;
  onReact: (reaction: string) => void;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onDelete: () => void;
  isSent: boolean;
  menuPosition?: 'above' | 'below' | 'centered' | 'header-dropdown';
}

const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function MessageOptionsMenu({
  isOpen,
  onClose,
  position,
  messageId,
  onReact,
  onReply,
  onForward,
  onCopy,
  onDelete,
  isSent,
  menuPosition = 'above'
}: MessageOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showReactions, setShowReactions] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close menu with ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleReactionClick = (reaction: string) => {
    onReact(reaction);
    setShowReactions(false);
    onClose();
  };

  const handleReply = () => {
    onReply();
    onClose();
  };

  const handleForward = () => {
    onForward();
    onClose();
  };

  const handleCopy = () => {
    onCopy();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="message-menu-backdrop"
        onClick={onClose}
      />
      
      {/* Main menu */}
      <div
        ref={menuRef}
        className={`message-options-menu menu-${menuPosition}`}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Header with close button */}
        <div className="menu-header">
          <span className="menu-title">Message Actions</span>
          <button 
            className="menu-close-btn"
            onClick={onClose}
            title="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Reactions */}
        <div className="menu-section">
          <div className="menu-item reactions-container">
            <div className="reactions-grid">
              {reactions.map((reaction, index) => (
                <button
                  key={index}
                  className="reaction-btn"
                  onClick={() => handleReactionClick(reaction)}
                  title={`React with ${reaction}`}
                >
                  <span className="reaction-emoji">{reaction}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main actions */}
        <div className="menu-section">
          <button className="menu-item" onClick={handleReply}>
            <div className="menu-item-icon reply-icon">
              <i className="fas fa-reply"></i>
            </div>
            <span className="menu-item-text">Reply</span>
          </button>

          <button className="menu-item" onClick={handleForward}>
            <div className="menu-item-icon forward-icon">
              <i className="fas fa-share"></i>
            </div>
            <span className="menu-item-text">Forward</span>
          </button>

          <button className="menu-item" onClick={handleCopy}>
            <div className="menu-item-icon copy-icon">
              <i className="fas fa-copy"></i>
            </div>
            <span className="menu-item-text">Copy</span>
          </button>

          {isSent && (
            <button className="menu-item" onClick={handleDelete}>
              <div className="menu-item-icon delete-icon">
                <i className="fas fa-trash"></i>
              </div>
              <span className="menu-item-text">Delete</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
} 