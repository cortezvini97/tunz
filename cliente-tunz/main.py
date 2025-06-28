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

def update_server_url_in_file(file_path, new_url):
    """Atualiza a URL do servidor em um arquivo específico"""
    if not os.path.exists(file_path):
        print(f"⚠️  Arquivo não encontrado: {file_path}")
        return False, 0
    
    # Fazer backup
    backup_file(file_path)
    
    # Ler conteúdo do arquivo
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Padrão regex mais flexível para encontrar a linha com o comentário
        # Captura qualquer URL entre aspas/apostrofes na linha que termina com o comentário específico
        patterns = [
            # Para .option() com aspas simples
            r"(\.option\('-s, --server <server>', 'Servidor do túnel', ')([^']+)('\) //AQUI DEFINIMOS A URL DO SERVIDOR)",
            # Para .option() com aspas duplas
            r'(\.option\("-s, --server <server>", "Servidor do túnel", ")([^"]+)("\) //AQUI DEFINIMOS A URL DO SERVIDOR)',
            # Para variáveis ou outras configurações com aspas simples
            r"(serverUrl:\s*')([^']+)('\s*,?\s*//AQUI DEFINIMOS A URL DO SERVIDOR)",
            # Para variáveis ou outras configurações com aspas duplas
            r'(serverUrl:\s*")([^"]+)("\s*,?\s*//AQUI DEFINIMOS A URL DO SERVIDOR)',
            # Para this.serverUrl = 'url' com aspas simples
            r"(this\.serverUrl\s*=\s*options\.serverUrl\s*\|\|\s*')([^']+)('\s*;\s*//AQUI DEFINIMOS A URL DO SERVIDOR)",
            # Para this.serverUrl = "url" com aspas duplas
            r'(this\.serverUrl\s*=\s*options\.serverUrl\s*\|\|\s*")([^"]+)("\s*;\s*//AQUI DEFINIMOS A URL DO SERVIDOR)',
            # Para atribuições simples this.serverUrl = 'url'
            r"(this\.serverUrl\s*=\s*')([^']+)('\s*;\s*//AQUI DEFINIMOS A URL DO SERVIDOR)",
            r'(this\.serverUrl\s*=\s*")([^"]+)("\s*;\s*//AQUI DEFINIMOS A URL DO SERVIDOR)',
            # Padrão genérico para capturar <YOUR_SERVER_URL> ou outras URLs
            r"(['\"])([^'\"]*(?:YOUR_SERVER_URL|https?://[^'\"]*))(['\"].*?//AQUI DEFINIMOS A URL DO SERVIDOR)"
        ]
        
        total_count = 0
        updated_content = content
        matches_found = []
        
        # Processar cada padrão
        for i, pattern in enumerate(patterns):
            # Encontrar todas as correspondências para este padrão
            current_matches = list(re.finditer(pattern, updated_content))
            
            if current_matches:
                print(f"      🔍 Padrão {i+1}: encontradas {len(current_matches)} ocorrência(s)")
                
                for match in current_matches:
                    # Extrair a URL atual
                    groups = match.groups()
                    if len(groups) >= 3:
                        old_url = groups[1]
                        matches_found.append(old_url)
                        print(f"         • '{old_url}' → '{new_url}'")
                
                # Aplicar substituição para este padrão
                def replace_url(match_obj):
                    groups = match_obj.groups()
                    if len(groups) >= 3:
                        return groups[0] + new_url + groups[2]
                    return match_obj.group(0)
                
                updated_content = re.sub(pattern, replace_url, updated_content)
                total_count += len(current_matches)
        
        if total_count > 0:
            # Salvar arquivo atualizado
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            
            print(f"   ✅ {total_count} ocorrência(s) atualizadas em {file_path}")
            return True, total_count
        else:
            print(f"   ℹ️  Nenhuma ocorrência encontrada em {file_path}")
            return False, 0
            
    except Exception as e:
        print(f"   ❌ Erro ao processar {file_path}: {str(e)}")
        return False, 0

def update_server_url(new_url):
    """Atualiza a URL do servidor em todos os arquivos relevantes"""
    print("🔧 Atualizando URL do servidor em todos os arquivos...")
    
    # Lista de arquivos para verificar
    files_to_check = [
        "src/index.js",
        "src/client.js",
        "src/index.js.backup"  # Verificar backup também se existir
    ]
    
    total_files_updated = 0
    total_occurrences = 0
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            print(f"📄 Processando {file_path}...")
            success, count = update_server_url_in_file(file_path, new_url)
            if success:
                total_files_updated += 1
                total_occurrences += count
    
    if total_files_updated > 0:
        print(f"✅ Atualização concluída!")
        print(f"   📁 Arquivos atualizados: {total_files_updated}")
        print(f"   🔄 Total de ocorrências: {total_occurrences}")
        print(f"   🌐 Nova URL: {new_url}")
        return True
    else:
        print("ℹ️  Nenhuma atualização foi necessária.")
        print("💡 Certifique-se de que existe uma linha como:")
        print("   .option('-s, --server <server>', 'Servidor do túnel', 'http://localhost:7070') //AQUI DEFINIMOS A URL DO SERVIDOR")
        print("   ou")
        print("   this.serverUrl = options.serverUrl || 'http://localhost:7070'; //AQUI DEFINIMOS A URL DO SERVIDOR")
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
  --test, -t         Testar substituição sem compilar
  --examples, -e     Mostrar exemplos de linhas processadas
  --help, -h         Mostrar esta ajuda

