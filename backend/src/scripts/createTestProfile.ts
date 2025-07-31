import { sequelize } from '../config/database';
import { initializeAssociations } from '../models';
import WhatsAppProfile from '../models/WhatsAppProfile';
import User from '../models/User';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

async function createTestProfile() {
  try {
    // Initialize database and associations
    initializeAssociations();
    await sequelize.sync({ force: false });
    console.log('Database synced successfully');

    // Check if admin user exists, create if not
    let adminUser = await User.findByEmail('admin@gmail.com');
    if (!adminUser) {
      console.log('Creating admin user...');
      adminUser = await User.createAdmin(
        'admin@gmail.com',
        'admin123',
        'Administrator'
      );
      console.log('Admin user created:', adminUser.id);
    } else {
      console.log('Admin user already exists:', adminUser.id);
    }

    // Check if test profile already exists
    const existingProfile = await WhatsAppProfile.findOne({
      where: { name: 'Test Profile' }
    });

    if (existingProfile) {
      console.log('Test profile already exists:', {
        id: existingProfile.id,
        name: existingProfile.name,
        clientId: existingProfile.clientId
      });
      return;
    }

    // Create test profile
    const clientId = uuidv4();
    const sessionPath = path.join(__dirname, '..', '..', 'sessions', clientId);

    const testProfile = await WhatsAppProfile.create({
      userId: adminUser.id,
      name: 'Test Profile',
      clientId: clientId,
      sessionPath: sessionPath,
      phoneNumber: '+5511999999999',
      isConnected: false,
      isActive: true,
      status: 'disconnected'
    });

    console.log('Test profile created successfully:', {
      id: testProfile.id,
      name: testProfile.name,
      clientId: testProfile.clientId,
      userId: testProfile.userId
    });

    // List all profiles
    const allProfiles = await WhatsAppProfile.findAll();
    console.log('All profiles in database:', allProfiles.map(p => ({
      id: p.id,
      name: p.name,
      clientId: p.clientId,
      isActive: p.isActive,
      isConnected: p.isConnected
    })));

    process.exit(0);
  } catch (error) {
    console.error('Error creating test profile:', error);
    process.exit(1);
  }
}

createTestProfile(); 