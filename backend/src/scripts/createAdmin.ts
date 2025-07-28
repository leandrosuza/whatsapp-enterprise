import { sequelize } from '../config/database';
import User from '../models/User';

async function createAdminUser() {
  try {
    // Sync database
    await sequelize.sync({ force: false });
    console.log('Database synced successfully');

    // Check if admin already exists
    const existingAdmin = await User.findByEmail('admin@gmail.com');
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = await User.createAdmin(
      'admin@gmail.com',
      'admin123',
      'Administrator'
    );

    console.log('Admin user created successfully:', {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser(); 