import { Router } from 'express';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import WhatsAppProfile from '../../core/entities/WhatsAppProfile';
import { messageRateLimiter, chatRateLimiter, syncRateLimiter } from '../../infrastructure/middleware/rateLimiter';
import { logger } from '../../infrastructure/utils/logger';

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
    console.log('Creating WhatsApp client with Chrome config...');
    const client = new Client({
      authStrategy: new LocalAuth({ clientId }),
      puppeteer: {
        headless: false,
        executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        timeout: 60000, // Increase timeout to 60 seconds
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

    // Handle incoming messages - ULTRA OPTIMIZED FOR MAXIMUM SPEED
    console.log(`🔧 Registering ULTRA-FAST message event listener for client ${clientId}`);
    
    client.on('message', async (message) => {
      try {
        // Log only every 20 messages to not impact performance
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
          console.log('⚡ ULTRA-FAST message processing:', message.body?.substring(0, 20));
        }
        
        // Get profile from database - CACHE to avoid repeated queries
        const currentProfile = await WhatsAppProfile.findByClientId(clientId);
        
        if (!currentProfile?.id) {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ No profile found for client:', clientId);
          }
          return;
        }
        
        // Prepare message data - SIMPLIFIED STRUCTURE FOR MAXIMUM SPEED
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
            // Essential information only
            isGroup: message.from.includes('@g.us'),
            sender: message.fromMe ? currentProfile.phoneNumber : message.from,
            // Remove media processing for speed - will be done on demand
            timestamp: message.timestamp * 1000
          },
          timestamp: new Date(),
          profileId: currentProfile.id
        };
        
        // Minimal validation for speed
        if (!messageData.data.id || !messageData.data.chatId) {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ Invalid message data structure');
          }
          return;
        }
        
        // Emit IMMEDIATELY via WebSocket - NO LOGGING IN PRODUCTION
        if (global.io) {
          const roomName = `whatsapp-${currentProfile.id}`;
          global.io.to(roomName).emit('whatsapp_message', messageData);
          
          // Log only in development and rarely
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.02) {
            console.log('⚡ Message emitted INSTANTLY to room:', roomName);
          }
        }
      } catch (error) {
        // Simplified error log to not impact performance
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Error in ULTRA-FAST message processing:', error instanceof Error ? error.message : 'Unknown error');
        }
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
    
    // 🔧 IMPORTANT: Ensure all profiles are turned off by default
    // This prevents bugs with automatic browsers still open
    for (const profile of profiles) {
      const clientInfo = clientData.get(profile.clientId);
      const hasActiveClient = activeClients.has(profile.clientId);
      
      // Check for inconsistencies and fix them
      let needsUpdate = false;
      let newStatus = profile.status;
      let newIsConnected = profile.isConnected;
      
      // If profile is marked as connected but no active client exists
      if (profile.isConnected && !hasActiveClient) {
        console.log(`🔧 Fixing inconsistent status for profile ${profile.name}: connected -> disconnected (no active client)`);
        newStatus = 'disconnected';
        newIsConnected = false;
        needsUpdate = true;
      }
      
      // If profile is marked as connecting but no active client exists
      if (profile.status === 'connecting' && !hasActiveClient) {
        console.log(`🔧 Fixing inconsistent status for profile ${profile.name}: connecting -> disconnected (no active client)`);
        newStatus = 'disconnected';
        newIsConnected = false;
        needsUpdate = true;
      }
      
      // If profile is marked as connected but client is not really connected
      if (profile.status === 'connected' && hasActiveClient && clientInfo && clientInfo.status !== 'connected') {
        console.log(`🔧 Fixing inconsistent status for profile ${profile.name}: connected -> ${clientInfo.status} (client status mismatch)`);
        // Treat qr_ready status as connecting
        newStatus = clientInfo.status === 'qr_ready' ? 'connecting' : clientInfo.status;
        newIsConnected = false;
        needsUpdate = true;
      }
      
      // Apply corrections if necessary
      if (needsUpdate) {
        await profile.update({ 
          status: newStatus,
          isConnected: newIsConnected,
          lastDisconnected: new Date()
        });
      }
    }
    
    // Reload profiles after corrections
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
      return res.status(400).json({ error: 'Perfil não está conectado ao WhatsApp' });
    }
    
    console.log('📋 Fetching chats from WhatsApp...');
    const chats = await client.getChats();
    console.log('✅ Real chats fetched:', chats.length);
    
    const formattedChats = chats.map((chat: any) => {
      // Criar uma mensagem de preview baseada na última mensagem do chat
      const previewMessage = chat.lastMessage ? {
        id: `preview-${chat.id._serialized}`,
        chatId: chat.id._serialized,
        text: chat.lastMessage.body || '',
        time: new Date(chat.lastMessage.timestamp * 1000),
        isSent: chat.lastMessage.fromMe || false,
        status: chat.lastMessage.ack === 1 ? 'sent' : chat.lastMessage.ack === 2 ? 'delivered' : chat.lastMessage.ack === 3 ? 'read' : 'sent',
        type: 'text'
      } : null;

      return {
        id: chat.id._serialized,
        contact: {
          id: chat.id._serialized,
          name: chat.name,
          number: chat.id.user,
          avatar: null, // Removido carregamento de fotos para evitar travamento
          lastMessage: chat.lastMessage?.body || '',
          lastTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toISOString() : '',
          unreadCount: chat.unreadCount,
          isOnline: false,
          isTyping: false,
          status: 'none',
          isGroup: chat.isGroup
        },
        messages: previewMessage ? [previewMessage] : [],
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
        executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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
        executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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
          '--disable-background-networking',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-features=TranslateUI',
          '--disable-print-preview',
          '--metrics-recording-only',
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
    
    // Limpar qualquer cliente existente que possa estar causando conflito
    const existingClient = activeClients.get(profile.clientId);
    if (existingClient) {
      try {
        console.log('🧹 Cleaning up existing client...');
        await existingClient.destroy();
        activeClients.delete(profile.clientId);
        clientData.delete(profile.clientId);
        console.log('✅ Existing client cleaned up');
      } catch (cleanupError) {
        console.log('⚠️ Error cleaning up existing client:', cleanupError);
        activeClients.delete(profile.clientId);
        clientData.delete(profile.clientId);
      }
    }
    
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: profile.clientId }),
      puppeteer: {
        headless: false,
        executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        timeout: 60000, // Aumentar timeout para 60 segundos
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
          '--disable-background-networking',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-features=TranslateUI',
          '--disable-print-preview',
          '--metrics-recording-only',
          '--safebrowsing-disable-auto-update',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=site-per-process'
        ]
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
      
      // Verificar se é um erro de sessão fechada
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('Session closed') || errorMessage.includes('Protocol error')) {
        console.log('🔄 Session closed error detected, attempting cleanup...');
        try {
          activeClients.delete(profile.clientId);
          clientData.delete(profile.clientId);
          await client.destroy();
        } catch (cleanupError) {
          console.log('⚠️ Error during cleanup:', cleanupError);
        }
      }
      
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
      // Adicionar um delay antes da inicialização para garantir que o browser esteja pronto
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await client.initialize();
      console.log('✅ WhatsApp client initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing WhatsApp client:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      
      // Limpar recursos em caso de erro
      try {
        activeClients.delete(profile.clientId);
        clientData.delete(profile.clientId);
        await client.destroy();
      } catch (cleanupError) {
        console.log('⚠️ Error during cleanup:', cleanupError);
      }
      
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
            
            const formattedRealChats = realChats.map((chat: any) => {
              // Criar uma mensagem de preview baseada na última mensagem do chat
              const previewMessage = chat.lastMessage ? {
                id: `preview-${chat.id._serialized}`,
                chatId: chat.id._serialized,
                text: chat.lastMessage.body || '',
                time: new Date(chat.lastMessage.timestamp * 1000),
                isSent: chat.lastMessage.fromMe || false,
                status: chat.lastMessage.ack === 1 ? 'sent' : chat.lastMessage.ack === 2 ? 'delivered' : chat.lastMessage.ack === 3 ? 'read' : 'sent',
                type: 'text'
              } : null;

              return {
                id: chat.id._serialized,
                contact: {
                  id: chat.id._serialized,
                  name: chat.name,
                  number: chat.id.user,
                  avatar: null, // Removido carregamento de fotos para evitar travamento
                  lastMessage: chat.lastMessage?.body || '',
                  lastTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toISOString() : '',
                  unreadCount: chat.unreadCount,
                  isOnline: false,
                  isTyping: false,
                  status: 'none',
                  isGroup: chat.isGroup
                },
                messages: previewMessage ? [previewMessage] : [],
                unreadCount: chat.unreadCount,
                lastActivity: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : new Date(),
                isPinned: false,
                isArchived: false
              };
            });
            
            return res.json({ success: true, chats: formattedRealChats });
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
      // Criar uma mensagem de preview baseada na última mensagem do chat
      const previewMessage = chat.lastMessage ? {
        id: `preview-${chat.id._serialized}`,
        chatId: chat.id._serialized,
        text: chat.lastMessage.body || '',
        time: new Date(chat.lastMessage.timestamp * 1000),
        isSent: chat.lastMessage.fromMe || false,
        status: chat.lastMessage.ack === 1 ? 'sent' : chat.lastMessage.ack === 2 ? 'delivered' : chat.lastMessage.ack === 3 ? 'read' : 'sent',
        type: 'text'
      } : null;

      return {
        id: chat.id._serialized,
        contact: {
          id: chat.id._serialized,
          name: chat.name,
          number: chat.id.user,
          avatar: null, // Removido carregamento de fotos para evitar travamento
          lastMessage: chat.lastMessage?.body || '',
          lastTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toISOString() : '',
          unreadCount: chat.unreadCount,
          isOnline: false,
          isTyping: false,
          status: 'none',
          isGroup: chat.isGroup
        },
        messages: previewMessage ? [previewMessage] : [],
        unreadCount: chat.unreadCount,
        lastActivity: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : new Date(),
        isPinned: false,
        isArchived: false
      };
    });
    
    // Ordenar chats por lastActivity (mais recente primeiro) e por unreadCount
    const sortedChats = formattedChats.sort((a: any, b: any) => {
      // Primeiro, chats com mensagens não lidas têm prioridade
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // Se ambos têm ou não têm mensagens não lidas, ordenar por lastActivity
      const timeA = a.lastActivity instanceof Date ? a.lastActivity.getTime() : new Date(a.lastActivity).getTime();
      const timeB = b.lastActivity instanceof Date ? b.lastActivity.getTime() : new Date(b.lastActivity).getTime();
      
      // Debug: Log das comparações de tempo
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log('🕐 Time comparison debug:', {
          chatA: a.contact.name,
          timeA: timeA,
          timeAFormatted: new Date(timeA).toISOString(),
          chatB: b.contact.name,
          timeB: timeB,
          timeBFormatted: new Date(timeB).toISOString(),
          difference: timeB - timeA
        });
      }
      
      return timeB - timeA; // Ordem decrescente (mais recente primeiro)
    });
    
    // Limitar a 10 conversas mais recentes para melhor performance
    const limitedChats = sortedChats.slice(0, 10);
    
    console.log('✅ Returning formatted chats:', limitedChats.length);
    console.log('📊 Chat ordering info:', {
      totalChats: sortedChats.length,
      limitedChats: limitedChats.length,
      withUnread: limitedChats.filter((c: any) => c.unreadCount > 0).length,
      recentChats: limitedChats.slice(0, 5).map((c: any) => ({
        name: c.contact.name,
        lastActivity: c.lastActivity,
        unreadCount: c.unreadCount,
        lastMessage: c.contact.lastMessage?.substring(0, 30)
      }))
    });
    
    return res.json({ success: true, chats: limitedChats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return res.status(500).json({ success: false, error: 'Erro ao carregar conversas do WhatsApp' });
  }
});