Exemplos:
  python main.py --configure    # Configurar servidor e compilar
  python main.py --build        # Compilar apenas
  python main.py --test         # Testar substituição de URLs
  python main.py --examples     # Ver exemplos de padrões
  python main.py                # Compilar apenas (padrão)

Descrição:
  Este script permite configurar a URL do servidor Tunz no código
  fonte e compilar o cliente para um executável standalone.
  
  O script procura por linhas que contenham o comentário:
  //AQUI DEFINIMOS A URL DO SERVIDOR
  
  E substitui a URL configurada nessas linhas nos arquivos:
  - src/index.js
  - src/client.js
  - src/index.js.backup (se existir)
"""
    print(help_text)

def show_examples():
    """Mostra exemplos de linhas que serão processadas"""
    print("📝 Exemplos de linhas que serão processadas:")
    print()
    print("1. Comando .option() no index.js:")
    print("   .option('-s', '--server <server>', 'Servidor do túnel', 'https://old-url.com') //AQUI DEFINIMOS A URL DO SERVIDOR")
    print("   →")
    print("   .option('-s', '--server <server>', 'Servidor do túnel', 'https://new-url.com') //AQUI DEFINIMOS A URL DO SERVIDOR")
    print()
    print("2. Atribuição de variável no client.js:")
    print("   this.serverUrl = options.serverUrl || 'http://localhost:7070'; //AQUI DEFINIMOS A URL DO SERVIDOR")
    print("   →") 
    print("   this.serverUrl = options.serverUrl || 'https://new-url.com'; //AQUI DEFINIMOS A URL DO SERVIDOR")
    print()
    print("3. Placeholder genérico:")
    print("   .option('-s', '--server <server>', 'Servidor do túnel', '<YOUR_SERVER_URL>') //AQUI DEFINIMOS A URL DO SERVIDOR")
    print("   →")
    print("   .option('-s', '--server <server>', 'Servidor do túnel', 'https://new-url.com') //AQUI DEFINIMOS A URL DO SERVIDOR")
    print()

def test_url_replacement():
    """Testa a substituição de URLs sem fazer alterações"""
    print("🧪 Modo de teste - nenhuma alteração será salva")
    print()
    
    while True:
        test_url = input("🌐 Digite uma URL de teste (ex: https://teste.exemplo.com): ").strip()
        
        if not test_url:
            print("❌ URL não pode estar vazia!")
            continue
        
        # Validar URL
        is_valid, error_msg = validate_url(test_url)
        if not is_valid:
            print(f"❌ {error_msg}")
            continue
        
        break
    
    print()
    print("🔍 Procurando por padrões nos arquivos...")
    
    # Lista de arquivos para verificar
    files_to_check = [
        "src/index.js",
        "src/client.js",
        "src/index.js.backup"
    ]
    
    total_files_found = 0
    total_occurrences = 0
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            print(f"\n📄 Analisando {file_path}...")
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Procurar pelo comentário
                lines_with_comment = []
                for i, line in enumerate(content.split('\n'), 1):
                    if '//AQUI DEFINIMOS A URL DO SERVIDOR' in line:
                        lines_with_comment.append((i, line.strip()))
                
                if lines_with_comment:
                    total_files_found += 1
                    total_occurrences += len(lines_with_comment)
                    
                    print(f"   ✅ Encontradas {len(lines_with_comment)} linha(s) com o comentário:")
                    for line_num, line_content in lines_with_comment:
                        print(f"      Linha {line_num}: {line_content}")
                        
                        # Simular a substituição
                        if "'" in line_content:
                            old_url_match = re.search(r"'([^']*)'", line_content)
                            if old_url_match:
                                old_url = old_url_match.group(1)
                                new_line = line_content.replace(f"'{old_url}'", f"'{test_url}'")
                                print(f"         → {new_line}")
                        elif '"' in line_content:
                            old_url_match = re.search(r'"([^"]*)"', line_content)
                            if old_url_match:
                                old_url = old_url_match.group(1)
                                new_line = line_content.replace(f'"{old_url}"', f'"{test_url}"')
                                print(f"         → {new_line}")
                else:
                    print(f"   ℹ️  Nenhuma linha encontrada com o comentário")
                    
            except Exception as e:
                print(f"   ❌ Erro ao processar {file_path}: {str(e)}")
        else:
            print(f"⚠️  Arquivo não encontrado: {file_path}")
    
    print(f"\n📊 Resumo do teste:")
    print(f"   📁 Arquivos com padrões: {total_files_found}")
    print(f"   🔄 Total de ocorrências: {total_occurrences}")
    print(f"   🌐 URL de teste: {test_url}")
    print()
    print("💡 Para aplicar as mudanças, use: python main.py --configure")
    
    return True

def main():
    """Função principal"""
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--configure', '-c', action='store_true', help='Configurar servidor e compilar')
    parser.add_argument('--build', '-b', action='store_true', help='Compilar com configurações atuais')
    parser.add_argument('--test', '-t', action='store_true', help='Testar substituição sem compilar')
    parser.add_argument('--examples', '-e', action='store_true', help='Mostrar exemplos de linhas processadas')
    parser.add_argument('--help', '-h', action='store_true', help='Mostrar ajuda')
    
    args = parser.parse_args()
    
    show_banner()
    
    if args.help:
        show_help()
        return 0
    
    if args.examples:
        show_examples()
        return 0
    
    if args.test:
        success = test_url_replacement()
        return 0 if success else 1
    
    success = True
    
    if args.configure:
        success = configure_server()
        if not success:
            return 1
        print()
    
    # Compilar (padrão se nenhuma opção específica for dada)
    if args.build or not (args.configure or args.help or args.test or args.examples):
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

