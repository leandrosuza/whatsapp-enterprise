import { sequelize } from '../infrastructure/database/database';
import { QueryTypes } from 'sequelize';

async function addSharingFields() {
  try {
    console.log('🔄 Adding sharing fields to whatsapp_profiles table...');

    // Verificar se os campos já existem
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(whatsapp_profiles)",
      { type: QueryTypes.SELECT }
    );

    const existingColumns = (tableInfo as any[]).map((col: any) => col.name);
    
    // Adicionar campos se não existirem
    const fieldsToAdd = [
      {
        name: 'is_shared',
        sql: 'ALTER TABLE whatsapp_profiles ADD COLUMN is_shared BOOLEAN DEFAULT FALSE'
      },
      {
        name: 'share_token',
        sql: 'ALTER TABLE whatsapp_profiles ADD COLUMN share_token VARCHAR(255)'
      },
      {
        name: 'share_url',
        sql: 'ALTER TABLE whatsapp_profiles ADD COLUMN share_url TEXT'
      },
      {
        name: 'shared_at',
        sql: 'ALTER TABLE whatsapp_profiles ADD COLUMN shared_at DATETIME'
      }
    ];

    for (const field of fieldsToAdd) {
      if (!existingColumns.includes(field.name)) {
        console.log(`📝 Adding field: ${field.name}`);
        await sequelize.query(field.sql);
        console.log(`✅ Field ${field.name} added successfully`);
      } else {
        console.log(`ℹ️ Field ${field.name} already exists`);
      }
    }

    console.log('✅ All sharing fields added successfully!');
    
    // Verificar estrutura final da tabela
    const finalTableInfo = await sequelize.query(
      "PRAGMA table_info(whatsapp_profiles)",
      { type: QueryTypes.SELECT }
    );
    
    console.log('📋 Final table structure:');
    (finalTableInfo as any[]).forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error adding sharing fields:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addSharingFields()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export default addSharingFields; 