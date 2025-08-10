# Script PowerShell para iniciar ambos os servidores
Write-Host "🚀 Iniciando WhatsApp Enterprise..." -ForegroundColor Green

# Verificar se Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se as dependências estão instaladas
Write-Host "📦 Verificando dependências..." -ForegroundColor Yellow

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 Instalando dependências do frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📦 Instalando dependências do backend..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

# Criar arquivos .env se não existirem
Write-Host "⚙️ Configurando variáveis de ambiente..." -ForegroundColor Yellow

# Frontend .env.local
if (-not (Test-Path "frontend/.env.local")) {
    Write-Host "📝 Criando frontend/.env.local..." -ForegroundColor Yellow
    @"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-change-in-production
NEXT_PUBLIC_API_URL=http://localhost:3000
"@ | Out-File -FilePath "frontend/.env.local" -Encoding UTF8
}

# Backend .env
if (-not (Test-Path "backend/.env")) {
    Write-Host "📝 Criando backend/.env..." -ForegroundColor Yellow
    @"
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Database Configuration
DB_PATH=./database/whatsapp_enterprise.sqlite

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_DATA_PATH=./data

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Database Configuration
DB_SYNC=true
DB_LOGGING=false

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
"@ | Out-File -FilePath "backend/.env" -Encoding UTF8
}

# Iniciar servidores
Write-Host "🚀 Iniciando servidores..." -ForegroundColor Green

# Verificar e iniciar backend se necessário
Write-Host "🔧 Verificando e iniciando backend..." -ForegroundColor Cyan
& ".\scripts\check-and-start-backend.ps1"

# Aguardar um pouco para o backend inicializar
Start-Sleep -Seconds 5

# Iniciar frontend em background
Write-Host "🎨 Iniciando frontend na porta 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

Write-Host "✅ Servidores iniciados!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "🔧 Backend: http://localhost:3001" -ForegroundColor Yellow
Write-Host "📊 Health Check: http://localhost:3001/health" -ForegroundColor Yellow

Write-Host "`n⏳ Aguardando servidores inicializarem..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar se os servidores estão rodando
Write-Host "🔍 Verificando status dos servidores..." -ForegroundColor Yellow
node scripts/check-servers.js 