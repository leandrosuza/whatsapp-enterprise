import { sequelize } from '../infrastructure/database/database';
import WhatsAppProfile from '../core/entities/WhatsAppProfile';

/**
 * Script para limpar todos os perfis WhatsApp e forçar status desligado
 * Útil para resolver bugs com navegadores automáticos ainda abertos
 */
async function cleanupProfiles() {
  try {
    console.log('🧹 Iniciando limpeza de perfis WhatsApp...');
    
    // Conectar ao banco de dados
    await sequelize.authenticate();
    console.log('✅ Banco de dados conectado');
    
    // Buscar todos os perfis
    const allProfiles = await WhatsAppProfile.findAll();
    console.log(`📋 Encontrados ${allProfiles.length} perfis no total`);
    
    // Contar perfis conectados
    const connectedProfiles = allProfiles.filter(p => p.isConnected);
    console.log(`🔌 Perfis conectados: ${connectedProfiles.length}`);
    
    if (connectedProfiles.length === 0) {
      console.log('ℹ️ Nenhum perfil conectado encontrado');
      return;
    }
    
    // Desligar todos os perfis conectados
    console.log('🔄 Desligando todos os perfis conectados...');
    
    for (const profile of connectedProfiles) {
      console.log(`🔌 Desligando perfil: ${profile.name} (ID: ${profile.id})`);
      
      await profile.update({
        status: 'disconnected',
        isConnected: false,
        lastDisconnected: new Date()
      });
      
      console.log(`✅ Perfil ${profile.name} desligado com sucesso`);
    }
    
    // Verificar resultado
    const updatedProfiles = await WhatsAppProfile.findAll({
      where: { isConnected: true }
    });
    
    console.log(`✅ Limpeza concluída! Perfis ainda conectados: ${updatedProfiles.length}`);
    
    if (updatedProfiles.length === 0) {
      console.log('🎉 Todos os perfis foram desligados com sucesso!');
    } else {
      console.log('⚠️ Alguns perfis ainda estão conectados:');
      updatedProfiles.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
    }
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexão com banco de dados fechada');
  }
}

// Executar limpeza se o script for chamado diretamente
if (require.main === module) {
  cleanupProfiles();
}

export { cleanupProfiles }; 