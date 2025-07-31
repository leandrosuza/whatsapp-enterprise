const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Configuração do banco de dados
const dbPath = path.join(__dirname, 'database', 'whatsapp_enterprise.sqlite');
console.log('🗄️ Database path:', dbPath);
console.log('📁 Database file exists:', fs.existsSync(dbPath));
console.log('📊 Database file size:', fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 'N/A');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

async function checkProfiles() {
  try {
    console.log('🔍 Checking database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Verificar se a tabela existe
    const tables = await sequelize.showAllSchemas();
    console.log('📋 Available tables:', tables.map(t => t.name));

    // Listar todas as tabelas usando query direta
    const [tableList] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📋 Tables from sqlite_master:', tableList.map(t => t.name));

    // Verificar perfis
    const [profiles] = await sequelize.query('SELECT * FROM whatsapp_profiles');
    console.log('📱 Profiles in database:', profiles.length);
    
    if (profiles.length > 0) {
      console.log('📋 Profile details:');
      profiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. ID: ${profile.id}, Name: ${profile.name}, Status: ${profile.status}, ClientId: ${profile.clientId}`);
      });
    } else {
      console.log('⚠️ No profiles found in database');
    }

    // Verificar se há algum perfil com status 'connected'
    const connectedProfiles = profiles.filter(p => p.status === 'connected');
    console.log('🟢 Connected profiles:', connectedProfiles.length);
    
    if (connectedProfiles.length > 0) {
      console.log('✅ Found connected profiles:');
      connectedProfiles.forEach(profile => {
        console.log(`  - ${profile.name} (ID: ${profile.id})`);
      });
    } else {
      console.log('⚠️ No connected profiles found');
    }

  } catch (error) {
    console.error('❌ Error checking profiles:', error);
  } finally {
    await sequelize.close();
  }
}

console.log('🚀 Starting profile check...\n');
checkProfiles(); 