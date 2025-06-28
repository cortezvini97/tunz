
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import re
import subprocess
import argparse
from pathlib import Path
import shutil
from urllib.parse import urlparse

def show_banner():
    """Exibe o banner do script"""
    print("🚀 Cliente Tunz - Script de Build")
    print("=" * 35)
    print()

def validate_url(url):
    """Valida se a URL é válida"""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ['http', 'https']:
            return False, "URL deve começar com http:// ou https://"
        if not parsed.netloc:
            return False, "URL deve ter um host válido"
        return True, ""
    except Exception as e:
        return False, f"URL inválida: {str(e)}"

def backup_file(file_path):
    """Cria backup do arquivo se não existir"""
    backup_path = f"{file_path}.backup"
    if not os.path.exists(backup_path):
        shutil.copy2(file_path, backup_path)
        print(f"✅ Backup criado: {backup_path}")
        return True
    return False

def update_server_url(new_url):
    """Atualiza a URL do servidor no arquivo index.js"""
    print("🔧 Atualizando URL do servidor...")
    
    index_path = "src/index.js"
    
    if not os.path.exists(index_path):
        print(f"❌ Arquivo não encontrado: {index_path}")
        return False
    
    # Fazer backup
    backup_file(index_path)
    
    # Ler conteúdo do arquivo
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Padrão regex para encontrar a linha com o comentário
        # Captura qualquer URL entre aspas na linha que termina com o comentário específico
        pattern = r"(.option\('-s, --server <server>', 'Servidor do túnel', ')([^']+)('\) //AQUI DEFINIMOS A URL DO SERVIDOR)"
        
        # Função de substituição que mantém tudo igual exceto a URL
        def replace_url(match):
            return match.group(1) + new_url + match.group(3)
        
        # Contar quantas ocorrências existem
        matches = re.findall(pattern, content)
        count = len(matches)
        
        if count > 0:
            # Substituir todas as ocorrências usando regex
            updated_content = re.sub(pattern, replace_url, content)
            
            # Salvar arquivo atualizado
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            
            print(f"✅ {count} ocorrências atualizadas para: {new_url}")
            
            # Mostrar as linhas que foram alteradas (para debug)
            for i, match in enumerate(matches, 1):
                old_url = match[1]
                print(f"   {i}. '{old_url}' → '{new_url}'")
            
            return True
        else:
            print(f"ℹ️  Nenhuma linha com o comentário '//AQUI DEFINIMOS A URL DO SERVIDOR' encontrada")
            print("💡 Certifique-se de que existe uma linha como:")
            print("   .option('-s, --server <server>', 'Servidor do túnel', 'http://localhost:7070') //AQUI DEFINIMOS A URL DO SERVIDOR")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao atualizar arquivo: {str(e)}")
        return False

def run_command(cmd, description=""):
    """Executa um comando e retorna o resultado"""
    if description:
        print(f"📦 {description}...")
    
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True, 
            encoding='utf-8'
        )
        
        if result.returncode == 0:
            return True, result.stdout
        else:
            return False, result.stderr
            
    except Exception as e:
        return False, str(e)

def build_executable():
    """Compila o executável"""
    print("🔨 Iniciando compilação...")
    
    # Verificar se pkg está instalado
    success, output = run_command("pkg --version", "Verificando pkg")
    if not success:
        print("❌ pkg não encontrado. Instalando...")
        success, output = run_command("npm install -g pkg", "Instalando pkg")
        if not success:
            print(f"❌ Erro ao instalar pkg: {output}")
            return False
    
    # Limpar pasta dist se existir
    if os.path.exists("dist"):
        print("🧹 Limpando pasta dist...")
        shutil.rmtree("dist")
    
    # Criar pasta dist
    os.makedirs("dist", exist_ok=True)
    
    # Compilar
    print("📦 Compilando para Windows x64...")
    success, output = run_command("npm run build-win", "Compilando")
    
    if not success:
        print(f"❌ Erro na compilação: {output}")
        return False
    
    # Verificar se foi criado com sucesso
    exe_path = "dist/tunz.exe"
    if os.path.exists(exe_path):
        file_size = os.path.getsize(exe_path)
        file_size_mb = round(file_size / (1024 * 1024), 2)
        
        print("✅ Executável criado com sucesso!")
        print(f"📁 Local: {exe_path}")
        print(f"📏 Tamanho: {file_size_mb} MB")
        
        # Testar o executável
        print("🧪 Testando executável...")
        success, version = run_command(f"{exe_path} --version", "")
        if success:
            print(f"✅ Teste bem-sucedido! Versão: {version.strip()}")
            return True
        else:
            print(f"⚠️ Executável criado mas falhou no teste: {version}")
            return True
    else:
        print("❌ Falha na compilação. Executável não foi criado.")
        return False

def configure_server():
    """Configuração interativa do servidor"""
    print("⚙️  Modo de configuração ativado")
    print()
    
    while True:
        server_url = input("🌐 Digite a URL do servidor (ex: https://tunz.exemplo.com, http://192.168.1.100:7070): ").strip()
        
        if not server_url:
            print("❌ URL não pode estar vazia!")
            continue
        
        # Validar URL
        is_valid, error_msg = validate_url(server_url)
        if not is_valid:
            print(f"❌ {error_msg}")
            continue
        
        break
    
    # Confirmar
    print()
    print("📋 Resumo da configuração:")
    print(f"   Servidor: {server_url}")
    print()
    
    confirm = input("Confirma a configuração? (s/N): ").strip().lower()
    if confirm not in ['s', 'sim', 'y', 'yes']:
        print("❌ Operação cancelada.")
        return False
    
    # Atualizar arquivo
    return update_server_url(server_url)

def show_help():
    """Exibe a ajuda do script"""
    help_text = """
🔨 Script de Build do Cliente Tunz

Uso:
  python main.py [opções]

Opções:
  --configure, -c    Configurar URL do servidor e compilar
  --build, -b        Compilar com configurações atuais
  --help, -h         Mostrar esta ajuda

Exemplos:
  python main.py --configure    # Configurar servidor e compilar
  python main.py --build        # Compilar apenas
  python main.py                # Compilar apenas (padrão)

Descrição:
  Este script permite configurar a URL do servidor Tunz no código
  fonte e compilar o cliente para um executável standalone.
"""
    print(help_text)

def main():
    """Função principal"""
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--configure', '-c', action='store_true', help='Configurar servidor e compilar')
    parser.add_argument('--build', '-b', action='store_true', help='Compilar com configurações atuais')
    parser.add_argument('--help', '-h', action='store_true', help='Mostrar ajuda')
    
    args = parser.parse_args()
    
    show_banner()
    
    if args.help:
        show_help()
        return 0
    
    success = True
    
    if args.configure:
        success = configure_server()
        if not success:
            return 1
        print()
    
    # Compilar (padrão se nenhuma opção específica for dada)
    if args.build or not (args.configure or args.help):
        success = build_executable()
    
    if success:
        print()
        print("🎉 Build concluído com sucesso!")
        print()
        print("💡 Próximos passos:")
        print("   • Teste: dist\\tunz.exe --help")
        print("   • Distribua: dist\\tunz.exe")
        print()
        return 0
    else:
        print()
        print("❌ Build falhou. Verifique os erros acima.")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n❌ Operação cancelada pelo usuário.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro inesperado: {str(e)}")
        sys.exit(1)

