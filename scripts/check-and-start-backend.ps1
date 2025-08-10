# Script para verificar se o backend está rodando e iniciá-lo se necessário
Write-Host "🔍 Verificando status do backend..." -ForegroundColor Yellow

# Função para verificar se o backend está rodando
function Test-BackendHealth {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Verificar se o backend está rodando
if (Test-BackendHealth) {
    Write-Host "✅ Backend está rodando na porta 3001" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Backend não está rodando" -ForegroundColor Red
    
    # Verificar se o diretório do backend existe
    if (-not (Test-Path "backend")) {
        Write-Host "❌ Diretório 'backend' não encontrado" -ForegroundColor Red
        exit 1
    }
    
    # Verificar se as dependências estão instaladas
    if (-not (Test-Path "backend/node_modules")) {
        Write-Host "📦 Instalando dependências do backend..." -ForegroundColor Yellow
        Set-Location backend
        npm install
        Set-Location ..
    }
    
    # Verificar se o arquivo .env existe
    if (-not (Test-Path "backend/.env")) {
        Write-Host "📝 Criando arquivo .env do backend..." -ForegroundColor Yellow
        $envContent = @"
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
"@
        $envContent | Out-File -FilePath "backend/.env" -Encoding UTF8
    }
    
    # Iniciar o backend
    Write-Host "🚀 Iniciando backend..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal
    
    # Aguardar um pouco para o backend inicializar
    Write-Host "⏳ Aguardando backend inicializar..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Verificar novamente se o backend está rodando
    $retries = 0
    $maxRetries = 5
    
    while ($retries -lt $maxRetries) {
        if (Test-BackendHealth) {
            Write-Host "✅ Backend iniciado com sucesso!" -ForegroundColor Green
            Write-Host "🌐 Health Check: http://localhost:3001/health" -ForegroundColor Yellow
            exit 0
        } else {
            $retries++
            Write-Host "⏳ Aguardando backend... (tentativa $retries/$maxRetries)" -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
    
    Write-Host "❌ Falha ao iniciar backend após $maxRetries tentativas" -ForegroundColor Red
    Write-Host "🔍 Verifique os logs do backend para mais detalhes" -ForegroundColor Yellow
    exit 1
} 