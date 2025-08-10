import { sequelize } from '../infrastructure/database/database';
import { initializeAssociations } from '../core/entities';
import '../core/entities/Tag'; // Import Tag model to ensure it's registered
import Tag from '../core/entities/Tag';

async function seedTags() {
  try {
    console.log('🔄 Seeding tags...');
    
    // Initialize model associations
    initializeAssociations();
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected successfully!');
    
    // Sample tags data
    const sampleTags = [
      { name: 'Important', color: '#EF4444', description: 'Conversas importantes' },
      { name: 'Support', color: '#3B82F6', description: 'Suporte ao cliente' },
      { name: 'Sales', color: '#10B981', description: 'Vendas e leads' },
      { name: 'Urgent', color: '#F59E0B', description: 'Urgente - responder imediatamente' },
      { name: 'Follow-up', color: '#8B5CF6', description: 'Acompanhamento necessário' },
      { name: 'VIP', color: '#EC4899', description: 'Clientes VIP' },
      { name: 'New Lead', color: '#06B6D4', description: 'Novos leads' },
      { name: 'Complaint', color: '#DC2626', description: 'Reclamações' },
      { name: 'Feedback', color: '#059669', description: 'Feedback de clientes' },
      { name: 'Test', color: '#6B7280', description: 'Tags de teste' }
    ];
    
    // Create tags for user ID 1 (assuming admin user)
    for (const tagData of sampleTags) {
      try {
        await Tag.create({
          userId: 1,
          name: tagData.name,
          color: tagData.color,
          description: tagData.description,
          isActive: true,
          usageCount: 0
        });
        console.log(`✅ Created tag: ${tagData.name}`);
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`⚠️ Tag "${tagData.name}" already exists, skipping...`);
        } else {
          console.error(`❌ Error creating tag "${tagData.name}":`, error.message);
        }
      }
    }
    
    console.log('✅ Tags seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding tags:', error);
    process.exit(1);
  }
}

seedTags();
