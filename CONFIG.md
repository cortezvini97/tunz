# 🔧 Configuração do Ambiente

Este arquivo contém instruções para configurar as variáveis de ambiente necessárias para executar o projeto Tunz.

## 📁 Estrutura dos Arquivos de Ambiente

```
tunel_server/
├── .env.example                 # Exemplo global
├── servidor-tunel/
│   ├── .env.example            # Configurações do servidor
│   └── .env                    # Suas configurações (criar)
└── cliente-tunz/
    ├── .env.example            # Configurações do cliente
    └── .env                    # Suas configurações (criar)
```

## 🚀 Configuração Rápida

### 1. Servidor (servidor-tunel)

```bash
# Copie o arquivo de exemplo
cp servidor-tunel/.env.example servidor-tunel/.env

# Edite as configurações no arquivo .env
```

**Configurações obrigatórias:**
- `DB_*`: Configurações do MySQL
- `JWT_SECRET`: Chave secreta para JWT (gere uma chave forte)
- `ADMIN_EMAIL` e `ADMIN_PASSWORD`: Credenciais do administrador

### 2. Cliente (cliente-tunz)

```bash
# Copie o arquivo de exemplo
cp cliente-tunz/.env.example cliente-tunz/.env

# Edite se necessário (configurações opcionais)
```

## 🛠️ Configurações Detalhadas

### Banco de Dados (MySQL)

```env
DB_HOST=localhost          # Host do MySQL
DB_PORT=3306              # Porta do MySQL
DB_USER=root              # Usuário do MySQL
DB_PASSWORD=sua_senha     # Senha do MySQL
DB_NAME=tunz              # Nome do banco de dados
```

### JWT (Autenticação)

```env
JWT_SECRET=sua_chave_super_secreta_aqui  # Use uma chave forte!
JWT_EXPIRES_IN=24h                        # Tempo de expiração do token
```

**💡 Dica:** Para gerar uma chave JWT segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Administrador Padrão

```env
ADMIN_EMAIL=admin@seudominio.com    # Email do admin
ADMIN_PASSWORD=senha_forte_aqui      # Senha do admin
```

### Email (Opcional - Para produção)

```env
SMTP_HOST=seu.servidor.smtp.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=email@seudominio.com
SMTP_PASS=senha_email
```

## ⚠️ Segurança

1. **Nunca commite arquivos `.env`** - eles estão no `.gitignore`
2. **Use senhas fortes** para o admin e banco de dados
3. **Gere uma chave JWT única** para cada ambiente
4. **Altere as credenciais padrão** em produção

## 🔄 Primeira Execução

Após configurar o `.env` do servidor:

```bash
cd servidor-tunel
npm install
npm run setup    # Cria banco, executa migrations e seed
npm run dev      # Inicia o servidor
```

## 📝 Variáveis de Ambiente por Contexto

### Desenvolvimento
- `NODE_ENV=development`
- Use banco local MySQL
- Email será simulado (Ethereal)

### Produção
- `NODE_ENV=production`
- Configure SMTP real
- Use senha forte para JWT_SECRET
- Configure banco de produção

## 🆘 Problemas Comuns

1. **Erro de conexão com banco:**
   - Verifique se o MySQL está rodando
   - Confirme credenciais em `.env`

2. **Token JWT inválido:**
   - Verifique se `JWT_SECRET` está definido
   - Regenere a chave se necessário

3. **Erro de permissão de administrador:**
   - Execute `npm run db:seed` para criar o usuário admin

## 📞 Suporte

Se precisar de ajuda, verifique:
- Logs do servidor
- Arquivo `.env` está configurado corretamente
- Todas as dependências foram instaladas
