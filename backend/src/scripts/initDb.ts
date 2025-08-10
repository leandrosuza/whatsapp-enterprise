import { sequelize } from '../infrastructure/database/database';
import { initializeAssociations } from '../core/entities';
import '../core/entities/DDD'; // Import DDD model to ensure it's registered
import '../core/entities/Tag'; // Import Tag model to ensure it's registered

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Initialize model associations
    initializeAssociations();
    
    // Sync all models with database
    await sequelize.sync({ force: true }); // Use force: true to recreate tables
    
    console.log('✅ Database initialized successfully!');
    console.log('📊 Tables created/updated:');
    console.log('   - users');
    console.log('   - contacts');
    console.log('   - whatsapp_profiles');
    console.log('   - tags');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase(); 