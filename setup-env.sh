#!/bin/bash

# Script de configuração automática do projeto Tunz
# Este script copia os arquivos .env.example para .env se eles não existirem

echo "🚀 Configurando ambiente do projeto Tunz..."

# Função para copiar .env.example para .env se não existir
setup_env() {
    local dir=$1
    local name=$2
    
    if [ -f "$dir/.env.example" ]; then
        if [ ! -f "$dir/.env" ]; then
            cp "$dir/.env.example" "$dir/.env"
            echo "✅ $name: Arquivo .env criado a partir do .env.example"
            echo "📝 Edite $dir/.env com suas configurações"
        else
            echo "ℹ️  $name: Arquivo .env já existe"
        fi
    else
        echo "⚠️  $name: .env.example não encontrado"
    fi
}

# Configurar servidor
echo ""
echo "📊 Configurando servidor..."
setup_env "servidor-tunel" "Servidor"

# Configurar cliente
echo ""
echo "💻 Configurando cliente..."
setup_env "cliente-tunz" "Cliente"

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Edite os arquivos .env com suas configurações"
echo "2. Configure o MySQL e ajuste as credenciais"
echo "3. Execute: cd servidor-tunel && npm install && npm run setup"
echo "4. Execute: cd cliente-tunz && npm install"
echo ""
echo "📖 Para mais detalhes, leia o arquivo CONFIG.md"
