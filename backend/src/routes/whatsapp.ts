import { Router } from 'express';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import WhatsAppProfile from '../models/WhatsAppProfile';
import { messageRateLimiter, chatRateLimiter, syncRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Use global maps for active WhatsApp clients
declare global {
  var activeClients: Map<string, any>;
  var clientData: Map<string, {
    profileName: string;
    phoneNumber?: string;
    status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'qr_ready';
    qrCode?: string;
    profileId?: number;
  }>;
}

// Initialize global maps if they don't exist
if (!global.activeClients) {
  global.activeClients = new Map();
}
if (!global.clientData) {
  global.clientData = new Map();
}

const activeClients = global.activeClients;
const clientData = global.clientData;

// Ensure sessions directory exists
const sessionsDir = path.join(__dirname, '../../sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

router.post('/connect', async (req, res) => {
  try {
    console.log('WhatsApp connect request received:', req.body);
    const { profileName, userId = 1 } = req.body; // Default to user 1 for now

    if (!profileName) {
      console.log('Profile name is missing');
      return res.status(400).json({ error: 'Profile name is required' });
    }

    console.log('Profile name is valid:', profileName);

    const clientId = uuidv4();
    console.log('Generated client ID:', clientId);
    
    const sessionPath = path.join(sessionsDir, clientId);
    console.log('Session path:', sessionPath);
    console.log('Current directory:', __dirname);
    console.log('Sessions directory:', sessionsDir);
    console.log('Sessions directory exists:', fs.existsSync(sessionsDir));
    
    // Create profile in database first with default status
    console.log('About to create profile in database...');
    let profile;
    try {
      profile = await WhatsAppProfile.create({
        userId,
        name: profileName,
        clientId,
        sessionPath
        // status will default to 'disconnected' as defined in the model
      });

      console.log('Profile created in database:', profile.id);
    } catch (error) {
      console.error('Error creating profile in database:', error);
      return res.status(500).json({ error: 'Failed to create profile in database', details: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Store client data with initial status
    console.log('Storing client data...');
    clientData.set(clientId, {
      profileName,
      status: 'disconnected',
      profileId: profile.id
    });

    // Update profile status to connecting before initializing client
    console.log('Updating profile status to connecting...');
    await profile.update({ status: 'connecting' });
    
    // Update client data status
    const clientInfo = clientData.get(clientId);
    if (clientInfo) {
      clientInfo.status = 'connecting';
      clientData.set(clientId, clientInfo);
    }

    // Create WhatsApp client
    console.log('Creating WhatsApp client with minimal config...');
    const client = new Client({
      authStrategy: new LocalAuth({ clientId }),
      puppeteer: {
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1200,800'
        ]
      }
    });

    // Store client instance
    activeClients.set(clientId, client);

    // Handle browser launch
    client.on('loading_screen', (percent, message) => {
      console.log(`WhatsApp loading: ${percent}% - ${message}`);
    });

    // Handle client errors
    client.on('error', async (error) => {
      console.error(`WhatsApp client error for ${clientId}:`, error);
      
      // Update profile status to error
      const profile = await WhatsAppProfile.findByClientId(clientId);
      if (profile) {
        await profile.markError();
      }
      
      const clientInfo = clientData.get(clientId);
      if (clientInfo) {
        clientInfo.status = 'error';
        clientData.set(clientId, clientInfo);
      }
    });

    // Handle QR code generation
    client.on('qr', async (qr) => {
      try {
        console.log('QR code generated for client:', clientId);
        const qrCodeDataUrl = await qrcode.toDataURL(qr);
        const clientInfo = clientData.get(clientId);
        if (clientInfo) {
          clientInfo.qrCode = qrCodeDataUrl;
          clientInfo.status = 'qr_ready';
          clientData.set(clientId, clientInfo);
          console.log('QR code stored for client:', clientId);
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    });

    // Handle ready event
    client.on('ready', async () => {
      console.log(`✅ WhatsApp client ${clientId} is ready and connected!`, {
        phoneNumber: client.info?.wid?.user,
        info: client.info
      });
      
      // Test if client can receive messages by logging all events
      console.log(`🧪 Testing client ${clientId} - all event listeners should be active`);
      
      // Update profile in database
      const profile = await WhatsAppProfile.findByClientId(clientId);
      if (profile) {
        await profile.markConnected(client.info.wid.user);
        
        // Try to get profile picture
        try {
          console.log('Attempting to get profile picture for:', client.info.wid.user);
          const profilePicture = await client.getProfilePicUrl(client.info.wid._serialized);
          if (profilePicture) {
            console.log('Profile picture URL obtained:', profilePicture);
            await profile.updateProfilePhoto(profilePicture);
          }
        } catch (error) {
          console.log('Could not get profile picture, will use initials:', error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      const clientInfo = clientData.get(clientId);
      if (clientInfo) {
        clientInfo.status = 'connected';
        clientInfo.phoneNumber = client.info.wid.user;
        clientData.set(clientId, clientInfo);
      }
    });

    // Handle incoming messages with robust error handling
    console.log(`🔧 Registering message event listener for client ${clientId}`);
    
    client.on('message', async (message) => {
      try {
        // Log reduzido para melhor performance
        console.log('📨 Message received:', message.body?.substring(0, 30));
        
        // Get profile from database to ensure we have the latest data
        const currentProfile = await WhatsAppProfile.findByClientId(clientId);
        
        if (!currentProfile?.id) {
          console.error('❌ No profile found for client:', clientId);
          return;
        }
        
        // Prepare message data with proper validation and preview info
        const messageData = {
          type: 'message',
          data: {
            id: message.id._serialized,
            chatId: message.from,
            text: message.body || '',
            time: new Date(message.timestamp * 1000),
            isSent: message.fromMe || false,
            status: 'sent',
            type: message.type || 'text',
            // Adicionar informações extras para melhor processamento
            isGroup: message.from.includes('@g.us'),
            sender: message.fromMe ? currentProfile.phoneNumber : message.from,
            mediaUrl: message.hasMedia ? await message.downloadMedia().then(media => media.data) : undefined,
            // Informações de preview para otimização
            preview: message.body ? message.body.substring(0, 50) + (message.body.length > 50 ? '...' : '') : '',
            timestamp: message.timestamp * 1000,
            // Informações do chat para atualização da lista
            chatInfo: {
              lastMessage: message.body || '',
              lastMessageTime: new Date(message.timestamp * 1000),
              unreadCount: message.fromMe ? 0 : 1 // Incrementar apenas se não for nossa mensagem
            }
          },
          timestamp: new Date(),
          profileId: currentProfile.id
        };
        
        // Validate message data before emitting
        if (!messageData.data.id || !messageData.data.chatId) {
          console.error('❌ Invalid message data:', messageData);
          return;
        }
        
        // Emit to connected clients via WebSocket - OTIMIZADO
        if (global.io) {
          const roomName = `whatsapp-${currentProfile.id}`;
          
          // Emit immediately without excessive logging
          global.io.to(roomName).emit('whatsapp_message', messageData);
        } else {
          console.error('❌ WebSocket not available for message emission');
        }
      } catch (error) {
        console.error('❌ Error processing incoming message:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          clientId,
          messageId: message.id._serialized
        });
      }
    });

    // Handle message status updates with robust error handling
    client.on('message_ack', async (message, ack) => {
      try {
        console.log('📊 Message status updated:', {
          messageId: message.id._serialized,
          ack: ack,
          clientId: clientId,
          status: ack === 1 ? 'sent' : ack === 2 ? 'delivered' : ack === 3 ? 'read' : 'pending'
        });
        
        const currentProfile = await WhatsAppProfile.findByClientId(clientId);
        
        if (!currentProfile?.id) {
          console.error('❌ No profile found for status update:', clientId);
          return;
        }
        
        const statusData = {
          type: 'status',
          data: {
            messageId: message.id._serialized,
            chatId: message.from,
            status: ack === 1 ? 'sent' : ack === 2 ? 'delivered' : ack === 3 ? 'read' : 'pending',
            ack: ack,
            timestamp: new Date()
          },
          timestamp: new Date(),
          profileId: currentProfile.id
        };
        
        if (global.io) {
          const roomName = `whatsapp-${currentProfile.id}`;
          global.io.to(roomName).emit('whatsapp_status', statusData);
          console.log('✅ Status update emitted successfully:', statusData.data);
        } else {
          console.error('❌ WebSocket not available for status update');
        }
      } catch (error) {
        console.error('❌ Error processing message status update:', error);
      }
    });

    // Handle typing indicators and state changes with robust error handling
    client.on('change_state', async (state) => {
      try {
        console.log('⌨️ State changed:', {
          state: state,
          clientId: clientId
        });
        
        const currentProfile = await WhatsAppProfile.findByClientId(clientId);
        
        if (!currentProfile?.id) {
          console.error('❌ No profile found for state change:', clientId);
          return;
        }
        
        const stateData = {
          type: 'state',
          data: {
            state: state,
            timestamp: new Date()
          },
          timestamp: new Date(),
          profileId: currentProfile.id
        };
        
        if (global.io) {
          const roomName = `whatsapp-${currentProfile.id}`;
          global.io.to(roomName).emit('whatsapp_state', stateData);
          console.log('✅ State change emitted successfully:', stateData.data);
        } else {
          console.error('❌ WebSocket not available for state change');
        }
      } catch (error) {
        console.error('❌ Error processing state change:', error);
      }
    });

    // Handle authentication failure
    client.on('auth_failure', async (msg) => {
      console.error(`❌ WhatsApp auth failure for ${clientId}:`, msg);
      
      // Update profile status to error
      const profile = await WhatsAppProfile.findByClientId(clientId);
      if (profile) {
        await profile.markError();
      }
      
      const clientInfo = clientData.get(clientId);
      if (clientInfo) {
        clientInfo.status = 'error';
        clientData.set(clientId, clientInfo);
      }
    });

    // Handle disconnection
    client.on('disconnected', async (reason) => {
      console.log(`WhatsApp client ${clientId} disconnected:`, reason);
      
      // Update profile status
      const profile = await WhatsAppProfile.findByClientId(clientId);
      if (profile) {
        await profile.markDisconnected();
      }
      
      const clientInfo = clientData.get(clientId);
      if (clientInfo) {
        clientInfo.status = 'disconnected';
        clientData.set(clientId, clientInfo);
      }
      activeClients.delete(clientId);
    });

    // Initialize client
    console.log('Initializing WhatsApp client:', clientId);
    try {
      console.log('About to call client.initialize()...');
      
      // Add timeout to prevent hanging
      const initializePromise = client.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout after 30 seconds')), 30000);
      });
      
      await Promise.race([initializePromise, timeoutPromise]);
      console.log('WhatsApp client initialized successfully:', clientId);
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      
      // Update profile status to error
      const profile = await WhatsAppProfile.findByClientId(clientId);
      if (profile) {
        await profile.markError();
      }
      
      throw error;
    }

    // Return client ID and initial status
    return res.json({
      clientId,
      profileId: profile.id,
      status: 'connecting',
      message: 'WhatsApp client initialized. QR code will be generated shortly.'
    });

  } catch (error) {
    console.error('Error in connect route:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return res.status(500).json({ error: 'Failed to initialize WhatsApp client', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get client status
router.get('/client/:clientId/status', async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log('🔍 Status request for client:', clientId);
    
    const client = activeClients.get(clientId);
    const clientInfo = clientData.get(clientId);
    const profile = await WhatsAppProfile.findByClientId(clientId);
    
    let isActuallyConnected = false;
    let clientState = 'unknown';
    
    if (client) {
      try {
        clientState = await client.getState();
        isActuallyConnected = clientState === 'CONNECTED';
        console.log('✅ Client state:', clientState, 'Connected:', isActuallyConnected);
      } catch (error) {
        console.log('❌ Error getting client state:', error instanceof Error ? error.message : 'Unknown error');
        isActuallyConnected = false;
      }
    }
    
    return res.json({
      clientId,
      hasClient: !!client,
      clientInfo: clientInfo || null,
      profile: profile ? {
        id: profile.id,
        name: profile.name,
        status: profile.status,
        isConnected: profile.isConnected
      } : null,
      isActuallyConnected,
      clientState,
      activeClientsCount: activeClients.size,
      clientDataCount: clientData.size
    });
  } catch (error) {
    console.error('Error getting client status:', error);
    return res.status(500).json({ error: 'Failed to get client status' });
  }
});

// Get QR code for a client
router.get('/qr/:clientId', (req, res) => {
  const { clientId } = req.params;
  console.log('QR code request for client:', clientId);
  
  const clientInfo = clientData.get(clientId);

  if (!clientInfo) {
    console.log('Client not found:', clientId);
    return res.status(404).json({ error: 'Client not found' });
  }

  console.log('Client info:', clientInfo);

  if (clientInfo.status === 'connected') {
    console.log('Client is connected:', clientId);
    return res.json({
      status: 'connected',
      phoneNumber: clientInfo.phoneNumber,
      profileName: clientInfo.profileName,
      success: true
    });
  }

  if (clientInfo.status === 'error') {
    console.log('Client has error:', clientId);
    return res.json({
      status: 'error',
      error: 'Connection failed. Please try again.'
    });
  }

  if (clientInfo.qrCode) {
    console.log('QR code available for client:', clientId);
    return res.json({
      status: 'qr_ready',
      qrCode: clientInfo.qrCode
    });
  }

  console.log('Client still connecting:', clientId);
  return res.json({
    status: 'connecting',
    message: 'Generating QR code...'
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({ 
    message: 'WhatsApp API is working',
    timestamp: new Date().toISOString(),
    activeClients: activeClients.size,
    clientData: clientData.size
  });
});

// Check and reconnect client
router.post('/profiles/:profileId/reconnect', async (req, res) => {
  try {
    const { profileId } = req.params;
    console.log('🔄 Reconnect request for profile:', profileId);
    
    const profile = await WhatsAppProfile.findByPk(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    console.log('✅ Profile found:', {
      id: profile.id,
      clientId: profile.clientId,
      status: profile.status
    });
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    console.log('🔍 Current client status:', {
      hasClient: !!client,
      clientStatus: clientInfo?.status,
      activeClientsCount: activeClients.size,
      clientDataCount: clientData.size
    });
    
    // Test if client is actually connected
    let isActuallyConnected = false;
    
    if (client && clientInfo) {
      try {
        // Test if client is really connected by trying to get basic info
        if (client.info && client.info.wid) {
          isActuallyConnected = true;
          console.log('✅ Client is actually connected - info available');
        } else {
          console.log('⚠️ Client exists but no info available - testing connection...');
          // Try to get client state to test connection
          try {
            await client.getState();
            isActuallyConnected = true;
            console.log('✅ Client connection test successful');
          } catch (testError) {
            console.log('❌ Client connection test failed:', testError instanceof Error ? testError.message : 'Unknown error');
            isActuallyConnected = false;
          }
        }
      } catch (error) {
        console.log('❌ Error testing client connection:', error instanceof Error ? error.message : 'Unknown error');
        isActuallyConnected = false;
      }
    }
    
    console.log('🔍 Connection test result:', {
      hasClient: !!client,
      clientStatus: clientInfo?.status,
      isActuallyConnected
    });
    
    // If client exists but is not actually connected, try to reconnect
    if (client && clientInfo && !isActuallyConnected) {
      console.log('🔄 Attempting to reconnect client...');
      
      try {
        await client.initialize();
        console.log('✅ Client reconnected successfully');
        
        // Update client data
        clientData.set(profile.clientId, {
          ...clientInfo,
          status: 'connected'
        });
        
        // Update profile status
        await profile.update({ status: 'connected' });
        
        return res.json({ 
          success: true, 
          message: 'Client reconnected successfully',
          status: 'connected'
        });
      } catch (error) {
        console.error('❌ Failed to reconnect client:', error);
        
        // Update profile status to disconnected
        await profile.update({ 
          status: 'disconnected',
          isConnected: false,
          lastDisconnected: new Date()
        });
        
        return res.status(500).json({ 
          error: 'Failed to reconnect client',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // If no client exists, return error
    if (!client) {
      return res.status(400).json({ 
        error: 'No client found for this profile',
        suggestion: 'Try connecting the profile first'
      });
    }
    
    // If client is actually connected, return success
    if (isActuallyConnected) {
      return res.json({ 
        success: true, 
        message: 'Client is already connected',
        status: 'connected'
      });
    }
    
    // If we get here, something is wrong
    return res.status(400).json({ 
      error: 'Client exists but connection test failed',
      status: 'disconnected'
    });
    
  } catch (error) {
    console.error('❌ Error in reconnect endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List all profiles
router.get('/profiles', async (req, res) => {
  try {
    console.log('📋 GET /profiles - Listing all profiles');
    const profiles = await WhatsAppProfile.findAll();
    console.log('✅ Profiles found:', profiles.length);
    
    // Fix inconsistent statuses before returning
    for (const profile of profiles) {
      const clientInfo = clientData.get(profile.clientId);
      const hasActiveClient = activeClients.has(profile.clientId);
      
      // Check for inconsistencies and fix them
      if (profile.status === 'connecting' && !profile.isConnected && (!clientInfo || clientInfo.status !== 'connecting')) {
        console.log(`🔧 Fixing inconsistent status for profile ${profile.name}: connecting -> disconnected`);
        await profile.update({ status: 'disconnected' });
      } else if (profile.status === 'connected' && !profile.isConnected) {
        console.log(`🔧 Fixing inconsistent status for profile ${profile.name}: connected -> disconnected`);
        await profile.update({ status: 'disconnected' });
      }
    }
    
    // Reload profiles after fixes
    const updatedProfiles = await WhatsAppProfile.findAll();
    
    // Add debug information for each profile
    const profilesWithDebug = updatedProfiles.map(profile => {
      const clientInfo = clientData.get(profile.clientId);
      const hasActiveClient = activeClients.has(profile.clientId);
      
      console.log(`📊 Profile ${profile.name} (ID: ${profile.id}):`, {
        dbStatus: profile.status,
        dbIsConnected: profile.isConnected,
        clientDataStatus: clientInfo?.status,
        hasActiveClient,
        clientId: profile.clientId
      });
      
      return {
        ...profile.toJSON(),
        debug: {
          clientDataStatus: clientInfo?.status,
          hasActiveClient,
          clientId: profile.clientId
        }
      };
    });
    
    res.json(profilesWithDebug);
  } catch (error) {
    console.error('❌ Error listing profiles:', error);
    res.status(500).json({ error: 'Failed to list profiles' });
  }
});



// Force sync chats from WhatsApp
router.post('/profiles/:id/sync-chats', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Sync chats request for profile ID:', id);
    
    const profile = await WhatsAppProfile.findByPk(id);
    
    if (!profile) {
      console.log('❌ Profile not found:', id);
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    if (!client || !clientInfo || clientInfo.status !== 'connected') {
      console.log('❌ Client not connected for sync:', {
        profileId: id,
        hasClient: !!client,
        clientStatus: clientInfo?.status
      });
      return res.status(400).json({ error: 'Profile is not connected' });
    }
    
    console.log('📋 Fetching chats from WhatsApp...');
    const chats = await client.getChats();
    console.log('✅ Real chats fetched:', chats.length);
    
    const formattedChats = chats.map((chat: any) => {
      return {
        id: chat.id._serialized,
        contact: {
          id: chat.id._serialized,
          name: chat.name,
          number: chat.id.user,
          avatar: null, // Removido carregamento de fotos para evitar travamento
          lastMessage: chat.lastMessage?.body || '',
          lastTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString() : '',
          unreadCount: chat.unreadCount,
          isOnline: false,
          isTyping: false,
          status: 'none',
          isGroup: chat.isGroup
        },
        messages: [],
        unreadCount: chat.unreadCount,
        lastActivity: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : new Date(),
        isPinned: false,
        isArchived: false
      };
    });
    
    console.log('✅ Returning formatted real chats:', formattedChats.length);
    return res.json({
      success: true,
      message: 'Chats synced successfully',
      chats: formattedChats,
      totalChats: formattedChats.length
    });

  } catch (error) {
    console.error('Error in sync chats route:', error);
    return res.status(500).json({ error: 'Failed to sync chats', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Force reconnect profile (simplified)
router.post('/profiles/:id/force-reconnect', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Force reconnect request for profile ID:', id);
    
    const profile = await WhatsAppProfile.findByPk(id);
    
    if (!profile) {
      console.log('❌ Profile not found:', id);
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('🔗 Force reconnecting profile:', profile.name, 'with clientId:', profile.clientId);

    // Update profile status to connecting
    await profile.update({ 
      status: 'connecting',
      isConnected: false
    });

    // Remove existing client if any
    const existingClient = activeClients.get(profile.clientId);
    if (existingClient) {
      try {
        await existingClient.destroy();
      } catch (error) {
        console.log('⚠️ Error destroying existing client:', error);
      }
      activeClients.delete(profile.clientId);
      clientData.delete(profile.clientId);
    }

    // Create new client instance
    console.log('🔧 Creating new WhatsApp client...');
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: profile.clientId }),
      puppeteer: {
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1200,800'
        ],
        timeout: 30000
      }
    });

    // Store client instance
    activeClients.set(profile.clientId, client);

    // Store client data
    clientData.set(profile.clientId, {
      profileName: profile.name,
      status: 'connecting',
      profileId: profile.id
    });

    // Handle client events
    client.on('ready', async () => {
      console.log(`✅ WhatsApp client force reconnected!`, {
        profileName: profile.name,
        phoneNumber: client.info?.wid?.user
      });
      
      await profile.markConnected(client.info.wid.user);
      
      const clientInfo = clientData.get(profile.clientId);
      if (clientInfo) {
        clientInfo.status = 'connected';
        clientInfo.phoneNumber = client.info.wid.user;
        clientData.set(profile.clientId, clientInfo);
      }
    });

    client.on('qr', async (qr) => {
      try {
        console.log('QR code generated for force reconnection:', profile.clientId);
        const qrCodeDataUrl = await qrcode.toDataURL(qr);
        const clientInfo = clientData.get(profile.clientId);
        if (clientInfo) {
          clientInfo.qrCode = qrCodeDataUrl;
          clientInfo.status = 'qr_ready';
          clientData.set(profile.clientId, clientInfo);
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    });

    client.on('error', async (error) => {
      console.error(`WhatsApp client error for ${profile.clientId}:`, error);
      await profile.markError();
      
      const clientInfo = clientData.get(profile.clientId);
      if (clientInfo) {
        clientInfo.status = 'error';
        clientData.set(profile.clientId, clientInfo);
      }
    });

    // Initialize client
    console.log('Initializing WhatsApp client for force reconnection...');
    try {
      await client.initialize();
      console.log('WhatsApp client initialized successfully for force reconnection');
    } catch (error) {
      console.error('Error initializing WhatsApp client for force reconnection:', error);
      await profile.markError();
      throw error;
    }

    return res.json({
      message: 'Profile force reconnection initiated',
      status: 'connecting',
      profileId: profile.id,
      clientId: profile.clientId
    });

  } catch (error) {
    console.error('Error in force reconnect route:', error);
    return res.status(500).json({ error: 'Failed to force reconnect profile', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Toggle profile active status
router.put('/profiles/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await WhatsAppProfile.findByPk(id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await profile.toggleActive();
    
    return res.json({
      id: profile.id,
      isActive: profile.isActive,
      isConnected: profile.isConnected,
      status: profile.status
    });
  } catch (error) {
    console.error('Error toggling profile:', error);
    return res.status(500).json({ error: 'Failed to toggle profile' });
  }
});

// Reconnect existing profile
router.post('/profiles/:id/reconnect', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Reconnect request for profile ID:', id);
    
    const profile = await WhatsAppProfile.findByPk(id);
    
    if (!profile) {
      console.log('❌ Profile not found:', id);
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('🔗 Reconnecting existing profile:', profile.name, 'with clientId:', profile.clientId);

    // Check if client already exists
    const existingClient = activeClients.get(profile.clientId);
    if (existingClient) {
      try {
        console.log('🔄 Client exists, testing connection...');
        const state = await existingClient.getState();
        if (state === 'CONNECTED') {
          console.log('✅ Client is already connected');
          return res.json({ 
            message: 'Profile is already connected',
            status: 'connected',
            profileId: profile.id
          });
        } else {
          console.log('🔄 Client exists but not connected, destroying and recreating...');
          await existingClient.destroy();
          activeClients.delete(profile.clientId);
          clientData.delete(profile.clientId);
        }
      } catch (error) {
        console.log('❌ Error testing existing client, destroying and recreating...');
        try {
          await existingClient.destroy();
        } catch (destroyError) {
          console.log('⚠️ Error destroying client:', destroyError);
        }
        activeClients.delete(profile.clientId);
        clientData.delete(profile.clientId);
      }
    }

    // Create new client instance for existing profile
    console.log('🔧 Creating WhatsApp client...');
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: profile.clientId }),
      puppeteer: {
        headless: false,
        ...(process.env.CHROME_PATH && { executablePath: process.env.CHROME_PATH }),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1200,800',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-zygote',
          '--single-process',
          '--disable-background-networking',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-features=TranslateUI',
          '--disable-print-preview',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain'
        ],
        timeout: 30000
      }
    });

    // Store client instance
    activeClients.set(profile.clientId, client);

    // Store client data
    clientData.set(profile.clientId, {
      profileName: profile.name,
      status: 'connecting',
      profileId: profile.id
    });

    // Handle client events
    client.on('loading_screen', (percent, message) => {
      console.log(`WhatsApp loading: ${percent}% - ${message}`);
    });

    client.on('qr', async (qr) => {
      try {
        console.log('QR code generated for reconnection:', profile.clientId);
        const qrCodeDataUrl = await qrcode.toDataURL(qr);
        const clientInfo = clientData.get(profile.clientId);
        if (clientInfo) {
          clientInfo.qrCode = qrCodeDataUrl;
          clientInfo.status = 'qr_ready';
          clientData.set(profile.clientId, clientInfo);
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    });

    client.on('ready', async () => {
      console.log(`✅ WhatsApp client reconnected!`, {
        profileName: profile.name,
        phoneNumber: client.info?.wid?.user
      });
      
      await profile.markConnected(client.info.wid.user);
      
      const clientInfo = clientData.get(profile.clientId);
      if (clientInfo) {
        clientInfo.status = 'connected';
        clientInfo.phoneNumber = client.info.wid.user;
        clientData.set(profile.clientId, clientInfo);
      }
    });

    client.on('error', async (error) => {
      console.error(`WhatsApp client error for ${profile.clientId}:`, error);
      await profile.markError();
      
      const clientInfo = clientData.get(profile.clientId);
      if (clientInfo) {
        clientInfo.status = 'error';
        clientData.set(profile.clientId, clientInfo);
      }
    });

    // Initialize client
    console.log('Initializing WhatsApp client for reconnection...');
    try {
      await client.initialize();
      console.log('WhatsApp client initialized successfully for reconnection');
    } catch (error) {
      console.error('Error initializing WhatsApp client for reconnection:', error);
      await profile.markError();
      throw error;
    }

    return res.json({
      message: 'Profile reconnection initiated',
      status: 'connecting',
      profileId: profile.id,
      clientId: profile.clientId
    });

  } catch (error) {
    console.error('Error in reconnect route:', error);
    return res.status(500).json({ error: 'Failed to reconnect profile', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Connect existing profile
router.post('/profiles/:id/connect', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Connect request for profile ID:', id);
    
    const profile = await WhatsAppProfile.findByPk(id);
    
    if (!profile) {
      console.log('❌ Profile not found:', id);
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.isConnected) {
      console.log('ℹ️ Profile is already connected:', profile.name);
      return res.json({ message: 'Profile is already connected' });
    }

    console.log('🔗 Connecting existing profile:', profile.name, 'with clientId:', profile.clientId);

    // Create new client instance for existing profile
    console.log('🔧 Creating WhatsApp client...');
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: profile.clientId }),
      puppeteer: {
        headless: false,
        ...(process.env.CHROME_PATH && { executablePath: process.env.CHROME_PATH }), // Use system Chrome if available
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1200,800',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-zygote',
          '--single-process',
          '--disable-background-networking',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-features=TranslateUI',
          '--disable-print-preview',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain'
        ],
        timeout: 30000 // 30 seconds timeout
      }
    });

    console.log('✅ WhatsApp client created successfully');

    // Store client instance
    activeClients.set(profile.clientId, client);
    console.log('💾 Client stored in activeClients');

    // Update profile status
    await profile.update({ status: 'connecting' });
    console.log('📝 Profile status updated to connecting');

    // Store client data
    clientData.set(profile.clientId, {
      profileName: profile.name,
      status: 'connecting',
      profileId: profile.id
    });
    console.log('💾 Client data stored');

    // Handle events
    client.on('loading_screen', (percent, message) => {
      console.log(`📱 WhatsApp loading: ${percent}% - ${message}`);
    });

    client.on('qr', async (qr) => {
      try {
        console.log('📱 QR code generated for existing profile:', profile.clientId);
        const qrCodeDataUrl = await qrcode.toDataURL(qr);
        const clientInfo = clientData.get(profile.clientId);
        if (clientInfo) {
          clientInfo.qrCode = qrCodeDataUrl;
          clientInfo.status = 'qr_ready';
          clientData.set(profile.clientId, clientInfo);
          console.log('✅ QR code stored for existing profile:', profile.clientId);
        }
      } catch (error) {
        console.error('❌ Error generating QR code:', error);
      }
    });

    client.on('ready', async () => {
      console.log(`✅ WhatsApp client ${profile.clientId} reconnected!`);
      await profile.markConnected();
      
      const clientInfo = clientData.get(profile.clientId);
      if (clientInfo) {
        clientInfo.status = 'connected';
        clientInfo.phoneNumber = client.info.wid.user;
        clientData.set(profile.clientId, clientInfo);
      }
    });

    client.on('error', async (error) => {
      console.error(`❌ WhatsApp client error for ${profile.clientId}:`, error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      
      await profile.markError();
      
      const clientInfo = clientData.get(profile.clientId);
      if (clientInfo) {
        clientInfo.status = 'error';
        clientData.set(profile.clientId, clientInfo);
      }
    });

    client.on('disconnected', async (reason) => {
      console.log(`🔌 WhatsApp client ${profile.clientId} disconnected:`, reason);
      await profile.markDisconnected();
      
      const clientInfo = clientData.get(profile.clientId);
      if (clientInfo) {
        clientInfo.status = 'disconnected';
        clientData.set(profile.clientId, clientInfo);
      }
      activeClients.delete(profile.clientId);
    });

    // Initialize client
    console.log('🚀 Initializing WhatsApp client...');
    try {
      await client.initialize();
      console.log('✅ WhatsApp client initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing WhatsApp client:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      
      // Update profile status to error
      await profile.markError();
      
      const clientInfo = clientData.get(profile.clientId);
      if (clientInfo) {
        clientInfo.status = 'error';
        clientData.set(profile.clientId, clientInfo);
      }
      
      throw error;
    }
    
    console.log('🎉 Profile connection initiated successfully');
    return res.json({
      message: 'Profile connection initiated',
      clientId: profile.clientId,
      status: 'connecting'
    });

  } catch (error) {
    console.error('❌ Error connecting profile:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return res.status(500).json({ error: 'Failed to connect profile', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Disconnect profile
router.post('/profiles/:id/disconnect', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await WhatsAppProfile.findByPk(id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('Disconnecting profile:', profile.name, 'with clientId:', profile.clientId);

    // Close client if active
    const client = activeClients.get(profile.clientId);
    if (client) {
      try {
        console.log('Closing active client for profile:', profile.name);
        await client.destroy();
        activeClients.delete(profile.clientId);
        console.log('Client destroyed successfully');
      } catch (error) {
        console.error('Error destroying client:', error);
      }
    }

    // Remove client data
    clientData.delete(profile.clientId);

    // Update profile status
    await profile.markDisconnected();

    return res.json({ message: 'Profile disconnected successfully' });

  } catch (error) {
    console.error('Error disconnecting profile:', error);
    return res.status(500).json({ error: 'Failed to disconnect profile' });
  }
});





// Delete profile
router.delete('/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await WhatsAppProfile.findByPk(id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('Deleting profile:', profile.name, 'with clientId:', profile.clientId);

    // Disconnect client if active
    const client = activeClients.get(profile.clientId);
    if (client) {
      try {
        console.log('Disconnecting active client for profile:', profile.name);
        await client.destroy();
        activeClients.delete(profile.clientId);
        console.log('Client destroyed successfully');
      } catch (error) {
        console.error('Error destroying client:', error);
      }
    }

    // Remove client data
    clientData.delete(profile.clientId);

    // Delete session files if they exist
    try {
      const sessionPath = profile.sessionPath;
      if (fs.existsSync(sessionPath)) {
        console.log('Deleting session files from:', sessionPath);
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('Session files deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting session files:', error);
    }

    // Delete profile from database
    await profile.destroy();
    console.log('Profile deleted from database');

    return res.json({ 
      message: 'Profile deleted successfully',
      deletedProfile: {
        id: profile.id,
        name: profile.name,
        clientId: profile.clientId
      }
    });

  } catch (error) {
    console.error('Error deleting profile:', error);
    return res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// Get client status
router.get('/status/:clientId', (req, res) => {
  const { clientId } = req.params;
  const clientInfo = clientData.get(clientId);

  if (!clientInfo) {
    return res.status(404).json({ error: 'Client not found' });
  }

  return res.json(clientInfo);
});

// Disconnect client
router.delete('/disconnect/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const client = activeClients.get(clientId);

  if (client) {
    try {
      activeClients.delete(clientId);
      clientData.delete(clientId);
      
      // Update profile status
      const profile = await WhatsAppProfile.findByClientId(clientId);
      if (profile) {
        await profile.markDisconnected();
      }
      
      return res.json({ message: 'Client disconnected successfully' });
    } catch (error) {
      console.error('Error disconnecting client:', error);
      return res.status(500).json({ error: 'Failed to disconnect client' });
    }
  } else {
    return res.status(404).json({ error: 'Client not found' });
  }
});

// Get all active clients
router.get('/clients', (req, res) => {
  const clients = Array.from(clientData.entries()).map(([clientId, data]) => ({
    clientId,
    ...data
  }));
  
  return res.json(clients);
});


// Get client status for debugging
router.get('/profiles/:profileId/status', async (req, res) => {
  try {
    const { profileId } = req.params;
    console.log('🔍 GET /profiles/:profileId/status - Request received:', { profileId });
    
    const profile = await WhatsAppProfile.findByPk(profileId);
    
    if (!profile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    const status = {
      profileId: profile.id,
      profileName: profile.name,
      clientId: profile.clientId,
      profileStatus: profile.status,
      profileIsConnected: profile.isConnected,
      hasClient: !!client,
      clientStatus: clientInfo?.status,
      activeClientsCount: activeClients.size,
      clientDataCount: clientData.size,
      allActiveClients: Array.from(activeClients.keys()),
      allClientData: Array.from(clientData.keys())
    };
    
    console.log('🔍 Client status response:', status);
    return res.json(status);
  } catch (error) {
    console.error('Error getting client status:', error);
    return res.status(500).json({ error: 'Failed to get client status' });
  }
});

// Get chats for a profile
router.get('/profiles/:profileId/chats', chatRateLimiter, async (req, res) => {
  try {
    const { profileId } = req.params;
    console.log('📋 GET /profiles/:profileId/chats - Request received:', { profileId });
    
    const profile = await WhatsAppProfile.findByPk(profileId);
    
    if (!profile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    console.log('✅ Profile found:', {
      id: profile.id,
      clientId: profile.clientId,
      status: profile.status
    });
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    console.log('🔍 Client status:', {
      hasClient: !!client,
      clientStatus: clientInfo?.status,
      activeClientsCount: activeClients.size,
      clientDataCount: clientData.size,
      profileStatus: profile.status,
      profileIsConnected: profile.isConnected,
      clientId: profile.clientId
    });

    // Debug: Log all active clients
    console.log('🔍 All active clients:', Array.from(activeClients.keys()));
    console.log('🔍 All client data:', Array.from(clientData.keys()));
    
    // Check if client is actually connected by testing the connection
    let isActuallyConnected = false;
    
    if (client && clientInfo) {
      try {
        // Test if client is really connected by trying to get basic info
        if (client.info && client.info.wid) {
          isActuallyConnected = true;
          console.log('✅ Client is actually connected - info available');
        } else {
          console.log('⚠️ Client exists but no info available - testing connection...');
          // Try to get client info to test connection
          try {
            await client.getState();
            isActuallyConnected = true;
            console.log('✅ Client connection test successful');
          } catch (testError) {
            console.log('❌ Client connection test failed:', testError instanceof Error ? testError.message : 'Unknown error');
            isActuallyConnected = false;
          }
        }
      } catch (error) {
        console.log('❌ Error testing client connection:', error instanceof Error ? error.message : 'Unknown error');
        isActuallyConnected = false;
      }
    }
    
    console.log('🔍 Connection test result:', {
      hasClient: !!client,
      clientStatus: clientInfo?.status,
      isActuallyConnected,
      profileStatus: profile.status
    });
    
    if (!client || !isActuallyConnected) {
      console.log('Profile not connected, attempting to reconnect and returning mock data:', {
        profileId,
        hasClient: !!client,
        clientStatus: clientInfo?.status,
        profileStatus: profile.status
      });
      
      // Tentar reconectar automaticamente
      if (client && clientInfo) {
        try {
          console.log('🔄 Attempting automatic reconnection...');
          await client.initialize();
          
          // Update client data
          clientData.set(profile.clientId, {
            ...clientInfo,
            status: 'connected'
          });
          
          // Update profile status
          await profile.update({ status: 'connected' });
          
          console.log('✅ Automatic reconnection successful, fetching real chats...');
          
          // Agora tentar buscar chats reais
          try {
            const realChats = await client.getChats();
            console.log('✅ Real chats fetched:', realChats.length);
            
            const formattedRealChats = realChats.map((chat: any) => ({
              id: chat.id._serialized,
              contact: {
                id: chat.id._serialized,
                name: chat.name,
                number: chat.id.user,
                avatar: null, // Removido carregamento de fotos para evitar travamento
                lastMessage: chat.lastMessage?.body || '',
                lastTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString() : '',
                unreadCount: chat.unreadCount,
                isOnline: false,
                isTyping: false,
                status: 'none',
                isGroup: chat.isGroup
              },
              messages: [],
              unreadCount: chat.unreadCount,
              lastActivity: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : new Date(),
              isPinned: false,
              isArchived: false
            }));
            
            return res.json(formattedRealChats);
          } catch (chatError) {
            console.log('⚠️ Failed to fetch real chats, using mock data:', chatError);
          }
        } catch (reconnectError) {
          console.log('⚠️ Automatic reconnection failed, using mock data:', reconnectError);
        }
      }
      
      // Sem dados mockados - retornar erro se não conseguir conectar
      return res.status(400).json({ 
        error: 'WhatsApp não está conectado. Conecte o perfil primeiro.',
        details: 'Profile is not connected to WhatsApp'
      });
    }
    
    // Get chats from WhatsApp client
    console.log('📋 Fetching chats from WhatsApp client...');
    
    let chats;
    try {
      console.log('🔄 Calling client.getChats()...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('getChats timeout after 15 seconds')), 15000);
      });
      
      const chatsPromise = client.getChats();
      chats = await Promise.race([chatsPromise, timeoutPromise]);
      
      console.log('✅ Chats fetched from WhatsApp:', chats.length);
    } catch (chatError) {
      console.error('❌ Error fetching chats from WhatsApp:', chatError);
      console.log('⚠️ Returning mock data due to WhatsApp error');
      
      // Sem dados mockados - retornar erro
      return res.status(500).json({ 
        error: 'Erro ao carregar chats do WhatsApp',
        details: chatError instanceof Error ? chatError.message : 'Unknown error'
      });
    }
    
    const formattedChats = chats.map((chat: any) => {
      return {
        id: chat.id._serialized,
        contact: {
          id: chat.id._serialized,
          name: chat.name,
          number: chat.id.user,
          avatar: null, // Removido carregamento de fotos para evitar travamento
          lastMessage: chat.lastMessage?.body || '',
          lastTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString() : '',
          unreadCount: chat.unreadCount,
          isOnline: false,
          isTyping: false,
          status: 'none',
          isGroup: chat.isGroup
        },
        messages: [],
        unreadCount: chat.unreadCount,
        lastActivity: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : new Date(),
        isPinned: false,
        isArchived: false
      };
    });
    
    console.log('✅ Returning formatted chats:', formattedChats.length);
    return res.json(formattedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get messages for a chat
router.get('/profiles/:profileId/chats/:chatId/messages', messageRateLimiter, async (req, res) => {
  try {
    const { profileId, chatId } = req.params;
    const profile = await WhatsAppProfile.findByPk(profileId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    // Verificar se o cliente está realmente conectado
    const isActuallyConnected = client && clientInfo && clientInfo.status === 'connected';
    
    if (!client || !isActuallyConnected) {
      console.log('Profile not connected for messages:', {
        profileId,
        hasClient: !!client,
        clientStatus: clientInfo?.status,
        profileStatus: profile.status
      });
      return res.status(400).json({ error: 'Profile is not connected' });
    }
    
    // Get chat and messages
    const chat = await client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: 50 });
    
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id._serialized,
      chatId: chatId,
      text: msg.body || '',
      time: new Date(msg.timestamp * 1000),
      isSent: msg.fromMe,
      status: msg.ack === 1 ? 'sent' : msg.ack === 2 ? 'delivered' : msg.ack === 3 ? 'read' : 'sent',
      type: msg.type,
      mediaUrl: msg.hasMedia ? msg.downloadMedia() : undefined,
      mediaCaption: msg.caption || undefined
    }));
    
    return res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/profiles/:profileId/chats/:chatId/messages', async (req, res) => {
  try {
    const { profileId, chatId } = req.params;
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    
    const profile = await WhatsAppProfile.findByPk(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    // Verificar se o cliente está realmente conectado
    const isActuallyConnected = client && clientInfo && clientInfo.status === 'connected';
    
    if (!client || !isActuallyConnected) {
      console.log('Profile not connected for sending message:', {
        profileId,
        hasClient: !!client,
        clientStatus: clientInfo?.status,
        profileStatus: profile.status
      });
      return res.status(400).json({ error: 'Profile is not connected' });
    }
    
    // Send message
    const chat = await client.getChatById(chatId);
    const message = await chat.sendMessage(text);
    
    console.log('Message sent successfully:', {
      messageId: message.id._serialized,
      chatId: chatId,
      text: text
    });
    
    return res.json({
      success: true,
      messageId: message.id._serialized
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.post('/profiles/:profileId/chats/:chatId/read', async (req, res) => {
  try {
    const { profileId, chatId } = req.params;
    const { messageIds } = req.body;
    
    const profile = await WhatsAppProfile.findByPk(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    // Verificar se o cliente está realmente conectado
    const isActuallyConnected = client && clientInfo && clientInfo.status === 'connected';
    
    if (!client || !isActuallyConnected) {
      console.log('Profile not connected for marking as read:', {
        profileId,
        hasClient: !!client,
        clientStatus: clientInfo?.status,
        profileStatus: profile.status
      });
      return res.status(400).json({ error: 'Profile is not connected' });
    }
    
    // Mark messages as read
    const chat = await client.getChatById(chatId);
    await chat.sendSeen();
    
    console.log('Messages marked as read for chat:', chatId);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    return res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Get contact photo URL
router.get('/profiles/:profileId/contacts/:contactId/photo', async (req, res) => {
  try {
    const { profileId, contactId } = req.params;
    const profile = await WhatsAppProfile.findByPk(profileId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    // Verificar se o cliente está realmente conectado
    const isActuallyConnected = client && clientInfo && clientInfo.status === 'connected';
    
    if (!client || !isActuallyConnected) {
      console.log('Profile not connected for contact photo:', {
        profileId,
        hasClient: !!client,
        clientStatus: clientInfo?.status,
        profileStatus: profile.status
      });
      return res.status(400).json({ error: 'Profile is not connected' });
    }
    
    try {
      // Get contact photo URL without downloading
      const photoUrl = await client.getProfilePicUrl(contactId);
      
      if (photoUrl) {
        console.log('Contact photo URL obtained:', { contactId, photoUrl });
        return res.json({ 
          success: true, 
          photoUrl,
          contactId 
        });
      } else {
        console.log('No photo available for contact:', contactId);
        return res.json({ 
          success: false, 
          message: 'No photo available',
          contactId 
        });
      }
    } catch (error) {
      console.log('Error getting contact photo:', { contactId, error: error instanceof Error ? error.message : 'Unknown error' });
      return res.json({ 
        success: false, 
        message: 'Could not get contact photo',
        contactId 
      });
    }
  } catch (error) {
    console.error('Error in contact photo route:', error);
    return res.status(500).json({ error: 'Failed to get contact photo' });
  }
});

// Test Puppeteer connection
router.get('/test-puppeteer', async (req, res) => {
  try {
    console.log('🧪 Testing Puppeteer connection...');
    
    const { Client, LocalAuth } = require('whatsapp-web.js');
    
    // Create a simple test client with better Puppeteer config
    const testClient = new Client({
      authStrategy: new LocalAuth({ clientId: 'test-client' }),
      puppeteer: {
        headless: true, // Use headless for testing
        ...(process.env.CHROME_PATH && { executablePath: process.env.CHROME_PATH }), // Use system Chrome if available
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-zygote',
          '--single-process',
          '--disable-background-networking',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-features=TranslateUI',
          '--disable-print-preview',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain'
        ],
        timeout: 30000 // 30 seconds timeout
      }
    });

    console.log('🔧 Test client created, attempting to initialize...');
    
    // Try to initialize with a longer timeout
    const initializePromise = testClient.initialize();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Puppeteer test timeout after 30 seconds')), 30000);
    });
    
    await Promise.race([initializePromise, timeoutPromise]);
    
    console.log('✅ Puppeteer test successful!');
    
    // Clean up
    await testClient.destroy();
    
    return res.json({
      success: true,
      message: 'Puppeteer is working correctly'
    });
    
  } catch (error) {
    console.error('❌ Puppeteer test failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return res.status(500).json({
      success: false,
      error: 'Puppeteer test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get incremental sync updates
router.get('/profiles/:profileId/sync', syncRateLimiter, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { since } = req.query;
    
    console.log('🔄 GET /profiles/:profileId/sync - Request received:', { 
      profileId, 
      since: since ? new Date(parseInt(since as string)) : 'no timestamp' 
    });
    
    const profile = await WhatsAppProfile.findByPk(profileId);
    
    if (!profile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    if (!client || !clientInfo || clientInfo.status !== 'connected') {
      console.log('❌ Client not connected for sync:', profileId);
      return res.status(400).json({ error: 'Client not connected' });
    }
    
    const sinceTime = since ? parseInt(since as string) : 0;
    const updates: any[] = [];
    
    try {
      // Buscar chats que foram atualizados desde o último sync
      const chats = await client.getChats();
      
      for (const chat of chats) {
        const lastMessage = await chat.fetchMessages({ limit: 1 });
        
        if (lastMessage.length > 0) {
          const messageTime = lastMessage[0].timestamp * 1000;
          
          if (messageTime > sinceTime) {
            updates.push({
              type: 'chat',
              chatId: chat.id._serialized,
              lastMessage: lastMessage[0].body || '',
              lastMessageTime: messageTime,
              unreadCount: chat.unreadCount
            });
          }
        }
      }
      
      // Buscar mensagens não lidas ou novas
      const allChats = await client.getChats();
      for (const chat of allChats) {
        const messages = await chat.fetchMessages({ limit: 10 });
        
        for (const message of messages) {
          const messageTime = message.timestamp * 1000;
          
          if (messageTime > sinceTime) {
            updates.push({
              type: 'message',
              chatId: chat.id._serialized,
              messageId: message.id._serialized,
              text: message.body || '',
              time: messageTime,
              isFromMe: message.fromMe,
              isGroup: chat.isGroup
            });
          }
        }
      }
      
      console.log('✅ Sync completed:', {
        profileId,
        updatesCount: updates.length,
        since: sinceTime,
        now: Date.now()
      });
      
      return res.json({
        success: true,
        updates,
        timestamp: Date.now(),
        count: updates.length
      });
      
    } catch (error) {
      console.error('❌ Error during sync:', error);
      return res.status(500).json({ 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
    
  } catch (error) {
    console.error('❌ Error in sync endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router; 