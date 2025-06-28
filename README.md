# 🚇 Tunz - Sistema de Túneis

Sistema completo de túneis para conectar aplicações locais e torná-las acessíveis publicamente, similar ao ngrok.

## 📁 Estrutura do Projeto

```
tunel_server/
├── servidor-tunel/          # Servidor principal
│   ├── src/                 # Código fonte do servidor
│   ├── package.json         # Dependências do servidor
│   └── .env.example         # Exemplo de configuração
├── cliente-tunz/            # Cliente CLI
│   ├── src/                 # Código fonte do cliente
│   ├── package.json         # Dependências do cliente
│   └── .env.example         # Exemplo de configuração
├── .gitignore               # Arquivos ignorados pelo Git
├── CONFIG.md                # Guia de configuração detalhado
├── setup-env.sh             # Script de setup (Linux/Mac)
└── setup-env.ps1            # Script de setup (Windows)
```

## 🚀 Instalação Rápida

### 1. Configuração Automática

**Windows (PowerShell):**
```powershell
.\setup-env.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x setup-env.sh
./setup-env.sh
```

### 2. Configuração Manual

1. **Configure o servidor:**
   ```bash
   cd servidor-tunel
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   ```

2. **Configure o cliente (opcional):**
   ```bash
   cd cliente-tunz
   cp .env.example .env
   # Edite se necessário
   ```

### 3. Instale as dependências

**Servidor:**
```bash
cd servidor-tunel
npm install
npm run setup    # Cria banco, migra e popula dados
```

**Cliente:**
```bash
cd cliente-tunz
npm install
npm link        # Instala globalmente o comando 'tunz'
```

## 🔧 Configuração

### Requisitos

- Node.js 16+
- MySQL 5.7+
- NPM ou Yarn

### Variáveis de Ambiente Essenciais

```env
# Banco de dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=tunz

# JWT
JWT_SECRET=sua_chave_secreta_super_forte

# Admin
ADMIN_EMAIL=admin@seudominio.com
ADMIN_PASSWORD=sua_senha_admin
```

📖 **Para configuração completa, veja [CONFIG.md](CONFIG.md)**

## 🏃‍♂️ Execução

### Servidor
```bash
cd servidor-tunel
npm run dev     # Desenvolvimento
npm start       # Produção
```

### Cliente
```bash
# Criar túnel básico
tunz http http://localhost:3000

# Túnel com slug customizado
tunz http http://localhost:3000 --slug meuapp

# Listar túneis ativos
tunz list

# Fazer login
tunz login
```

## ✨ Funcionalidades

### Servidor
- ✅ Autenticação JWT
- ✅ Autenticação de 2 fatores (2FA)
- ✅ Dashboard web completo
- ✅ Persistência em MySQL
- ✅ Sistema de usuários e permissões
- ✅ API REST completa
- ✅ WebSocket para túneis em tempo real

### Cliente
- ✅ CLI intuitivo e colorido
- ✅ Autenticação com o servidor
- ✅ Reconexão automática
- ✅ Monitoramento da aplicação local
- ✅ Slugs automáticos e customizados
- ✅ Listagem de túneis ativos

## 🛡️ Segurança

- 🔐 Autenticação JWT
- 🔐 2FA com Google Authenticator
- 🔐 Hashing de senhas com bcrypt
- 🔐 Códigos de backup para 2FA
- 🔐 Validação de URLs locais
- 🔐 Middleware de autorização

## 📊 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/profile` - Perfil do usuário

### Túneis
- `POST /api/tunnel` - Criar túnel
- `GET /api/tunnels` - Listar túneis
- `DELETE /api/tunnel/:id` - Deletar túnel

### 2FA
- `GET /api/2fa/setup` - Configurar 2FA
- `POST /api/2fa/enable` - Habilitar 2FA
- `POST /api/2fa/disable` - Desabilitar 2FA

## 🌐 Dashboard Web

Acesse `http://localhost:3000` para:
- Gerenciar túneis
- Configurar perfil
- Habilitar 2FA
- Administrar usuários (admin)

**Credenciais padrão:**
- Email: `admin@tunz.com`
- Senha: `admin123`

⚠️ **Altere as credenciais em produção!**

## 🔄 Desenvolvimento

### Estrutura do Código

**Servidor (`servidor-tunel/src/`):**
```
├── controllers/     # Controladores da API
├── database/        # Migrações e conexão
├── middleware/      # Middleware de autenticação
├── models/          # Modelos do Sequelize
├── services/        # Serviços (email, etc.)
├── views/           # Templates HTML
└── server.js        # Servidor principal
```

**Cliente (`cliente-tunz/src/`):**
```
├── client.js        # Lógica principal do cliente
└── index.js         # CLI e comandos
```

### Scripts Disponíveis

**Servidor:**
```bash
npm run dev          # Desenvolvimento com nodemon
npm run setup        # Setup completo do banco
npm run db:reset     # Reset completo do banco
npm run db:migrate   # Apenas migrações
npm run db:seed      # Apenas seed de dados
```

**Cliente:**
```bash
npm test             # Teste rápido
npm run build        # Build para executável
npm link             # Instalar globalmente
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- 📖 Documentação completa em [CONFIG.md](CONFIG.md)
- 🐛 Reporte bugs nas [Issues](../../issues)
- 💬 Discussões na seção [Discussions](../../discussions)

---

**Desenvolvido com ❤️ para facilitar o desenvolvimento local**
