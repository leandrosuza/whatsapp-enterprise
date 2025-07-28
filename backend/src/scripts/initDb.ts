import { sequelize } from '../config/database';
import User from '../models/User';
import Contact from '../models/Contact';

async function initializeDatabase() {
  try {
    // Sync database
    await sequelize.sync({ force: true });
    console.log('✅ Database synchronized');

    // Create admin user
    const adminUser = await User.createAdmin(
      'admin@gmail.com',
      'admin123',
      'Administrator'
    );
    console.log('✅ Admin user created:', adminUser.email);

    // Create some sample contacts
    const sampleContacts = [
      {
        userId: adminUser.id,
        whatsappId: '5511987654321',
        name: 'João Silva',
        phone: '+55 11 98765-4321',
        email: 'joao.silva@email.com',
        tags: ['cliente', 'vip'],
        category: 'customer' as const,
        status: 'active' as const,
        notes: 'Cliente VIP - Interessado em produtos premium',
        lastContact: new Date(),
        metadata: { source: 'manual', score: 90 }
      },
      {
        userId: adminUser.id,
        whatsappId: '5521998765432',
        name: 'Maria Souza',
        phone: '+55 21 99876-5432',
        email: 'maria.souza@email.com',
        tags: ['lead', 'prospecto'],
        category: 'prospect' as const,
        status: 'active' as const,
        notes: 'Prospecto interessado em demonstração',
        lastContact: new Date(),
        metadata: { source: 'website', score: 70 }
      },
      {
        userId: adminUser.id,
        whatsappId: '5531987651234',
        name: 'Pedro Santos',
        phone: '+55 31 98765-1234',
        email: 'pedro.santos@email.com',
        tags: ['fornecedor'],
        category: 'lead' as const,
        status: 'active' as const,
        notes: 'Fornecedor de produtos eletrônicos',
        lastContact: new Date(),
        metadata: { source: 'referral', score: 50 }
      }
    ];

    await Contact.bulkCreate(sampleContacts);
    console.log('✅ Sample contacts created');

    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin123');
    console.log('\n🔗 Access the admin panel at: http://localhost:3000/admin/login');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

export default initializeDatabase; 