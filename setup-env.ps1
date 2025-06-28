# Script de configuração automática do projeto Tunz (Windows PowerShell)
# Este script copia os arquivos .env.example para .env se eles não existirem

Write-Host "🚀 Configurando ambiente do projeto Tunz..." -ForegroundColor Blue

function Initialize-Environment {
    param(
        [string]$Dir,
        [string]$Name
    )
    
    $examplePath = Join-Path $Dir ".env.example"
    $envPath = Join-Path $Dir ".env"
    
    if (Test-Path $examplePath) {
        if (-not (Test-Path $envPath)) {
            Copy-Item $examplePath $envPath
            Write-Host "✅ $Name`: Arquivo .env criado a partir do .env.example" -ForegroundColor Green
            Write-Host "📝 Edite $Dir\.env com suas configurações" -ForegroundColor Yellow
        } else {
            Write-Host "ℹ️  $Name`: Arquivo .env já existe" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️  $Name`: .env.example não encontrado" -ForegroundColor Red
    }
}

# Configurar servidor
Write-Host ""
Write-Host "📊 Configurando servidor..." -ForegroundColor Magenta
Initialize-Environment -Dir "servidor-tunel" -Name "Servidor"

# Configurar cliente
Write-Host ""
Write-Host "💻 Configurando cliente..." -ForegroundColor Magenta
Initialize-Environment -Dir "cliente-tunz" -Name "Cliente"

Write-Host ""
Write-Host "🎉 Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Edite os arquivos .env com suas configurações"
Write-Host "2. Configure o MySQL e ajuste as credenciais"
Write-Host "3. Execute: cd servidor-tunel; npm install; npm run setup"
Write-Host "4. Execute: cd cliente-tunz; npm install"
Write-Host ""
Write-Host "📖 Para mais detalhes, leia o arquivo CONFIG.md" -ForegroundColor Cyan
