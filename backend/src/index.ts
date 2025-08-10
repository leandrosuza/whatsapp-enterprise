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
import { connectDatabase } from './infrastructure/database/database';
import { logger } from './infrastructure/utils/logger';

// Import models
import { initializeAssociations } from './core/entities';
import sequelize from './core/entities';

// Import routes
import authRoutes from './presentation/routes/auth';
import userRoutes from './presentation/routes/users';
import whatsappRoutes from './presentation/routes/whatsapp';
import contactRoutes from './presentation/routes/contacts';
import conversationRoutes from './presentation/routes/conversations';
import automationRoutes from './presentation/routes/automations';
import campaignRoutes from './presentation/routes/campaigns';
import aiRoutes from './presentation/routes/ai';
import analyticsRoutes from './presentation/routes/analytics';
import dddRoutes from './presentation/routes/ddds';
import tagRoutes from './presentation/routes/tags';
import databaseRoutes from './presentation/routes/database';

// Import middleware
import { errorHandler } from './infrastructure/middleware/errorHandler';
import { notFound } from './infrastructure/middleware/notFound';
import { rateLimiter } from './infrastructure/middleware/rateLimiter';
import { autoReconnectWhatsAppProfiles } from './infrastructure/utils/whatsappAutoReconnect';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 15000, // Reduced from 30000 to 15000 for better performance
  pingInterval: 8000, // Reduced from 15000 to 8000 for better performance
  maxHttpBufferSize: 1e6, // Kept to optimize memory
  allowEIO3: true,
  transports: ['websocket'], // WebSocket only for maximum speed
  upgradeTimeout: 10000, // Reduced to 10 seconds
  allowUpgrades: true,
  perMessageDeflate: false, // Disable compression to reduce latency
  httpCompression: false // Disable HTTP compression to reduce latency
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
app.use('/api/ddds', dddRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/database', databaseRoutes);

// Shared page route for WhatsApp profiles
app.get('/shared/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    // Import WhatsAppProfile
    const { default: WhatsAppProfile } = await import('./core/entities/WhatsAppProfile');
    
    // Find profile by share token
    const profile = await WhatsAppProfile.findOne({
      where: { shareToken: token }
    });
    
    if (!profile) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Perfil Não Encontrado</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        </head>
        <body class="bg-gray-50">
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                    </div>
                    <h2 class="text-xl font-semibold text-gray-800 mb-2">Perfil Não Encontrado</h2>
                    <p class="text-gray-600 mb-4">O token de compartilhamento não é válido.</p>
                    <div class="bg-white rounded-lg p-4 shadow-sm max-w-md mx-auto">
                        <p class="text-sm text-gray-600">
                            Este link de compartilhamento não existe ou foi removido.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `);
    }
    
    // Check if sharing is enabled
    if (!profile.isShared) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Compartilhamento Desabilitado</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        </head>
        <body class="bg-gray-50">
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-lock text-2xl text-yellow-600"></i>
                    </div>
                    <h2 class="text-xl font-semibold text-gray-800 mb-2">Compartilhamento Desabilitado</h2>
                    <p class="text-gray-600 mb-4">Perfil: ${profile.name}</p>
                    <div class="bg-white rounded-lg p-4 shadow-sm max-w-md mx-auto">
                        <p class="text-sm text-gray-600">
                            O compartilhamento deste perfil foi desabilitado pelo administrador.
                        </p>
                        <div class="mt-4 p-3 bg-yellow-50 rounded-lg">
                            <p class="text-xs text-yellow-700">
                                <i class="fas fa-info-circle mr-1"></i>
                                Entre em contato com o administrador para reativar o compartilhamento.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `);
    }
    
    // Redirect to the frontend shared page with the token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/shared/${token}`);
  } catch (error) {
    console.error('❌ Error in shared route:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Erro Interno</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      </head>
      <body class="bg-gray-50">
          <div class="min-h-screen flex items-center justify-center">
              <div class="text-center">
                  <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                  </div>
                  <h2 class="text-xl font-semibold text-gray-800 mb-2">Erro Interno</h2>
                  <p class="text-gray-600 mb-4">Ocorreu um erro ao processar sua solicitação.</p>
                  <div class="bg-white rounded-lg p-4 shadow-sm max-w-md mx-auto">
                      <p class="text-sm text-gray-600">
                          Tente novamente mais tarde ou entre em contato com o suporte.
                      </p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `);
  }
});

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

  // ULTRA-OPTIMIZED message handler - INSTANT
  socket.on('whatsapp_message', (data) => {
    // INSTANT processing without unnecessary checks
    if (data.profileId && data.data?.chatId) {
      const roomName = `whatsapp-${data.profileId}`;
      
      // Emit IMMEDIATELY without logging in production
      socket.to(roomName).emit('whatsapp_message', data);
      
      // Log only in development and only every 10 messages to not impact performance
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        logger.info(`⚡ INSTANT message processed for room: ${roomName}`);
      }
    }
  });

  // Handler to mark messages as read in real WhatsApp
  socket.on('mark_as_read', async (data) => {
    try {
      const { profileId, chatId, messageIds } = data;
      
      // Get the WhatsApp client for this profile
      const profile = await WhatsAppProfile.findByPk(profileId);
      if (!profile || !profile.isConnected) {
        socket.emit('error', { message: 'Profile not connected' });
        return;
      }

      // Import WhatsApp client
      const { Client } = require('whatsapp-web.js');
      const client = global.activeClients?.get(profile.clientId);
      
      if (!client) {
        socket.emit('error', { message: 'WhatsApp client not found' });
        return;
      }

      // Mark messages as read
      const chat = await client.getChatById(chatId);
      await chat.sendSeen();
      
      // Emit success event
      socket.emit('messages_marked_read', { success: true, chatId });
      
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
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
import WhatsAppProfile from './core/entities/WhatsAppProfile';

// Function to reconnect all connected WhatsApp profiles
async function reconnectConnectedProfiles() {
  try {
    logger.info('🔄 Starting WhatsApp profiles reconnection process...');
    
    // ⚠️ IMPORTANT: Auto-reconnection disabled by default
    // This prevents bugs with automatic browsers still open
    logger.info('ℹ️ Auto-reconnection disabled by default to prevent bugs');
    logger.info('ℹ️ Profiles must be connected manually by the user');
    
    // Return without doing anything
    return;
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

    // 🔧 IMPORTANT: Turn off all profiles when starting the system
    // This prevents bugs with automatic browsers still open
    logger.info('🔄 Turning off all WhatsApp profiles when starting the system...');
    await WhatsAppProfile.update(
      { 
        status: 'disconnected',
        isConnected: false,
        lastDisconnected: new Date()
      },
      { 
        where: {
          isConnected: true
        }
      }
    );
    logger.info('✅ All profiles have been safely turned off');

    // Clear global client data
    if (global.activeClients) {
      global.activeClients.clear();
    }
    if (global.clientData) {
      global.clientData.clear();
    }
    logger.info('✅ Global client data cleared');

    // Profile status management initialized
    logger.info('✅ Profile status management initialized');

    // ❌ REMOVED: Automatic auto-reconnect on startup
    // Profiles must now be connected manually by the user
    logger.info('ℹ️ Auto-reconnect disabled - profiles must be connected manually');

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