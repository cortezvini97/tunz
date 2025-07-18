param(
    [Parameter(Position=0)]
    [string]$Action
)

# Função para verificar se um comando existe
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Função para exibir ajuda
function Show-Help {
    Write-Host "Setup Script para Tunnel Server" -ForegroundColor Green
    Write-Host "Uso: .\setup.ps1 [opções]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Cyan
    Write-Host "  -s, --setup     Executar setup completo do ambiente" -ForegroundColor White
    Write-Host "  -c, --clean     Limpar o ambiente" -ForegroundColor White
    Write-Host "  -h, --help      Mostrar esta ajuda" -ForegroundColor White
    Write-Host "  -v, --version   Mostrar versão do script" -ForegroundColor White
    Write-Host ""
    Write-Host "Exemplo: .\setup.ps1 -s" -ForegroundColor Yellow
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-Host "🔍 Verificando pré-requisitos..." -ForegroundColor Yellow
    
    $allValid = $true
    
    # Verificar Python
    if (Test-Command "python") {
        try {
            $pythonVersion = python --version 2>&1
            Write-Host "✅ Python encontrado: $pythonVersion" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Erro ao verificar versão do Python" -ForegroundColor Red
            $allValid = $false
        }
    }
    else {
        Write-Host "❌ Python não encontrado!" -ForegroundColor Red
        Write-Host "   Por favor, instale o Python em https://python.org/downloads/" -ForegroundColor White
        $allValid = $false
    }
    
    # Verificar Node.js
    if (Test-Command "node") {
        try {
            $nodeVersion = node --version 2>&1
            Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Erro ao verificar versão do Node.js" -ForegroundColor Red
            $allValid = $false
        }
    }
    else {
        Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
        Write-Host "   Por favor, instale o Node.js em https://nodejs.org/" -ForegroundColor White
        $allValid = $false
    }
    
    # Verificar NPM
    if (Test-Command "npm") {
        try {
            $npmVersion = npm --version 2>&1
            Write-Host "✅ NPM encontrado: v$npmVersion" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Erro ao verificar versão do NPM" -ForegroundColor Red
            $allValid = $false
        }
    }
    else {
        Write-Host "❌ NPM não encontrado!" -ForegroundColor Red
        Write-Host "   NPM normalmente vem com o Node.js. Reinstale o Node.js." -ForegroundColor White
        $allValid = $false
    }
    
    if (-not $allValid) {
        Write-Host ""
        Write-Host "❌ Alguns pré-requisitos não foram atendidos." -ForegroundColor Red
        Write-Host "   Instale as dependências necessárias e tente novamente." -ForegroundColor White
        exit 1
    }
    
    Write-Host "✅ Todos os pré-requisitos foram atendidos!" -ForegroundColor Green
    Write-Host ""
}

# Verificar se o arquivo setup.py existe
if (-not (Test-Path "setup.py")) {
    Write-Host "❌ Arquivo setup.py não encontrado no diretório atual!" -ForegroundColor Red
    exit 1
}

# Processar argumentos
switch ($Action) {
    { $_ -in @("-s", "--setup") } {
        Test-Prerequisites
        Write-Host "🚀 Iniciando setup do ambiente..." -ForegroundColor Green
        python setup.py --setup
    }
    
    { $_ -in @("-c", "--clean") } {
        Test-Prerequisites
        Write-Host "🧹 Limpando ambiente..." -ForegroundColor Yellow
        python setup.py --clean
    }
    
    { $_ -in @("-h", "--help") } {
        Show-Help
    }
    
    { $_ -in @("-v", "--version") } {
        Test-Prerequisites
        Write-Host "Setup Script v1.0.0" -ForegroundColor Green
        python setup.py --version
    }
    
    default {
        if ([string]::IsNullOrEmpty($Action)) {
            Show-Help
        }
        else {
            Write-Host "❌ Opção inválida: $Action" -ForegroundColor Red
            Write-Host ""
            Show-Help
        }
    }
}
