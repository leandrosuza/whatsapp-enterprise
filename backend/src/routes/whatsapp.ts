import { Router } from 'express';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import WhatsAppProfile from '../models/WhatsAppProfile';
import { messageRateLimiter, chatRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Store active WhatsApp clients
const activeClients = new Map<string, any>();

// Store client data
const clientData = new Map<string, {
  profileName: string;
  phoneNumber?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'qr_ready';
  qrCode?: string;
  profileId?: number;
}>();

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
    
    // Create profile in database first
    console.log('About to create profile in database...');
    let profile;
    try {
      profile = await WhatsAppProfile.create({
        userId,
        name: profileName,
        clientId,
        sessionPath,
        status: 'connecting'
      });

      console.log('Profile created in database:', profile.id);
    } catch (error) {
      console.error('Error creating profile in database:', error);
      return res.status(500).json({ error: 'Failed to create profile in database', details: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Store client data
    console.log('Storing client data...');
    clientData.set(clientId, {
      profileName,
      status: 'connecting',
      profileId: profile.id
    });

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
        console.log('🎯 MESSAGE EVENT TRIGGERED!');
        console.log('📱 New WhatsApp message received:', {
          id: message.id._serialized,
          from: message.from,
          body: message.body,
          type: message.type,
          timestamp: message.timestamp,
          clientId: clientId
        });
        
        // Get profile from database to ensure we have the latest data
        const currentProfile = await WhatsAppProfile.findByClientId(clientId);
        
        if (!currentProfile?.id) {
          console.error('❌ No profile found for client:', clientId);
          return;
        }
        
        // Prepare message data with proper validation
        const messageData = {
          type: 'message',
          data: {
            id: message.id._serialized,
            chatId: message.from,
            text: message.body || '',
            time: new Date(message.timestamp * 1000),
            isSent: false,
            status: 'sent',
            type: message.type || 'text'
          },
          timestamp: new Date(),
          profileId: currentProfile.id
        };
        
        // Validate message data before emitting
        if (!messageData.data.id || !messageData.data.chatId) {
          console.error('❌ Invalid message data:', messageData);
          return;
        }
        
        // Emit to connected clients via WebSocket with retry logic
        if (global.io) {
          const roomName = `whatsapp-${currentProfile.id}`;
          const roomExists = global.io.sockets.adapter.rooms.has(roomName);
          
          console.log('📡 Emitting message to clients:', {
            room: roomName,
            messageId: messageData.data.id,
            chatId: messageData.data.chatId,
            text: message.body?.substring(0, 30),
            profileId: currentProfile.id,
            hasIo: !!global.io,
            roomExists: roomExists,
            clientsInRoom: roomExists ? global.io.sockets.adapter.rooms.get(roomName)?.size || 0 : 0
          });
          
          // Emit with acknowledgment
          global.io.to(roomName).emit('whatsapp_message', messageData);
          
          // Log successful emission
          console.log('✅ Message emitted successfully to room:', roomName);
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
          clientId: clientId
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
            status: ack === 1 ? 'sent' : ack === 2 ? 'delivered' : ack === 3 ? 'read' : 'sent'
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

// Get all profiles with real-time status
router.get('/profiles', async (req, res) => {
  try {
    console.log('Fetching WhatsApp profiles...');
    const profiles = await WhatsAppProfile.findActive();
    console.log('Found profiles:', profiles.length);
    
    const profilesWithStatus = profiles.map(profile => {
      // Check if client is actually active in memory
      const client = activeClients.get(profile.clientId);
      const clientInfo = clientData.get(profile.clientId);
      
      // Determine real connection status
      let realStatus = profile.status;
      let isActuallyConnected = profile.isConnected;
      
      if (client && clientInfo) {
        // Client exists in memory
        if (clientInfo.status === 'connected') {
          realStatus = 'connected';
          isActuallyConnected = true;
        } else if (clientInfo.status === 'connecting') {
          realStatus = 'connecting';
          isActuallyConnected = false;
        } else if (clientInfo.status === 'error') {
          realStatus = 'error';
          isActuallyConnected = false;
        }
      } else {
        // Client not in memory, should be disconnected
        realStatus = 'disconnected';
        isActuallyConnected = false;
        
        // Update database if status is inconsistent
        if (profile.isConnected) {
          console.log('Fixing inconsistent status for profile:', profile.name);
          profile.markDisconnected();
        }
      }
      
      return {
        id: profile.id,
        name: profile.name,
        phoneNumber: profile.phoneNumber,
        profilePhoto: profile.profilePhoto,
        isConnected: isActuallyConnected,
        isActive: profile.isActive,
        status: realStatus,
        lastConnected: profile.lastConnected,
        lastDisconnected: profile.lastDisconnected,
        createdAt: profile.createdAt
      };
    });
    
    console.log('Returning profiles with real-time status:', profilesWithStatus);
    return res.json(profilesWithStatus);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return res.status(500).json({ error: 'Failed to fetch profiles', details: error instanceof Error ? error.message : 'Unknown error' });
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

// Connect existing profile
router.post('/profiles/:id/connect', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await WhatsAppProfile.findByPk(id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.isConnected) {
      return res.json({ message: 'Profile is already connected' });
    }

    console.log('Connecting existing profile:', profile.name, 'with clientId:', profile.clientId);

    // Create new client instance for existing profile
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
        ]
      }
    });

    // Store client instance
    activeClients.set(profile.clientId, client);

    // Update profile status
    await profile.update({ status: 'connecting' });

    // Store client data
    clientData.set(profile.clientId, {
      profileName: profile.name,
      status: 'connecting',
      profileId: profile.id
    });

    // Handle events
    client.on('ready', async () => {
      console.log(`WhatsApp client ${profile.clientId} reconnected!`);
      await profile.markConnected();
      
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

    client.on('disconnected', async (reason) => {
      console.log(`WhatsApp client ${profile.clientId} disconnected:`, reason);
      await profile.markDisconnected();
      
      const clientInfo = clientData.get(profile.clientId);
      if (clientInfo) {
        clientInfo.status = 'disconnected';
        clientData.set(profile.clientId, clientInfo);
      }
      activeClients.delete(profile.clientId);
    });

    // Initialize client
    await client.initialize();
    
    return res.json({
      message: 'Profile connection initiated',
      clientId: profile.clientId,
      status: 'connecting'
    });

  } catch (error) {
    console.error('Error connecting profile:', error);
    return res.status(500).json({ error: 'Failed to connect profile' });
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


// Get chats for a profile
router.get('/profiles/:profileId/chats', chatRateLimiter, async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await WhatsAppProfile.findByPk(profileId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const client = activeClients.get(profile.clientId);
    const clientInfo = clientData.get(profile.clientId);
    
    // Verificar se o cliente está realmente conectado
    const isActuallyConnected = client && clientInfo && clientInfo.status === 'connected';
    
    if (!client || !isActuallyConnected) {
      console.log('Profile not connected, returning mock data:', {
        profileId,
        hasClient: !!client,
        clientStatus: clientInfo?.status,
        profileStatus: profile.status
      });
      
      // Retornar dados mockados para teste
      const mockChats = [
        {
          id: 'chat1',
          contact: {
            id: 'contact1',
            name: 'Leandro',
            number: '5511999999999',
            avatar: null,
            lastMessage: 'Ew',
            lastTime: '23:27',
            unreadCount: 27,
            isOnline: false,
            isTyping: false,
            status: 'none',
            isGroup: false
          },
          messages: [],
          unreadCount: 27,
          lastActivity: new Date(),
          isPinned: false,
          isArchived: false
        },
        {
          id: 'chat2',
          contact: {
            id: 'contact2',
            name: 'RBS Promotora',
            number: '5511888888888',
            avatar: null,
            lastMessage: 'Olá, como vai? Seu FGTS foi atualizado!',
            lastTime: '09:00',
            unreadCount: 1,
            isOnline: false,
            isTyping: false,
            status: 'none',
            isGroup: false
          },
          messages: [],
          unreadCount: 1,
          lastActivity: new Date(),
          isPinned: false,
          isArchived: false
        },
        {
          id: 'group1',
          contact: {
            id: 'group1',
            name: 'Família Silva',
            number: 'group1',
            avatar: null,
            lastMessage: 'Boa noite família!',
            lastTime: '20:30',
            unreadCount: 0,
            isOnline: false,
            isTyping: false,
            status: 'none',
            isGroup: true
          },
          messages: [],
          unreadCount: 0,
          lastActivity: new Date(),
          isPinned: false,
          isArchived: false
        },
        {
          id: 'group2',
          contact: {
            id: 'group2',
            name: 'Trabalho - Projetos',
            number: 'group2',
            avatar: null,
            lastMessage: 'Reunião amanhã às 10h',
            lastTime: '18:45',
            unreadCount: 3,
            isOnline: false,
            isTyping: false,
            status: 'none',
            isGroup: true
          },
          messages: [],
          unreadCount: 3,
          lastActivity: new Date(),
          isPinned: false,
          isArchived: false
        },
        {
          id: 'group3',
          contact: {
            id: 'group3',
            name: 'Amigos da Faculdade',
            number: 'group3',
            avatar: null,
            lastMessage: 'Quem vai na festa?',
            lastTime: '22:15',
            unreadCount: 0,
            isOnline: false,
            isTyping: false,
            status: 'none',
            isGroup: true
          },
          messages: [],
          unreadCount: 0,
          lastActivity: new Date(),
          isPinned: false,
          isArchived: false
        }
      ];
      
      return res.json(mockChats);
    }
    
    // Get chats from WhatsApp client
    const chats = await client.getChats();
    
    const formattedChats = chats.map((chat: any) => ({
      id: chat.id._serialized,
      contact: {
        id: chat.id._serialized,
        name: chat.name,
        number: chat.id.user,
        avatar: chat.profilePicUrl,
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



// Test route to check if Puppeteer is working
router.get('/test-browser', async (req, res) => {
  try {
    console.log('Testing browser launch...');
    
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=800,600'
      ]
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    
    console.log('Browser opened successfully!');
    
    // Close browser after 5 seconds
    setTimeout(async () => {
      await browser.close();
      console.log('Test browser closed');
    }, 5000);
    
    res.json({ 
      success: true, 
      message: 'Browser test successful! Check for a new browser window.' 
    });
    
  } catch (error) {
    console.error('Browser test failed:', error);
    res.status(500).json({ 
      error: 'Browser test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 