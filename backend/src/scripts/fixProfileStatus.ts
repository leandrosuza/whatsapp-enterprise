import WhatsAppProfile from '../models/WhatsAppProfile';
import { sequelize } from '../config/database';

export async function fixProfileStatus(): Promise<void> {
  try {
    console.log('🔧 Fixing profile status...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Get all profiles
    const profiles = await WhatsAppProfile.findAll();
    console.log(`📋 Found ${profiles.length} profiles`);
    
    for (const profile of profiles) {
      console.log(`\n📊 Profile: ${profile.name} (ID: ${profile.id})`);
      console.log(`   Current status: ${profile.status}`);
      console.log(`   isConnected: ${profile.isConnected}`);
      console.log(`   clientId: ${profile.clientId}`);
      
      // If status is 'connecting' but not actually connected, fix it
      if (profile.status === 'connecting' && !profile.isConnected) {
        console.log(`   🔧 Fixing status from 'connecting' to 'disconnected'`);
        await profile.update({
          status: 'disconnected',
          isConnected: false
        });
        console.log(`   ✅ Status fixed`);
      } else if (profile.status === 'connected' && !profile.isConnected) {
        console.log(`   🔧 Fixing status from 'connected' to 'disconnected'`);
        await profile.update({
          status: 'disconnected',
          isConnected: false
        });
        console.log(`   ✅ Status fixed`);
      } else {
        console.log(`   ✅ Status is correct`);
      }
    }
    
    console.log('\n✅ Profile status fix completed');
  } catch (error) {
    console.error('❌ Error fixing profile status:', error);
  }
}

// Run if called directly
if (require.main === module) {
  fixProfileStatus()
    .then(() => {
      console.log('✅ Profile status fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Profile status fix failed:', error);
      process.exit(1);
    });
} 