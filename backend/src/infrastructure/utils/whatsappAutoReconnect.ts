import { sequelize } from '../database/database';
import WhatsAppProfile from '../../core/entities/WhatsAppProfile';
import { Client, LocalAuth } from 'whatsapp-web.js';

// Import the active clients and client data from the WhatsApp routes
// We need to make these available globally or pass them as parameters
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

// Function to check if a profile is really available
async function isProfileAvailable(profile: WhatsAppProfile): Promise<boolean> {
  try {
    // Check if there's already an active client for this profile
    const existingClient = global.activeClients.get(profile.clientId);
    if (existingClient) {
      // If client already exists, check if it's connected
      const clientInfo = global.clientData.get(profile.clientId);
      if (clientInfo && clientInfo.status === 'connected') {
        console.log(`✅ Profile ${profile.name} already connected, skipping reconnection`);
        return false; // No need to reconnect
      }
    }

    // Check if profile has valid data for reconnection
    if (!profile.clientId || !profile.name) {
      console.log(`⚠️ Profile ${profile.name} missing required data for reconnection`);
      return false;
    }

    // Check if profile was recently disconnected (last 5 minutes)
    if (profile.lastDisconnected) {
      const lastDisconnected = new Date(profile.lastDisconnected);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastDisconnected.getTime()) / (1000 * 60);
      
      if (diffMinutes < 5) {
        console.log(`⏳ Profile ${profile.name} was disconnected recently (${diffMinutes.toFixed(1)} minutes ago), skipping reconnection`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Error checking profile availability for ${profile.name}:`, error);
    return false;
  }
}

export async function autoReconnectWhatsAppProfiles(): Promise<void> {
  try {
    console.log('🔄 Auto-reconnect function called...');
    
    // ⚠️ IMPORTANT: Auto-reconnect disabled by default
    // This prevents bugs with automatic browsers still open
    console.log('ℹ️ Auto-reconnect disabled by default to prevent bugs');
    console.log('ℹ️ Profiles must be connected manually by the user');
    
    // Return without doing anything
    return;
    
    // Commented code below would be used if auto-reconnect was enabled
    /*
    // Get all connected profiles
    const connectedProfiles = await WhatsAppProfile.findAll({
      where: {
        status: 'connected',
        isConnected: true
      }
    });
    
    console.log(`📋 Found ${connectedProfiles.length} connected profiles to check`);
    
    if (connectedProfiles.length === 0) {
      console.log('ℹ️ No connected profiles found');
      return;
    }
    
    // Filter only profiles that really need reconnection
    const profilesToReconnect = [];
    for (const profile of connectedProfiles) {
      if (await isProfileAvailable(profile)) {
        profilesToReconnect.push(profile);
      }
    }
    
    console.log(`🔄 Attempting to reconnect ${profilesToReconnect.length} profiles out of ${connectedProfiles.length} total`);
    
    if (profilesToReconnect.length === 0) {
      console.log('ℹ️ No profiles need reconnection at this time');
      return;
    }
    
    // Reconnect each profile
    for (const profile of profilesToReconnect) {
      try {
        console.log(`🔄 Reconnecting profile: ${profile.name} (ID: ${profile.id})`);
        
        // Check again if profile is still available before reconnecting
        if (!(await isProfileAvailable(profile))) {
          console.log(`⏭️ Skipping reconnection for profile ${profile.name} - no longer available`);
          continue;
        }
        
        // Create WhatsApp client
        const client = new Client({
          authStrategy: new LocalAuth({ clientId: profile.clientId }),
          puppeteer: {
            headless: true, // Run in headless mode for auto-reconnect
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
            timeout: 30000
          }
        });
        
        // Store client instance
        global.activeClients.set(profile.clientId, client);
        
        // Store client data
        global.clientData.set(profile.clientId, {
          profileName: profile.name,
          status: 'connecting',
          profileId: profile.id
        });
        
        // Handle events
        client.on('ready', async () => {
          console.log(`✅ Profile ${profile.name} reconnected successfully!`);
          
          // Update client data
          const clientInfo = global.clientData.get(profile.clientId);
          if (clientInfo) {
            clientInfo.status = 'connected';
            clientInfo.phoneNumber = client.info?.wid?.user;
            global.clientData.set(profile.clientId, clientInfo);
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
          const clientInfo = global.clientData.get(profile.clientId);
          if (clientInfo) {
            clientInfo.status = 'error';
            global.clientData.set(profile.clientId, clientInfo);
          }
          
          // Update profile status
          await profile.update({ 
            status: 'error',
            isConnected: false,
            lastDisconnected: new Date()
          });
          
          // Remove from active clients
          global.activeClients.delete(profile.clientId);
        });
        
        client.on('disconnected', async (reason) => {
          console.log(`🔌 Profile ${profile.name} disconnected:`, reason);
          
          // Update client data
          const clientInfo = global.clientData.get(profile.clientId);
          if (clientInfo) {
            clientInfo.status = 'disconnected';
            global.clientData.set(profile.clientId, clientInfo);
          }
          
          // Update profile status
          await profile.update({ 
            status: 'disconnected',
            isConnected: false,
            lastDisconnected: new Date()
          });
          
          // Remove from active clients
          global.activeClients.delete(profile.clientId);
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
        
        // Remove from active clients if it was added
        global.activeClients.delete(profile.clientId);
      }
    }
    
    console.log('✅ Auto-reconnect process completed');
    console.log(`📊 Active clients: ${global.activeClients.size}`);
    console.log(`📊 Client data entries: ${global.clientData.size}`);
    */
    
  } catch (error) {
    console.error('❌ Error in auto-reconnect process:', error);
  }
} 