// Get messages for a chat
router.get('/profiles/:profileId/chats/:chatId/messages', messageRateLimiter, async (req, res) => {
  const { profileId, chatId } = req.params;
  let profile;
  
  try {
    profile = await WhatsAppProfile.findByPk(profileId);
    
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
      return res.status(400).json({ error: 'Perfil não está conectado ao WhatsApp' });
    }
    
    // Get chat and messages with retry mechanism
    const chat = await client.getChatById(chatId);
    
    // Permitir carregar muito mais mensagens - até 10.000 para conversas extensas
    const { limit = 10000 } = req.query;
    const messageLimit = Math.min(parseInt(limit as string) || 10000, 10000);
    
    // Verificar saúde da conexão antes de tentar buscar mensagens
    try {
      await client.getState();
      console.log('✅ Client connection health check passed');
    } catch (healthError) {
      console.error('❌ Client connection health check failed:', healthError);
      return res.status(503).json({ 
        error: 'Client connection is unstable. Please try again or restart the profile.',
        details: 'Connection health check failed'
      });
    }
    
    // Implementar retry mechanism para fetchMessages
    let messages;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Attempting to fetch messages (attempt ${retryCount + 1}/${maxRetries})`);
        messages = await chat.fetchMessages({ limit: messageLimit });
        console.log(`✅ Successfully fetched ${messages.length} messages`);
        break;
      } catch (error) {
        retryCount++;
        console.error(`❌ Error fetching messages (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          console.error('❌ Max retries reached, returning empty messages array');
          messages = [];
          break;
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
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
    console.error('❌ Error fetching messages:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type',
      profileId,
      chatId,
      clientId: profile?.clientId
    });
    
    // Verificar se é um erro de conexão
    if (error instanceof Error && error.message.includes('Promise was collected')) {
      console.error('🔧 Detected Puppeteer connection issue, suggesting client restart');
      return res.status(503).json({ 
        error: 'Temporary connection issue. Please try again or restart the profile.',
        details: 'Puppeteer connection error detected'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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
      return res.status(400).json({ error: 'Perfil não está conectado ao WhatsApp' });
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
      return res.status(400).json({ error: 'Perfil não está conectado ao WhatsApp' });
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
        executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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

// Check if a phone number is registered on WhatsApp
router.post('/profiles/:profileId/check-contacts', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { phoneNumbers } = req.body;
    
    console.log('🔍 POST /profiles/:profileId/check-contacts - Request received:', { 
      profileId, 
      phoneNumbersCount: phoneNumbers?.length || 0 
    });
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'Phone numbers array is required' });
    }
    
    const profile = await WhatsAppProfile.findByPk(profileId);
    
    if (!profile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    if (!client || !clientInfo || clientInfo.status !== 'connected') {
      console.log('❌ Client not connected for contact check:', profileId);
      return res.status(400).json({ error: 'Client not connected' });
    }
    
    const results = [];
    
    for (const phoneNumber of phoneNumbers) {
      try {
        // Formatar o número para o padrão do WhatsApp
        let formattedNumber = phoneNumber.replace(/\D/g, '');
        
        // Adicionar código do país se não estiver presente (assumindo Brasil +55)
        if (!formattedNumber.startsWith('55')) {
          formattedNumber = '55' + formattedNumber;
        }
        
        // Adicionar @c.us para contatos
        const contactId = formattedNumber + '@c.us';
        
        console.log('🔍 Checking contact:', { phoneNumber, formattedNumber, contactId });
        
        // Verificar se o número está registrado no WhatsApp
        const isRegistered = await client.isRegisteredUser(contactId);
        
        if (isRegistered) {
          // Buscar informações do contato
          let contactInfo = {
            phoneNumber: phoneNumber,
            formattedNumber: formattedNumber,
            contactId: contactId,
            isRegistered: true,
            name: null,
            photo: null,
            status: null
          };
          
          try {
            // Tentar obter o nome do contato
            const contact = await client.getContactById(contactId);
            if (contact) {
              contactInfo.name = contact.pushname || contact.name || null;
              contactInfo.status = contact.status || null;
            }
          } catch (contactError) {
            console.log('⚠️ Could not get contact details:', contactError instanceof Error ? contactError.message : 'Unknown error');
          }
          
          try {
            // Tentar obter a foto do perfil
            const photoUrl = await client.getProfilePicUrl(contactId);
            if (photoUrl) {
              contactInfo.photo = photoUrl;
            }
          } catch (photoError) {
            console.log('⚠️ Could not get profile photo:', photoError instanceof Error ? photoError.message : 'Unknown error');
          }
          
          results.push(contactInfo);
          console.log('✅ Contact found:', contactInfo);
        } else {
          results.push({
            phoneNumber: phoneNumber,
            formattedNumber: formattedNumber,
            contactId: contactId,
            isRegistered: false,
            name: null,
            photo: null,
            status: null
          });
          console.log('❌ Contact not found:', phoneNumber);
        }
        
        // Pequena pausa para não sobrecarregar o WhatsApp
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('❌ Error checking contact:', phoneNumber, error);
        results.push({
          phoneNumber: phoneNumber,
          formattedNumber: null,
          contactId: null,
          isRegistered: false,
          name: null,
          photo: null,
          status: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log('✅ Contact check completed:', {
      profileId,
      totalChecked: phoneNumbers.length,
      found: results.filter(r => r.isRegistered).length,
      notFound: results.filter(r => !r.isRegistered).length
    });
    
    return res.json({
      success: true,
      results,
      summary: {
        total: phoneNumbers.length,
        found: results.filter(r => r.isRegistered).length,
        notFound: results.filter(r => !r.isRegistered).length
      }
    });
    
  } catch (error) {
    console.error('❌ Error in contact check endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create new chat or get existing chat by number
router.post('/profiles/:profileId/chats/create', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { number } = req.body;
    
    if (!number || !number.trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
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
      console.log('Profile not connected for creating chat:', {
        profileId,
        hasClient: !!client,
        clientStatus: clientInfo?.status,
        profileStatus: profile.status
      });
      return res.status(400).json({ error: 'Profile is not connected' });
    }
    
    // Normalizar o número do telefone
    let normalizedNumber = number.replace(/\D/g, '');
    
    // Adicionar código do país se não estiver presente
    if (!normalizedNumber.startsWith('55') && normalizedNumber.length === 11) {
      normalizedNumber = '55' + normalizedNumber;
    }
    
    // Formatar o número para o formato WhatsApp
    const chatId = `${normalizedNumber}@c.us`;
    
    console.log('Creating/getting chat for number:', {
      originalNumber: number,
      normalizedNumber,
      chatId
    });
    
    try {
      // Tentar obter o chat existente primeiro
      const existingChat = await client.getChatById(chatId);
      
      console.log('Chat already exists:', {
        chatId: existingChat.id._serialized,
        name: existingChat.name
      });
      
      // Retornar informações do chat existente
      return res.json({
        success: true,
        chat: {
          id: existingChat.id._serialized,
          contact: {
            id: existingChat.id._serialized,
            name: existingChat.name,
            number: existingChat.id.user,
            avatar: null,
            isGroup: existingChat.isGroup
          },
          unreadCount: existingChat.unreadCount || 0,
          isPinned: existingChat.pin || false,
          lastMessage: existingChat.lastMessage?.body || '',
          lastMessageTime: existingChat.lastMessage?.timestamp ? new Date(existingChat.lastMessage.timestamp * 1000) : null
        },
        isNew: false
      });
      
    } catch (chatError) {
      // Se o chat não existir, criar um novo
      console.log('Chat does not exist, creating new chat for number:', normalizedNumber);
      
      try {
        // Criar novo chat usando o número
        const newChat = await client.getChatById(chatId);
        
        console.log('New chat created successfully:', {
          chatId: newChat.id._serialized,
          name: newChat.name
        });
        
        return res.json({
          success: true,
          chat: {
            id: newChat.id._serialized,
            contact: {
              id: newChat.id._serialized,
              name: newChat.name || normalizedNumber,
              number: newChat.id.user,
              avatar: null,
              isGroup: newChat.isGroup
            },
            unreadCount: 0,
            isPinned: false,
            lastMessage: '',
            lastMessageTime: null
          },
          isNew: true
        });
        
      } catch (createError) {
        console.error('Error creating new chat:', createError);
        return res.status(500).json({ 
          error: 'Failed to create new chat',
          details: createError instanceof Error ? createError.message : 'Unknown error'
        });
      }
    }
    
  } catch (error) {
    console.error('Error in create chat endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to create/get chat',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verificar status de compartilhamento
router.get('/profiles/:profileId/share', async (req, res) => {
  try {
    const { profileId } = req.params;
    
    console.log('🔍 Checking sharing status for profile:', profileId);
    
    const profile = await WhatsAppProfile.findByPk(profileId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    return res.json({
      success: true,
      isShared: profile.isShared || false,
      shareUrl: profile.shareUrl || '',
      shareToken: profile.shareToken || '',
      sharedAt: profile.sharedAt || null
    });
    
  } catch (error) {
    console.error('❌ Error checking sharing status:', error);
    return res.status(500).json({ 
      error: 'Failed to check sharing status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Compartilhamento de perfis
router.post('/profiles/:profileId/share', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { enabled, profileName } = req.body;

    console.log('🔗 Share request for profile:', { profileId, enabled, profileName });

    const profile = await WhatsAppProfile.findByPk(profileId);
    
    if (!profile) {
      console.log('❌ Profile not found for sharing:', profileId);
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (enabled) {
      // Ativar compartilhamento
      try {
        // Usar ngrok para criar URL pública
        const ngrok = require('ngrok');
        
        // Verificar se já existe um túnel ativo
        const tunnels = await ngrok.getTunnels();
        let shareUrl = '';
        
        if (tunnels.length > 0) {
          // Usar túnel existente
          shareUrl = tunnels[0].public_url;
        } else {
          // Criar novo túnel
          shareUrl = await ngrok.connect({
            addr: process.env.PORT || 3001,
            authtoken: process.env.NGROK_AUTH_TOKEN // Opcional
          });
        }
        
        // Gerar token único para o perfil
        const shareToken = require('crypto').randomBytes(32).toString('hex');
        
        // Salvar informações de compartilhamento no perfil
        await profile.update({
          isShared: true,
          shareToken: shareToken,
          shareUrl: `${shareUrl}/shared/${shareToken}`,
          sharedAt: new Date()
        });
        
        console.log('✅ Sharing enabled for profile:', {
          profileId,
          shareUrl: `${shareUrl}/shared/${shareToken}`,
          shareToken
        });
        
        return res.json({
          success: true,
          shareUrl: `${shareUrl}/shared/${shareToken}`,
          message: 'Sharing enabled successfully'
        });
        
      } catch (ngrokError) {
        console.error('❌ Ngrok error:', ngrokError);
        
        // Fallback: usar URL local com porta específica
        const localShareUrl = `http://localhost:${process.env.PORT || 3001}/shared/${profile.id}`;
        
        await profile.update({
          isShared: true,
          shareToken: profile.id.toString(),
          shareUrl: localShareUrl,
          sharedAt: new Date()
        });
        
        console.log('⚠️ Using local URL as fallback:', localShareUrl);
        
        return res.json({
          success: true,
          shareUrl: localShareUrl,
          message: 'Sharing enabled with local URL'
        });
      }
      
    } else {
      // Desativar compartilhamento
      await profile.update({
        isShared: false
      });
      
      // Limpar campos de compartilhamento separadamente
      await profile.update({
        shareToken: null as any,
        shareUrl: null as any,
        sharedAt: null as any
      });
      
      console.log('✅ Sharing disabled for profile:', profileId);
      
      return res.json({
        success: true,
        message: 'Sharing disabled successfully'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in share endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to manage sharing',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Rota para acessar perfil compartilhado
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔗 Accessing shared profile with token:', token);
    
    // Buscar perfil pelo token
    const profile = await WhatsAppProfile.findOne({
      where: {
        shareToken: token,
        isShared: true
      }
    });
    
    if (!profile) {
      console.log('❌ Shared profile not found for token:', token);
      return res.status(404).json({ error: 'Shared profile not found or disabled' });
    }
    
    // Verificar se o perfil está conectado
    if (!profile.isConnected) {
      console.log('❌ Shared profile is not connected:', profile.id);
      return res.status(400).json({ error: 'Profile is not connected' });
    }
    
    console.log('✅ Shared profile accessed successfully:', {
      profileId: profile.id,
      profileName: profile.name,
      token
    });
    
    // Retornar dados do perfil para a página compartilhada
    return res.json({
      success: true,
      profile: {
        id: profile.id,
        name: profile.name,
        isConnected: profile.isConnected,
        shareUrl: profile.shareUrl
      }
    });
    
  } catch (error) {
    console.error('❌ Error accessing shared profile:', error);
    return res.status(500).json({ 
      error: 'Failed to access shared profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint para verificar sincronização de mensagens
router.get('/profiles/:profileId/chats/:chatId/sync-check', syncRateLimiter, async (req, res) => {
  try {
    const { profileId, chatId } = req.params;
    const { lastMessageId, lastMessageTimestamp, messageCount } = req.query;

    logger.info(`🔍 Sync check requested for profile ${profileId}, chat ${chatId}`);

    // Validar parâmetros
    if (!profileId || !chatId) {
      return res.status(400).json({ 
        error: 'Profile ID and Chat ID are required',
        needsSync: false 
      });
    }

    // Buscar perfil
    const profile = await WhatsAppProfile.findByPk(profileId);
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found',
        needsSync: false 
      });
    }

    // Verificar se o perfil está conectado
    if (!profile.isConnected || profile.status !== 'connected') {
      return res.status(400).json({ 
        error: 'Profile is not connected',
        needsSync: false 
      });
    }

    // Obter cliente WhatsApp
    const client = global.activeClients?.get(profile.clientId);
    if (!client) {
      return res.status(400).json({ 
        error: 'WhatsApp client not found',
        needsSync: false 
      });
    }

    // Buscar chat no WhatsApp
    const chat = await client.getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ 
        error: 'Chat not found in WhatsApp',
        needsSync: false 
      });
    }

    // Buscar mensagens do chat
    const messages = await chat.fetchMessages({ limit: 100 });
    
    if (messages.length === 0) {
      return res.json({
        needsSync: false,
        syncData: {
          totalMessages: 0,
          lastMessageId: null,
          lastMessageTimestamp: null
        }
      });
    }

    // Ordenar mensagens por timestamp (mais recente primeiro)
    const sortedMessages = messages.sort((a: any, b: any) => b.timestamp - a.timestamp);
    const latestMessage = sortedMessages[0];

    // Verificar se há necessidade de sincronização
    let needsSync = false;
    let syncReason = '';

    // Verificar se o número de mensagens está correto
    if (messageCount && parseInt(messageCount as string) !== messages.length) {
      needsSync = true;
      syncReason = 'message_count_mismatch';
    }

    // Verificar se a última mensagem ID está correto
    if (lastMessageId && lastMessageId !== latestMessage.id._serialized) {
      needsSync = true;
      syncReason = 'last_message_id_mismatch';
    }

    // Verificar se o timestamp da última mensagem está correto
    if (lastMessageTimestamp) {
      const frontendTimestamp = parseInt(lastMessageTimestamp as string);
      const whatsappTimestamp = latestMessage.timestamp * 1000; // Converter para milissegundos
      
      // Tolerância de 5 segundos para diferenças de timestamp
      if (Math.abs(frontendTimestamp - whatsappTimestamp) > 5000) {
        needsSync = true;
        syncReason = 'timestamp_mismatch';
      }
    }

    // Preparar dados de sincronização
    const syncData = {
      totalMessages: messages.length,
      lastMessageId: latestMessage.id._serialized,
      lastMessageTimestamp: latestMessage.timestamp * 1000,
      lastMessageText: latestMessage.body?.substring(0, 100) || '',
      lastMessageType: latestMessage.type,
      syncReason: needsSync ? syncReason : null
    };

    logger.info(`🔍 Sync check completed for chat ${chatId}:`, {
      needsSync,
      reason: syncReason,
      totalMessages: messages.length,
      lastMessageId: latestMessage.id._serialized
    });

    return res.json({
      needsSync,
      syncData
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`❌ Error in sync check: ${errorMessage}`);
    
    return res.status(500).json({ 
      error: 'Failed to check synchronization',
      details: errorMessage,
      needsSync: false 
    });
  }
});

export default router; 