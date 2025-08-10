import { Router } from 'express';
import { Client } from 'whatsapp-web.js';
import WhatsAppProfile from '../../core/entities/WhatsAppProfile';
import { logger } from '../../infrastructure/utils/logger';

const router = Router();

router.get('/overview', (req, res) => {
  res.json({ success: true, message: 'Get analytics overview - to be implemented' });
});

// Endpoint para obter estatísticas das conversas em tempo real
router.get('/conversations/stats', async (req, res) => {
  try {
    const { profileId } = req.query;
    
    if (!profileId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Profile ID is required' 
      });
    }

    // Buscar o perfil no banco de dados
    const profile = await WhatsAppProfile.findByPk(profileId as string);
    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Profile not found' 
      });
    }

    // Verificar se o cliente está ativo
    const activeClients = global.activeClients;
    const client = activeClients.get(profile.clientId);
    
    if (!client) {
      return res.status(400).json({ 
        success: false, 
        error: 'WhatsApp client not connected' 
      });
    }

    // Obter todos os chats
    const chats = await client.getChats();
    
    // Calcular estatísticas
    const stats = {
      totalConversations: chats.length,
      unreadMessages: 0,
      activeProfiles: 1, // Sempre 1 para o perfil atual
      highPriority: 0,
      lastUpdated: new Date().toISOString()
    };

    // Calcular mensagens não lidas e prioridade alta
    for (const chat of chats) {
      const unreadCount = chat.unreadCount || 0;
      stats.unreadMessages += unreadCount;
      
      // Considerar alta prioridade se tiver mais de 5 mensagens não lidas
      if (unreadCount > 5) {
        stats.highPriority++;
      }
    }

    logger.info(`Conversation stats calculated for profile ${profileId}:`, stats);
    
    return res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting conversation stats:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get conversation statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/conversations', (req, res) => {
  res.json({ success: true, message: 'Get conversation analytics - to be implemented' });
});

export default router; 