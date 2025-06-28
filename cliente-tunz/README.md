# Tunz Client

Cliente de linha de comando para criar túneis com o servidor Tunz.

## Instalação

```bash
npm install
```

### Instalar globalmente (recomendado)

```bash
npm install -g .
# ou
npm link
```

## Uso

### Criar túnel

```bash
tunz http http://localhost:8000
```

```bash
tunz https https://localhost:3000
```

### Criar túnel com subdomínio customizado

```bash
tunz http http://localhost:8000 --subdomain meuapp
```

```bash
tunz http http://localhost:3000 -d api-teste
```

### Opções disponíveis

```bash
tunz <protocolo> <url_do_computador_do_usuario> [opções]

Argumentos:
  protocolo                    Protocolo da aplicação local (http ou https)
  url_do_computador_do_usuario URL completa da aplicação no seu computador

Opções:
  -s, --server <server>      Servidor do túnel (padrão: http://localhost:3000)
  -d, --subdomain <name>     Subdomínio customizado (3-20 caracteres)
  -v, --verbose             Modo verboso
  -h, --help                Exibir ajuda
  -V, --version             Exibir versão
```

### Listar túneis ativos

```bash
tunz list
```

### Exemplos

```bash
# Túnel básico - conecta aplicação local ao servidor de túnel
tunz http http://localhost:8000

# Túnel HTTPS - para aplicações que usam HTTPS localmente
tunz https https://localhost:3000

# Túnel com subdomínio customizado
tunz http http://localhost:8000 --subdomain meuapp
# Resultado: http://meuapp.localhost:3000

# Túnel com servidor customizado
tunz http http://localhost:3000 --server http://meuservidor.com:3000

# Túnel com subdomínio customizado e servidor customizado
tunz http http://localhost:8000 -d api -s http://meuservidor.com:3000

# Modo verboso - mostra informações detalhadas
tunz http http://localhost:8000 --verbose

# Listar túneis ativos no servidor
tunz list
```

## Funcionalidades

- ✅ Criação de túneis HTTP/HTTPS
- ✅ Conexão automática com o servidor
- ✅ Reconexão automática
- ✅ Monitoramento da aplicação local
- ✅ Interface colorida e amigável
- ✅ Listagem de túneis ativos

## Como funciona

1. O cliente solicita a criação de um túnel no servidor
2. O servidor retorna uma URL pública única
3. O cliente se conecta via WebSocket para manter o túnel ativo
4. As requisições para a URL pública são redirecionadas para sua aplicação local
