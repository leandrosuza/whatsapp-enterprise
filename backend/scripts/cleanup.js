#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Iniciando limpeza do projeto...');

// Função para remover diretórios recursivamente
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removido: ${dirPath}`);
    } catch (error) {
      console.log(`⚠️ Erro ao remover ${dirPath}:`, error.message);
    }
  }
}

// Função para remover arquivos
function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removido: ${filePath}`);
    } catch (error) {
      console.log(`⚠️ Erro ao remover ${filePath}:`, error.message);
    }
  }
}

// Limpar cache do WhatsApp Web.js
const wwebjsCache = path.join(__dirname, '..', '.wwebjs_cache');
const wwebjsAuth = path.join(__dirname, '..', '.wwebjs_auth');

removeDirectory(wwebjsCache);
removeDirectory(wwebjsAuth);

// Limpar logs antigos (mais de 7 dias)
const logsDir = path.join(__dirname, '..', 'logs');
if (fs.existsSync(logsDir)) {
  const files = fs.readdirSync(logsDir);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  files.forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime < sevenDaysAgo) {
      removeFile(filePath);
    }
  });
}

// Limpar arquivos temporários
const tempFiles = [
  path.join(__dirname, '..', '*.tmp'),
  path.join(__dirname, '..', '*.temp'),
  path.join(__dirname, '..', '*.bak'),
  path.join(__dirname, '..', '*.backup')
];

// Limpar arquivos de build antigos (manter apenas o mais recente)
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  console.log('📦 Limpando build antigo...');
  // Manter apenas arquivos essenciais, remover temporários
  const files = fs.readdirSync(distDir);
  files.forEach(file => {
    if (file.endsWith('.tmp') || file.endsWith('.temp')) {
      removeFile(path.join(distDir, file));
    }
  });
}

// Verificar e limpar banco de dados duplicado
const databaseDir = path.join(__dirname, '..', 'database');
if (fs.existsSync(databaseDir)) {
  const files = fs.readdirSync(databaseDir);
  const dbFiles = files.filter(file => file.endsWith('.db') || file.endsWith('.sqlite'));
  
  if (dbFiles.length > 1) {
    console.log('🗄️ Verificando arquivos de banco de dados...');
    dbFiles.forEach(file => {
      const filePath = path.join(databaseDir, file);
      const stats = fs.statSync(filePath);
      
      // Remover arquivos vazios ou muito pequenos
      if (stats.size < 1024) { // Menos de 1KB
        console.log(`🗑️ Removendo arquivo de banco vazio: ${file}`);
        removeFile(filePath);
      }
    });
  }
}

console.log('✅ Limpeza concluída!');
console.log('\n📋 Resumo da limpeza:');
console.log('  - Cache do WhatsApp Web.js removido');
console.log('  - Logs antigos removidos');
console.log('  - Arquivos temporários removidos');
console.log('  - Banco de dados duplicado verificado');
console.log('\n💡 Dica: Execute este script regularmente para manter o projeto organizado.'); 