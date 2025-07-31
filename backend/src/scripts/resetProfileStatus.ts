import WhatsAppProfile from '../models/WhatsAppProfile';
import { logger } from '../utils/logger';

export async function resetProfileStatus(): Promise<void> {
  try {
    console.log('🔄 Resetting profile status on startup...');
    
    // Get all profiles
    const profiles = await WhatsAppProfile.findAll();
    console.log(`📋 Found ${profiles.length} profiles to reset`);
    
    // Reset all profiles to disconnected status
    for (const profile of profiles) {
      if (profile.isConnected || profile.status === 'connected') {
        console.log(`🔄 Resetting profile ${profile.name} (ID: ${profile.id}) to disconnected`);
        
        await profile.update({
          status: 'disconnected',
          isConnected: false,
          lastDisconnected: new Date()
        });
        
        console.log(`✅ Profile ${profile.name} reset to disconnected`);
      }
    }
    
    console.log('✅ All profile statuses reset successfully');
  } catch (error) {
    console.error('❌ Error resetting profile status:', error);
    logger.error('Failed to reset profile status on startup', { error });
  }
}

// Run if called directly
if (require.main === module) {
  resetProfileStatus()
    .then(() => {
      console.log('✅ Profile status reset completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Profile status reset failed:', error);
      process.exit(1);
    });
} 