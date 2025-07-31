import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// Import configurations
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

// Import models
import { initializeAssociations } from './models';
import sequelize from './models';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import whatsappRoutes from './routes/whatsapp';
import contactRoutes from './routes/contacts';
import conversationRoutes from './routes/conversations';
import automationRoutes from './routes/automations';
import campaignRoutes from './routes/campaigns';
import aiRoutes from './routes/ai';
import analyticsRoutes from './routes/analytics';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { rateLimiter } from './middleware/rateLimiter';
import { autoReconnectWhatsAppProfiles } from './utils/whatsappAutoReconnect';
import { resetProfileStatus } from './scripts/resetProfileStatus';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);

// Socket.IO connection
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-room', (userId: string) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined room`);
  });

  socket.on('join-whatsapp', (profileId: string) => {
    socket.join(`whatsapp-${profileId}`);
    logger.info(`Client joined WhatsApp room for profile ${profileId}`);
  });

  // Handler para mensagens de teste do frontend
  socket.on('whatsapp_message', (data) => {
    logger.info(`📨 Test message received from client: ${socket.id}`, {
      profileId: data.profileId,
      chatId: data.data?.chatId,
      text: data.data?.text?.substring(0, 30)
    });
    
    // Echo da mensagem de volta para o cliente (para testes)
    socket.emit('whatsapp_message', data);
    
    // Se for uma mensagem de teste, também emitir para a sala do WhatsApp
    if (data.profileId) {
      const roomName = `whatsapp-${data.profileId}`;
      socket.to(roomName).emit('whatsapp_message', data);
      logger.info(`📡 Echoed test message to room: ${roomName}`);
    }
  });

  // Handler para marcar mensagens como lidas no WhatsApp real
  socket.on('markAsRead', async ({ chatId, profileId }) => {
    try {
      logger.info(`📖 Marking messages as read: ${chatId} for profile ${profileId}`);
      
      const profile = await WhatsAppProfile.findByPk(profileId);
      if (!profile) {
        logger.error(`❌ Profile not found for markAsRead: ${profileId}`);
        return;
      }
      
      const client = global.activeClients?.get(profile.clientId);
      if (!client) {
        logger.error(`❌ Client not found for markAsRead: ${profile.clientId}`);
        return;
      }
      
      // Enviar sendSeen para o WhatsApp real
      await client.sendSeen(chatId);
      logger.info(`✅ sendSeen sent to WhatsApp for chat: ${chatId}`);
      
      // Emitir confirmação para o frontend
      socket.emit('markAsReadConfirmed', { chatId, profileId });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Error marking as read: ${errorMessage}`);
      socket.emit('markAsReadError', { chatId, profileId, error: errorMessage });
    }
  });

  // Handler para indicador de digitação
  socket.on('typing', async ({ chatId, profileId, isTyping }) => {
    try {
      const profile = await WhatsAppProfile.findByPk(profileId);
      if (!profile) return;
      
      const client = global.activeClients?.get(profile.clientId);
      if (!client) return;
      
      if (isTyping) {
        await client.sendPresenceAvailable();
        await client.sendStateTyping(chatId);
      } else {
        await client.sendStateRecording(chatId);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Error handling typing indicator: ${errorMessage}`);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available globally for WhatsApp events
declare global {
  var io: any;
}
global.io = io;

// Import WhatsAppProfile for reconnection
import WhatsAppProfile from './models/WhatsAppProfile';

// Function to reconnect all connected WhatsApp profiles
async function reconnectConnectedProfiles() {
  try {
    logger.info('🔄 Starting WhatsApp profiles reconnection process...');
    
    // Get all profiles that should be connected
    const connectedProfiles = await WhatsAppProfile.findAll({
      where: {
        isConnected: true,
        isActive: true
      }
    });
    
    logger.info(`📱 Found ${connectedProfiles.length} profiles to check`);
    
    // Filtrar apenas perfis que realmente precisam de reconexão
    const profilesToReconnect = [];
    for (const profile of connectedProfiles) {
      // Verificar se já existe um cliente ativo para este perfil
      const existingClient = global.activeClients?.get(profile.clientId);
      if (existingClient) {
        // Se já existe um cliente, verificar se está conectado
        const clientInfo = global.clientData?.get(profile.clientId);
        if (clientInfo && clientInfo.status === 'connected') {
          logger.info(`✅ Profile ${profile.name} already connected, skipping reconnection`);
          continue;
        }
      }

      // Verificar se o perfil tem dados válidos para reconexão
      if (!profile.clientId || !profile.name) {
        logger.warn(`⚠️ Profile ${profile.name} missing required data for reconnection`);
        continue;
      }

      // Verificar se o perfil foi desconectado recentemente (últimos 5 minutos)
      if (profile.lastDisconnected) {
        const lastDisconnected = new Date(profile.lastDisconnected);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastDisconnected.getTime()) / (1000 * 60);
        
        if (diffMinutes < 5) {
          logger.info(`⏳ Profile ${profile.name} was disconnected recently (${diffMinutes.toFixed(1)} minutes ago), skipping reconnection`);
          continue;
        }
      }

      profilesToReconnect.push(profile);
    }
    
    logger.info(`🔄 Attempting to reconnect ${profilesToReconnect.length} profiles out of ${connectedProfiles.length} total`);
    
    if (profilesToReconnect.length === 0) {
      logger.info('ℹ️ No profiles need reconnection at this time');
      return;
    }
    
    for (const profile of profilesToReconnect) {
      try {
        logger.info(`🔄 Reconnecting profile: ${profile.name} (ID: ${profile.id})`);
        
        // Make a request to reconnect the profile
        const response = await fetch(`http://localhost:${PORT}/api/whatsapp/profiles/${profile.id}/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          logger.info(`✅ Successfully reconnected profile: ${profile.name}`);
        } else {
          logger.warn(`⚠️ Failed to reconnect profile: ${profile.name} - Status: ${response.status}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`❌ Error reconnecting profile ${profile.name}: ${errorMessage}`);
      }
    }
    
    logger.info('✅ WhatsApp profiles reconnection process completed');
  } catch (error) {
    logger.error('❌ Error in reconnection process:', error);
  }
}

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Initialize model associations
    initializeAssociations();
    logger.info('✅ Model associations initialized');

    // Sync models with database
    await sequelize.sync({ force: false });
    logger.info('✅ Database models synchronized');

    // Reset profile status on startup
    await resetProfileStatus();
    logger.info('✅ Profile status reset completed');

    // Reconnect all connected WhatsApp profiles
    await reconnectConnectedProfiles();
    logger.info('✅ WhatsApp profiles reconnection process completed');

    // Auto-reconnect WhatsApp profiles
    console.log('🔄 Auto-reconnecting WhatsApp profiles...');
    await autoReconnectWhatsAppProfiles();

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📱 WhatsApp Enterprise API ready!`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// Start the server
startServer();

export { app, io }; 