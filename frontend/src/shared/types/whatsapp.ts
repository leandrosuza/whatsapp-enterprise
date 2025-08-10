export interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  avatar?: string;
  lastMessage?: string;
  lastTime?: string;
  unreadCount: number;
  isOnline: boolean;
  isTyping?: boolean;
  status: 'sent' | 'delivered' | 'read' | 'none';
  isGroup: boolean;
  participants?: string[];
}

export interface WhatsAppMessage {
  id: string;
  chatId: string;
  text: string;
  time: Date;
  isSent: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'voice' | 'file' | 'location' | 'contact';
  mediaUrl?: string;
  mediaCaption?: string;
  quotedMessage?: WhatsAppMessage;
  mentions?: string[];
  replyTo?: string;
  // New properties for better processing
  isGroup?: boolean;
  sender?: string;
  isTemp?: boolean; // Indicates if it's a temporary message
}

export interface WhatsAppChat {
  id: string;
  contact: WhatsAppContact;
  messages: WhatsAppMessage[];
  unreadCount: number;
  lastActivity: Date;
  isPinned: boolean;
  isArchived: boolean;
}

export interface WhatsAppProfile {
  id: string;
  name: string;
  number: string;
  avatar?: string;
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  chats: WhatsAppChat[];
  lastSeen?: Date;
}

export interface SyncMessage {
  type: 'message' | 'contact' | 'status' | 'typing' | 'read';
  data: any;
  timestamp: Date | string | number; // Can be Date, string (ISO), or number (timestamp)
  profileId: string;
}

export interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
} 