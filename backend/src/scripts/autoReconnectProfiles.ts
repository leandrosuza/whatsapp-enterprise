import { sequelize } from '../config/database';
import WhatsAppProfile from '../models/WhatsAppProfile';
import { Client, LocalAuth } from 'whatsapp-web.js';
import path from 'path';

// Store active WhatsApp clients (same as in routes/whatsapp.ts)
const activeClients = new Map<string, any>();
const clientData = new Map<string, {
  profileName: string;
  phoneNumber?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'qr_ready';
  qrCode?: string;
  profileId?: number;
}>();

async function autoReconnectProfiles() {
  try {
    console.log('🔄 Auto-reconnecting WhatsApp profiles...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Get all connected profiles
    const connectedProfiles = await WhatsAppProfile.findAll({
      where: {
        status: 'connected',
        isConnected: true
      }
    });
    
    console.log(`📋 Found ${connectedProfiles.length} connected profiles to reconnect`);
    
    if (connectedProfiles.length === 0) {
      console.log('ℹ️ No connected profiles found');
      return;
    }
    
    // Reconnect each profile
    for (const profile of connectedProfiles) {
      try {
        console.log(`🔄 Reconnecting profile: ${profile.name} (ID: ${profile.id})`);
        
        // Create WhatsApp client
        const client = new Client({
          authStrategy: new LocalAuth({ clientId: profile.clientId }),
          puppeteer: {
            headless: true, // Run in headless mode for auto-reconnect
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
        
        // Handle events
        client.on('ready', async () => {
          console.log(`✅ Profile ${profile.name} reconnected successfully!`);
          
          // Update client data
          const clientInfo = clientData.get(profile.clientId);
          if (clientInfo) {
            clientInfo.status = 'connected';
            clientInfo.phoneNumber = client.info?.wid?.user;
            clientData.set(profile.clientId, clientInfo);
          }
          
          // Update profile status
          await profile.update({ 
            status: 'connected',
            isConnected: true,
            lastConnected: new Date()
          });
        });
        
        client.on('error', async (error) => {
          console.error(`❌ Error reconnecting profile ${profile.name}:`, error);
          
          // Update client data
          const clientInfo = clientData.get(profile.clientId);
          if (clientInfo) {
            clientInfo.status = 'error';
            clientData.set(profile.clientId, clientInfo);
          }
          
          // Update profile status
          await profile.update({ 
            status: 'error',
            isConnected: false,
            lastDisconnected: new Date()
          });
          
          // Remove from active clients
          activeClients.delete(profile.clientId);
        });
        
        client.on('disconnected', async (reason) => {
          console.log(`🔌 Profile ${profile.name} disconnected:`, reason);
          
          // Update client data
          const clientInfo = clientData.get(profile.clientId);
          if (clientInfo) {
            clientInfo.status = 'disconnected';
            clientData.set(profile.clientId, clientInfo);
          }
          
          // Update profile status
          await profile.update({ 
            status: 'disconnected',
            isConnected: false,
            lastDisconnected: new Date()
          });
          
          // Remove from active clients
          activeClients.delete(profile.clientId);
        });
        
        // Initialize client
        console.log(`🚀 Initializing client for profile ${profile.name}...`);
        await client.initialize();
        
        console.log(`✅ Client initialized for profile ${profile.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to reconnect profile ${profile.name}:`, error);
        
        // Update profile status to error
        await profile.update({ 
          status: 'error',
          isConnected: false,
          lastDisconnected: new Date()
        });
      }
    }
    
    console.log('✅ Auto-reconnect process completed');
    console.log(`📊 Active clients: ${activeClients.size}`);
    console.log(`📊 Client data entries: ${clientData.size}`);
    
  } catch (error) {
    console.error('❌ Error in auto-reconnect process:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the auto-reconnect
autoReconnectProfiles(); 