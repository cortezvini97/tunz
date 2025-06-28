# 🔨 Script de Build - Cliente Tunz

Este script Python permite configurar automaticamente a URL do servidor em múltiplos arquivos JavaScript e compilar o cliente para um executável standalone.

## 🚀 Funcionalidades

- ✅ **Detecção automática**: Encontra todas as linhas com `//AQUI DEFINIMOS A URL DO SERVIDOR`
- ✅ **Múltiplos arquivos**: Processa `index.js`, `client.js` e `index.js.backup`
- ✅ **Padrões flexíveis**: Suporta diferentes formatos de URL (aspas simples, duplas, etc.)
- ✅ **Backup automático**: Cria backup dos arquivos antes de modificar
- ✅ **Validação de URL**: Verifica se a URL fornecida é válida
- ✅ **Modo de teste**: Simula as mudanças sem aplicá-las
- ✅ **Compilação**: Gera executável standalone com PKG

## 📋 Comandos Disponíveis

```bash
# Configurar URL do servidor e compilar
python main.py --configure

# Apenas compilar (sem alterar URLs)
python main.py --build

# Testar substituição sem fazer mudanças
python main.py --test

# Ver exemplos de padrões suportados
python main.py --examples

# Mostrar ajuda
python main.py --help

# Compilar (comportamento padrão)
python main.py
```

## 🔍 Padrões Suportados

O script procura por linhas que terminam com o comentário `//AQUI DEFINIMOS A URL DO SERVIDOR` e substitui a URL nos seguintes formatos:

### 1. Comandos .option()
```javascript
.option('-s', '--server <server>', 'Servidor do túnel', 'https://old-url.com') //AQUI DEFINIMOS A URL DO SERVIDOR
```

### 2. Atribuições de variáveis
```javascript
this.serverUrl = options.serverUrl || 'http://localhost:7070'; //AQUI DEFINIMOS A URL DO SERVIDOR
```

### 3. Placeholders
```javascript
.option('-s', '--server <server>', 'Servidor do túnel', '<YOUR_SERVER_URL>') //AQUI DEFINIMOS A URL DO SERVIDOR
```

## 🎯 Exemplo de Uso

### 1. Modo de Configuração Interativo
```bash
python main.py --configure
```

Saída esperada:
```
🚀 Cliente Tunz - Script de Build
==================================

⚙️  Modo de configuração ativado

🌐 Digite a URL do servidor (ex: https://tunz.exemplo.com, http://192.168.1.100:7070): https://meuservidor.com

📋 Resumo da configuração:
   Servidor: https://meuservidor.com

Confirma a configuração? (s/N): s

🔧 Atualizando URL do servidor em todos os arquivos...
📄 Processando src/index.js...
      🔍 Padrão 1: encontradas 5 ocorrência(s)
         • '<YOUR_SERVER_URL>' → 'https://meuservidor.com'
         • '<YOUR_SERVER_URL>' → 'https://meuservidor.com'
   ✅ 5 ocorrência(s) atualizadas em src/index.js

📄 Processando src/client.js...
      🔍 Padrão 5: encontradas 1 ocorrência(s)
         • 'http://localhost:7070' → 'https://meuservidor.com'
   ✅ 1 ocorrência(s) atualizadas em src/client.js

✅ Atualização concluída!
   📁 Arquivos atualizados: 2
   🔄 Total de ocorrências: 6
   🌐 Nova URL: https://meuservidor.com

🔨 Iniciando compilação...
📦 Compilando para Windows x64...
✅ Executável criado com sucesso!
📁 Local: dist/tunz.exe
📏 Tamanho: 45.2 MB

🎉 Build concluído com sucesso!
```

### 2. Modo de Teste (sem alterações)
```bash
python main.py --test
```

Este modo permite visualizar quais mudanças seriam feitas sem aplicá-las.

### 3. Apenas Compilar
```bash
python main.py --build
```

Compila o projeto sem alterar as URLs configuradas.

## 📁 Arquivos Processados

O script verifica automaticamente os seguintes arquivos:

- `src/index.js` - Arquivo principal do CLI
- `src/client.js` - Cliente de conexão
- `src/index.js.backup` - Backup (se existir)

## 🛡️ Recursos de Segurança

- **Backup automático**: Cria `.backup` antes de modificar
- **Validação de URL**: Verifica formato e protocolo
- **Confirmação**: Solicita confirmação antes de aplicar mudanças
- **Modo de teste**: Permite visualizar mudanças antes de aplicar

## ⚙️ Configuração do Ambiente

### Pré-requisitos
- Python 3.6+
- Node.js e NPM
- Pacote `pkg` instalado globalmente: `npm install -g pkg`

### Estrutura de Pastas
```
cliente-tunz/
├── main.py              # Este script
├── src/
│   ├── index.js         # CLI principal
│   ├── client.js        # Cliente de conexão
│   └── index.js.backup  # Backup (criado automaticamente)
├── dist/                # Saída da compilação
└── package.json         # Configurações do NPM
```

## 🔧 Personalização

### Adicionar Novos Padrões
Para adicionar suporte a novos formatos de URL, edite a lista `patterns` na função `update_server_url_in_file()`:

```python
patterns = [
    # Adicione seu novo padrão regex aqui
    r"(meu_padrao_personalizado')([^']+)('\s*//AQUI DEFINIMOS A URL DO SERVIDOR)",
    # ... padrões existentes
]
```

### Adicionar Novos Arquivos
Para processar arquivos adicionais, edite a lista `files_to_check` na função `update_server_url()`:

```python
files_to_check = [
    "src/index.js",
    "src/client.js", 
    "src/meu_novo_arquivo.js",  # Adicione aqui
    "src/index.js.backup"
]
```

## 🐛 Troubleshooting

### Erro: "pkg não encontrado"
```bash
npm install -g pkg
```

### Erro: "Arquivo não encontrado"
Certifique-se de estar no diretório correto que contém a pasta `src/`.

### Erro: "URL inválida"
A URL deve começar com `http://` ou `https://` e ter um formato válido.

### Nenhuma ocorrência encontrada
Verifique se as linhas terminam exatamente com:
```
//AQUI DEFINIMOS A URL DO SERVIDOR
```

## 📝 Logs e Debug

O script fornece logs detalhados durante a execução:
- 🔍 Padrões encontrados
- ✅ Sucessos
- ⚠️ Avisos
- ❌ Erros

Para mais detalhes, use o modo `--test` para ver exatamente o que será modificado.

## 🤝 Contribuição

Para melhorar este script:
1. Adicione novos padrões regex para outros formatos
2. Melhore a validação de URLs
3. Adicione suporte para outros tipos de arquivo
4. Optimize a performance dos regex
