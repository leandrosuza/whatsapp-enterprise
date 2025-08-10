const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function cleanupChromeProcesses() {
  try {
    console.log('🧹 Iniciando limpeza de processos do Chrome...');
    
    // Verificar se há processos do Chrome rodando
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV');
    
    if (stdout.includes('chrome.exe')) {
      console.log('🔍 Processos do Chrome encontrados, finalizando...');
      
      // Finalizar todos os processos do Chrome
      await execAsync('taskkill /F /IM chrome.exe');
      console.log('✅ Processos do Chrome finalizados');
      
      // Aguardar um pouco para garantir que os processos foram finalizados
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('ℹ️ Nenhum processo do Chrome encontrado');
    }
    
    // Limpar também processos do Chromium se existirem
    try {
      await execAsync('taskkill /F /IM chromium.exe');
      console.log('✅ Processos do Chromium finalizados');
    } catch (error) {
      console.log('ℹ️ Nenhum processo do Chromium encontrado');
    }
    
    console.log('✅ Limpeza concluída');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  cleanupChromeProcesses();
}

module.exports = { cleanupChromeProcesses }; 