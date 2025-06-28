# Servidor Túnel

Servidor de túnel para conectar aplicações locais e torná-las acessíveis publicamente com autenticação JWT e persistência em banco de dados.

## Instalação

```bash
npm install
```

## Configuração

1. Configure o arquivo `.env`:
```env
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=tunz

# Configurações JWT
JWT_SECRET=tunz_super_secret_key_change_in_production_2025
JWT_EXPIRES_IN=24h

# Configurações do Servidor
PORT=3000
NODE_ENV=development

# Configurações de Admin (usuário padrão)
ADMIN_EMAIL=admin@tunz.com
ADMIN_PASSWORD=admin123
```

2. Configure o banco de dados:
```bash
npm run setup
```

## Uso

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

## Endpoints

### Autenticação
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/register` - Registrar usuário  
- `GET /api/auth/profile` - Perfil do usuário (protegido)
- `GET /api/auth/verify` - Verificar token (protegido)

### Interface Web
- `GET /login` - Página de login
- `GET /dashboard` - Dashboard administrativo (protegido)
- `GET /` - Painel principal (protegido, apenas admin)

### API de Túneis
- `POST /api/tunnel` - Criar túnel
- `GET /api/tunnels` - Listar túneis
- `DELETE /api/tunnel/:id` - Remover túnel

## Funcionalidades

- ✅ Autenticação JWT
- ✅ Persistência em MySQL
- ✅ Dashboard web
- ✅ Proteção de rotas administrativas
- ✅ Criação de túneis HTTP
- ✅ Subdomínios automáticos e customizados
- ✅ Suporte a múltiplos túneis simultâneos
- ✅ Reconexão automática

## Credenciais Padrão

- **Email:** admin@tunz.com
- **Senha:** admin123

⚠️ **Importante:** Altere as credenciais padrão em produção!
