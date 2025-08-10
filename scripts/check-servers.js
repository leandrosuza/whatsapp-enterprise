// Script para verificar se os servidores estão rodando
const http = require('http');

const checkServer = (url, name) => {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      console.log(`✅ ${name} está rodando (${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${name} não está rodando: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${name} timeout após 5 segundos`);
      req.destroy();
      resolve(false);
    });
  });
};

async function checkAllServers() {
  console.log('🔍 Verificando servidores...\n');
  
  const frontend = await checkServer('http://localhost:3000', 'Frontend (Next.js)');
  const backend = await checkServer('http://localhost:3001', 'Backend (Node.js)');
  const backendHealth = await checkServer('http://localhost:3001/health', 'Backend Health Check');
  
  console.log('\n📊 Resumo:');
  console.log(`Frontend: ${frontend ? '✅ Rodando' : '❌ Parado'}`);
  console.log(`Backend: ${backend ? '✅ Rodando' : '❌ Parado'}`);
  console.log(`Backend Health: ${backendHealth ? '✅ OK' : '❌ Erro'}`);
  
  if (!frontend) {
    console.log('\n🚀 Para iniciar o frontend:');
    console.log('cd frontend && npm run dev');
  }
  
  if (!backend) {
    console.log('\n🚀 Para iniciar o backend:');
    console.log('cd backend && npm run dev');
  }
  
  if (frontend && backend) {
    console.log('\n✅ Ambos os servidores estão rodando!');
    console.log('🌐 Acesse: http://localhost:3000');
  }
}

checkAllServers(); 