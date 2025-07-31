import { sequelize } from '../config/database';
import WhatsAppProfile from '../models/WhatsAppProfile';

async function testWhatsAppConnection() {
  try {
    console.log('🔍 Testing WhatsApp connection status...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Get all profiles
    const profiles = await WhatsAppProfile.findAll();
    console.log(`📋 Found ${profiles.length} profiles:`);
    
    profiles.forEach(profile => {
      console.log(`  - ${profile.name} (ID: ${profile.id}):`);
      console.log(`    Status: ${profile.status}`);
      console.log(`    IsConnected: ${profile.isConnected}`);
      console.log(`    ClientID: ${profile.clientId}`);
      console.log(`    Phone: ${profile.phoneNumber || 'Not set'}`);
      console.log(`    Last Connected: ${profile.lastConnected || 'Never'}`);
      console.log(`    Last Disconnected: ${profile.lastDisconnected || 'Never'}`);
      console.log('');
    });
    
    // Check if any profiles are connected
    const connectedProfiles = profiles.filter(p => p.status === 'connected' && p.isConnected);
    console.log(`✅ Connected profiles: ${connectedProfiles.length}`);
    
    if (connectedProfiles.length === 0) {
      console.log('⚠️ No profiles are currently connected!');
      console.log('💡 To fix this:');
      console.log('   1. Go to the admin panel');
      console.log('   2. Create a new WhatsApp profile or reconnect existing one');
      console.log('   3. Scan the QR code with your WhatsApp mobile app');
      console.log('   4. Wait for the connection to be established');
    } else {
      console.log('✅ Found connected profiles - chats should be available');
    }
    
  } catch (error) {
    console.error('❌ Error testing WhatsApp connection:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testWhatsAppConnection(); 