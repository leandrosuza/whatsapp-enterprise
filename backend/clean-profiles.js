const { Sequelize } = require('sequelize');
const path = require('path');

// Configuração do banco de dados
const dbPath = path.join(__dirname, 'database', 'whatsapp_enterprise.sqlite');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

async function cleanProfiles() {
  try {
    console.log('🧹 Cleaning old profiles...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Listar todos os perfis
    const [profiles] = await sequelize.query('SELECT * FROM whatsapp_profiles ORDER BY id DESC');
    console.log('📱 Found profiles:', profiles.length);
    
    if (profiles.length > 0) {
      console.log('📋 Current profiles:');
      profiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. ID: ${profile.id}, Name: ${profile.name}, Status: ${profile.status}`);
      });
      
      // Manter apenas o perfil mais recente (ID mais alto)
      const latestProfile = profiles[0]; // Já ordenado por ID DESC
      console.log(`\n✅ Keeping latest profile: ID ${latestProfile.id} - ${latestProfile.name}`);
      
      // Deletar todos os outros perfis
      if (profiles.length > 1) {
        const otherProfileIds = profiles.slice(1).map(p => p.id);
        console.log(`🗑️ Deleting ${otherProfileIds.length} old profiles:`, otherProfileIds);
        
        for (const profileId of otherProfileIds) {
          await sequelize.query('DELETE FROM whatsapp_profiles WHERE id = ?', {
            replacements: [profileId]
          });
          console.log(`  ✅ Deleted profile ID: ${profileId}`);
        }
      }
      
      // Verificar resultado
      const [remainingProfiles] = await sequelize.query('SELECT * FROM whatsapp_profiles');
      console.log(`\n📱 Remaining profiles: ${remainingProfiles.length}`);
      
      if (remainingProfiles.length > 0) {
        console.log('✅ Final profile:');
        console.log(`  ID: ${remainingProfiles[0].id}`);
        console.log(`  Name: ${remainingProfiles[0].name}`);
        console.log(`  Status: ${remainingProfiles[0].status}`);
      }
    } else {
      console.log('⚠️ No profiles found to clean');
    }

  } catch (error) {
    console.error('❌ Error cleaning profiles:', error);
  } finally {
    await sequelize.close();
  }
}

console.log('🚀 Starting profile cleanup...\n');
cleanProfiles(); 