const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Server } = require('socket.io');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config();

// Importar módulos de banco
const sequelize = require('./database/connection');
const User = require('./models/User');
const Tunnel = require('./models/Tunnel');

// Importar middleware e controllers
const { auth, adminOnly } = require('./middleware/auth');
const AuthController = require('./controllers/AuthController');
const TwoFAController = require('./controllers/TwoFAController');

class TunnelServer {
  constructor(port = 3000) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.port = port;
    this.tunnels = new Map(); // Armazena os túneis ativos
    this.slugs = new Map(); // Mapeia slugs para túneis
    
    this.initializeDatabase();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  async initializeDatabase() {
    try {
      await sequelize.authenticate();
      console.log('✅ Conexão com banco de dados estabelecida');
      
      // Carregar túneis existentes do banco
      await this.loadExistingTunnels();
    } catch (error) {
      console.error('❌ Erro ao conectar com banco de dados:', error.message);
      console.log('⚠️  Continuando sem persistência...');
    }
  }

  async loadExistingTunnels() {
    try {
      // Carregar todos os túneis do banco de dados, não apenas os conectados
      const tunnels = await Tunnel.findAll({
        order: [['createdAt', 'DESC']] // Mais recentes primeiro
      });

      tunnels.forEach(tunnel => {
        const tunnelData = {
          id: tunnel.id,
          protocol: tunnel.protocol,
          localUrl: tunnel.localUrl,
          slug: tunnel.slug,
          publicUrl: tunnel.publicUrl,
          status: tunnel.status === 'connected' ? 'disconnected' : tunnel.status, // Marcar conectados como desconectados até reconectar
          isCustomSlug: tunnel.isCustomSlug,
          userId: tunnel.userId, // INCLUIR O userId - ESSA ERA A LINHA FALTANTE!
          createdAt: tunnel.createdAt
        };

        this.tunnels.set(tunnel.id, tunnelData);
        this.slugs.set(tunnel.slug, tunnelData);
      });

      console.log(`📡 ${tunnels.length} túneis carregados do banco de dados`);
    } catch (error) {
      console.error('Erro ao carregar túneis:', error.message);
    }
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Middleware para roteamento de túneis via slug
    this.app.use('/tunnel/:slug', async (req, res, next) => {
      const slug = req.params.slug;
      
      console.log(`Slug: ${slug}`); // Debug
      
      if (slug && this.slugs.has(slug)) {
        const tunnel = this.slugs.get(slug);
        console.log(`Tunnel found: ${tunnel ? 'yes' : 'no'}, Status: ${tunnel ? tunnel.status : 'N/A'}`); // Debug
        
        if (tunnel && tunnel.status === 'connected') {
          console.log(`Proxying /tunnel/${slug} via WebSocket -> ${tunnel.localUrl}`); // Debug
          
          // Fazer proxy via WebSocket em vez de HTTP direto
          return this.proxyViaWebSocket(req, res, tunnel, slug);
        } else if (tunnel && tunnel.status !== 'connected') {
          return res.status(503).json({
            error: 'Túnel desconectado',
            message: 'O túnel existe mas não está conectado',
            tunnel: {
              id: tunnel.id,
              status: tunnel.status,
              publicUrl: tunnel.publicUrl
            }
          });
        }
      }
      
      // Se slug não encontrado, retornar 404
      return res.status(404).json({
        error: 'Túnel não encontrado',
        message: `Nenhum túnel encontrado com o slug: ${slug}`
      });
    });
  }

  setupRoutes() {
    // Servir arquivos estáticos das views
    this.app.use(express.static(path.join(__dirname, 'views')));

    // Rotas públicas de autenticação
    this.app.post('/api/auth/login', AuthController.login);
    this.app.post('/api/auth/register', AuthController.register);
    this.app.post('/api/auth/forgot-password', AuthController.forgotPassword);
    this.app.post('/api/auth/reset-password', AuthController.resetPassword);

    // Rotas protegidas de autenticação
    this.app.get('/api/auth/profile', auth, AuthController.profile);
    this.app.get('/api/auth/verify', auth, AuthController.verify);
    this.app.put('/api/auth/profile', auth, AuthController.updateProfile);
    this.app.post('/api/auth/change-password', auth, AuthController.changePassword);

    // Rotas 2FA
    this.app.get('/api/2fa/setup', auth, TwoFAController.setup);
    this.app.post('/api/2fa/enable', auth, TwoFAController.enable);
    this.app.post('/api/2fa/disable', auth, TwoFAController.disable);
    this.app.post('/api/2fa/verify', auth, TwoFAController.verify);
    this.app.get('/api/2fa/status', auth, TwoFAController.status);
    this.app.post('/api/2fa/regenerate-backup-codes', auth, TwoFAController.regenerateBackupCodes);

    // Rotas para páginas de autenticação
    this.app.get('/login', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'login.html'));
    });

    this.app.get('/register', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'register.html'));
    });

    this.app.get('/reset-password', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'reset-password.html'));
    });

    // Rotas para páginas protegidas (verificação de auth via JavaScript)
    this.app.get('/admin', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin - Tunz</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background: #f8f9fa; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .auth-check {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              flex-direction: column;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="auth-check">
            <div class="spinner"></div>
            <p style="margin-top: 20px; color: #666;">Verificando autenticação...</p>
          </div>
          <script>
            async function checkAuthAndLoad() {
              const token = localStorage.getItem('authToken');
              
              if (!token) {
                window.location.href = '/login';
                return;
              }
              
              try {
                const response = await fetch('/api/auth/profile', {
                  headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.user && data.user.role === 'admin') {
                    window.location.href = '/admin-content';
                  } else {
                    window.location.href = '/dashboard';
                  }
                } else {
                  localStorage.removeItem('authToken');
                  window.location.href = '/login';
                }
              } catch (error) {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
              }
            }
            
            checkAuthAndLoad();
          </script>
        </body>
        </html>
      `);
    });

    this.app.get('/dashboard', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dashboard - Tunz</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background: #f8f9fa; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .auth-check {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              flex-direction: column;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="auth-check">
            <div class="spinner"></div>
            <p style="margin-top: 20px; color: #666;">Verificando autenticação...</p>
          </div>
          <script>
            async function checkAuthAndLoad() {
              const token = localStorage.getItem('authToken');
              
              if (!token) {
                window.location.href = '/login';
                return;
              }
              
              try {
                const response = await fetch('/api/auth/profile', {
                  headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                  window.location.href = '/dashboard-content';
                } else {
                  localStorage.removeItem('authToken');
                  window.location.href = '/login';
                }
              } catch (error) {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
              }
            }
            
            checkAuthAndLoad();
          </script>
        </body>
        </html>
      `);
    });

    this.app.get('/profile', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Perfil - Tunz</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background: #f8f9fa; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .auth-check {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              flex-direction: column;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="auth-check">
            <div class="spinner"></div>
            <p style="margin-top: 20px; color: #666;">Verificando autenticação...</p>
          </div>
          <script>
            async function checkAuthAndLoad() {
              const token = localStorage.getItem('authToken');
              
              if (!token) {
                window.location.href = '/login';
                return;
              }
              
              try {
                const response = await fetch('/api/auth/profile', {
                  headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                  window.location.href = '/profile-content';
                } else {
                  localStorage.removeItem('authToken');
                  window.location.href = '/login';
                }
              } catch (error) {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
              }
            }
            
            checkAuthAndLoad();
          </script>
        </body>
        </html>
      `);
    });

    this.app.get('/2fa', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>2FA - Tunz</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background: #f8f9fa; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .auth-check {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              flex-direction: column;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="auth-check">
            <div class="spinner"></div>
            <p style="margin-top: 20px; color: #666;">Verificando autenticação...</p>
          </div>
          <script>
            async function checkAuthAndLoad() {
              const token = localStorage.getItem('authToken');
              
              if (!token) {
                window.location.href = '/login';
                return;
              }
              
              try {
                const response = await fetch('/api/auth/profile', {
                  headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                  window.location.href = '/2fa-content';
                } else {
                  localStorage.removeItem('authToken');
                  window.location.href = '/login';
                }
              } catch (error) {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
              }
            }
            
            checkAuthAndLoad();
          </script>
        </body>
        </html>
      `);
    });

    // Rotas administrativas
    this.app.get('/api/admin/users', auth, adminOnly, AuthController.listUsers);
    this.app.put('/api/admin/users/:userId/status', auth, adminOnly, AuthController.toggleUserStatus);

    // ROTAS DE TÚNEL - IMPLEMENTAÇÃO FALTANTE
    // Criar túnel
    this.app.post('/api/tunnel', auth, async (req, res) => {
      try {
        const { protocol, localUrl, customSlug } = req.body;
        const userId = req.user.id;

        // Validar dados de entrada
        if (!protocol || !localUrl) {
          return res.status(400).json({
            error: 'Dados obrigatórios faltando',
            message: 'Protocol e localUrl são obrigatórios'
          });
        }

        if (!['http', 'https'].includes(protocol.toLowerCase())) {
          return res.status(400).json({
            error: 'Protocolo inválido',
            message: 'Protocolo deve ser "http" ou "https"'
          });
        }

        // Validar URL local
        try {
          const url = new URL(localUrl);
          // Verificar se a URL tem protocolo http ou https
          if (!['http:', 'https:'].includes(url.protocol)) {
            return res.status(400).json({
              error: 'URL local inválida',
              message: 'A URL local deve usar protocolo HTTP ou HTTPS'
            });
          }
          // Verificar se a URL está bem formada
          if (!url.hostname || !url.port) {
            return res.status(400).json({
              error: 'URL local inválida',
              message: 'A URL local deve incluir hostname e porta (ex: http://localhost:3000)'
            });
          }
        } catch (error) {
          return res.status(400).json({
            error: 'URL local inválida',
            message: 'A URL local fornecida não é válida. Use o formato: http://localhost:PORTA'
          });
        }

        let slug;
        let isCustomSlug = false;

        // Verificar slug customizado
        if (customSlug) {
          if (!this.isValidSlug(customSlug)) {
            return res.status(400).json({
              error: 'Slug inválido',
              message: 'Slug deve ter entre 3-20 caracteres alfanuméricos'
            });
          }

          if (this.slugs.has(customSlug)) {
            return res.status(409).json({
              error: 'Slug em uso',
              message: 'Este slug já está sendo usado por outro túnel'
            });
          }

          slug = customSlug.toLowerCase();
          isCustomSlug = true;
        } else {
          // Gerar slug automático único
          do {
            slug = this.generateSlug();
          } while (this.slugs.has(slug));
        }

        // Gerar ID único para o túnel
        const tunnelId = uuidv4();

        // Construir URL pública
        const host = req.get('host');
        const protocol_prefix = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
        const publicUrl = `${protocol_prefix}://${host}/tunnel/${slug}`;

        // Criar túnel
        const tunnelData = {
          id: tunnelId,
          protocol: protocol.toLowerCase(),
          localUrl,
          slug,
          publicUrl,
          status: 'waiting',
          isCustomSlug,
          userId,
          createdAt: new Date()
        };

        // Salvar no banco de dados
        try {
          await Tunnel.create({
            id: tunnelId,
            slug,
            protocol: protocol.toLowerCase(),
            localUrl,
            publicUrl,
            status: 'waiting',
            isCustomSlug,
            userId
          });
        } catch (dbError) {
          console.error('Erro ao salvar túnel no banco:', dbError.message);
          // Continuar mesmo se o banco falhar
        }

        // Armazenar em memória
        this.tunnels.set(tunnelId, tunnelData);
        this.slugs.set(slug, tunnelData);

        console.log(`✅ Túnel criado: ${publicUrl} -> ${localUrl}`);

        // Responder ao cliente
        res.status(201).json({
          success: true,
          tunnelId,
          publicUrl,
          slug,
          isCustomSlug
        });

      } catch (error) {
        console.error('Erro ao criar túnel:', error.message);
        res.status(500).json({
          error: 'Erro interno do servidor',
          message: 'Falha ao criar túnel'
        });
      }
    });

    // Listar túneis do usuário
    this.app.get('/api/tunnels', auth, (req, res) => {
      try {
        const userId = req.user.id;
        console.log(`🔍 Listando túneis para usuário ID: ${userId}`);
        console.log(`📊 Total de túneis na memória: ${this.tunnels.size}`);
        
        // Debug: listar todos os túneis na memória
        const allTunnels = Array.from(this.tunnels.values());
        console.log('🔧 Todos os túneis na memória:');
        allTunnels.forEach(tunnel => {
          console.log(`  - ID: ${tunnel.id}, UserID: ${tunnel.userId}, Slug: ${tunnel.slug}`);
        });
        
        const userTunnels = allTunnels
          .filter(tunnel => tunnel.userId === userId)
          .map(tunnel => ({
            id: tunnel.id,
            slug: tunnel.slug,
            publicUrl: tunnel.publicUrl,
            localUrl: tunnel.localUrl,
            status: tunnel.status,
            isCustomSlug: tunnel.isCustomSlug,
            createdAt: tunnel.createdAt
          }));

        console.log(`✅ Túneis do usuário encontrados: ${userTunnels.length}`);
        res.json(userTunnels);
      } catch (error) {
        console.error('Erro ao listar túneis:', error.message);
        res.status(500).json({
          error: 'Erro interno do servidor',
          message: 'Falha ao listar túneis'
        });
      }
    });

    // Deletar túnel
    this.app.delete('/api/tunnel/:id', auth, async (req, res) => {
      try {
        const tunnelId = req.params.id;
        const userId = req.user.id;
        const tunnel = this.tunnels.get(tunnelId);

        if (!tunnel) {
          return res.status(404).json({
            error: 'Túnel não encontrado',
            message: 'O túnel especificado não existe'
          });
        }

        // Verificar se o usuário é dono do túnel ou é admin
        if (tunnel.userId !== userId && req.user.role !== 'admin') {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Você não tem permissão para deletar este túnel'
          });
        }

        // Remover da memória
        this.tunnels.delete(tunnelId);
        this.slugs.delete(tunnel.slug);

        // Remover do banco de dados
        try {
          await Tunnel.destroy({ where: { id: tunnelId } });
        } catch (dbError) {
          console.error('Erro ao remover túnel do banco:', dbError.message);
          // Continuar mesmo se o banco falhar
        }

        console.log(`🗑️ Túnel removido: ${tunnel.publicUrl}`);

        res.json({
          success: true,
          message: 'Túnel removido com sucesso'
        });

      } catch (error) {
        console.error('Erro ao deletar túnel:', error.message);
        res.status(500).json({
          error: 'Erro interno do servidor',
          message: 'Falha ao deletar túnel'
        });
      }
    });

    // Verificar túnel específico do usuário
    this.app.get('/api/tunnel/:id', auth, (req, res) => {
      try {
        const tunnelId = req.params.id;
        const userId = req.user.id;
        const tunnel = this.tunnels.get(tunnelId);

        if (!tunnel) {
          return res.status(404).json({
            error: 'Túnel não encontrado',
            message: 'O túnel especificado não existe'
          });
        }

        // Verificar se o usuário é dono do túnel ou é admin
        if (tunnel.userId !== userId && req.user.role !== 'admin') {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Você não tem permissão para acessar este túnel'
          });
        }

        res.json({
          id: tunnel.id,
          slug: tunnel.slug,
          publicUrl: tunnel.publicUrl,
          localUrl: tunnel.localUrl,
          status: tunnel.status,
          isCustomSlug: tunnel.isCustomSlug,
          createdAt: tunnel.createdAt
        });

      } catch (error) {
        console.error('Erro ao buscar túnel:', error.message);
        res.status(500).json({
          error: 'Erro interno do servidor',
          message: 'Falha ao buscar túnel'
        });
      }
    });

    // Rota protegida para dashboard
    this.app.get('/api/dashboard/tunnels', auth, adminOnly, (req, res) => {
      const tunnels = Array.from(this.tunnels.values()).map(tunnel => ({
        id: tunnel.id,
        slug: tunnel.slug,
        publicUrl: tunnel.publicUrl,
        localUrl: tunnel.localUrl,
        status: tunnel.status,
        isCustomSlug: tunnel.isCustomSlug,
        createdAt: tunnel.createdAt
      }));

      res.json(tunnels);
    });

    // Rota de debug
    this.app.get('/debug', (req, res) => {
      res.json({
        debug: true,
        allSlugs: Array.from(this.slugs.keys()),
        allTunnels: Array.from(this.tunnels.values()).map(t => ({
          id: t.id,
          slug: t.slug,
          status: t.status,
          localUrl: t.localUrl,
          publicUrl: t.publicUrl
        }))
      });
    });

    // Rota principal - PROTEGIDA (apenas API JSON)
    this.app.get('/', auth, adminOnly, (req, res) => {
      res.json({
        message: 'Servidor de Túnel Tunz - Painel Administrativo',
        version: '1.0.0',
        user: req.user.toJSON(),
        tunnels: Array.from(this.tunnels.values()).map(tunnel => ({
          id: tunnel.id,
          slug: tunnel.slug,
          publicUrl: tunnel.publicUrl,
          status: tunnel.status,
          isCustomSlug: tunnel.isCustomSlug,
          createdAt: tunnel.createdAt
        }))
      });
    });

    // Rota raiz sem autenticação - redireciona para dashboard ou login
    this.app.get('/home', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tunz - Sistema de Túneis</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 100px auto;
              padding: 20px;
              text-align: center;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 15px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
              margin-bottom: 30px;
            }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              margin: 10px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            .btn:hover {
              background: #764ba2;
            }
            .info {
              color: #666;
              margin-top: 30px;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Tunz - Sistema de Túneis</h1>
            <p>Sistema completo de túneis para desenvolvimento local</p>
            
            <a href="/login" class="btn">🔐 Fazer Login</a>
            <a href="/dashboard" class="btn">📊 Dashboard</a>
            
            <div class="info">
              <p><strong>Para desenvolvedores:</strong></p>
              <p>Use o comando <code>tunz http http://localhost:8000</code> para criar túneis</p>
              <p>Acesse o dashboard para gerenciar túneis ativos</p>
            </div>
          </div>

          <script>
            // Verificar se já está logado
            const token = localStorage.getItem('authToken');
            if (token) {
              // Verificar se token é válido
              fetch('/api/auth/verify', {
                headers: { 'Authorization': 'Bearer ' + token }
              })
              .then(response => {
                if (response.ok) {
                  window.location.href = '/dashboard';
                }
              })
              .catch(() => {
                localStorage.removeItem('authToken');
              });
            }
          </script>
        </body>
        </html>
      `);
    });

    this.app.get('/admin-content', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'admin.html'));
    });

    this.app.get('/profile-content', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'profile.html'));
    });

    this.app.get('/2fa-content', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', '2fa.html'));
    });

    this.app.get('/dashboard-content', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Cliente conectado: ${socket.id}`);

      socket.on('register-tunnel', async (data) => {
        const { tunnelId } = data;
        const tunnel = this.tunnels.get(tunnelId);

        if (tunnel) {
          tunnel.status = 'connected';
          tunnel.socketId = socket.id;
          socket.tunnelId = tunnelId;

          // Atualizar no banco de dados
          try {
            await Tunnel.update(
              { 
                status: 'connected',
                socketId: socket.id,
                connectedAt: new Date()
              },
              { where: { id: tunnelId } }
            );
          } catch (error) {
            console.error('Erro ao atualizar túnel no banco:', error.message);
          }

          console.log(`Túnel ${tunnelId} conectado: ${tunnel.publicUrl} -> ${tunnel.localUrl}`);
          
          socket.emit('tunnel-registered', {
            success: true,
            tunnel: {
              id: tunnel.id,
              publicUrl: tunnel.publicUrl,
              localUrl: tunnel.localUrl
            }
          });
        } else {
          socket.emit('tunnel-registered', {
            success: false,
            error: 'Túnel não encontrado'
          });
        }
      });

      socket.on('disconnect', async () => {
        if (socket.tunnelId) {
          const tunnel = this.tunnels.get(socket.tunnelId);
          if (tunnel) {
            tunnel.status = 'disconnected';
            
            // Atualizar no banco de dados
            try {
              await Tunnel.update(
                { 
                  status: 'disconnected',
                  disconnectedAt: new Date()
                },
                { where: { id: socket.tunnelId } }
              );
            } catch (error) {
              console.error('Erro ao atualizar túnel no banco:', error.message);
            }

            console.log(`Túnel ${socket.tunnelId} desconectado`);
          }
        }
        console.log(`Cliente desconectado: ${socket.id}`);
      });
    });
  }

  async proxyViaWebSocket(req, res, tunnel, slug) {
    try {
      // Encontrar o socket do cliente
      const clientSocket = this.findSocketByTunnel(tunnel.id);
      
      if (!clientSocket) {
        return res.status(502).json({
          error: 'Cliente desconectado',
          message: 'O cliente do túnel não está conectado'
        });
      }

      // Preparar dados da requisição para enviar ao cliente
      let cleanUrl = req.url;
      const prefixToRemove = `/tunnel/${slug}`;
      
      // Remover o prefixo do túnel
      if (cleanUrl.startsWith(prefixToRemove)) {
        cleanUrl = cleanUrl.substring(prefixToRemove.length);
      }
      
      // Garantir que sempre comece com /
      if (!cleanUrl.startsWith('/')) {
        cleanUrl = '/' + cleanUrl;
      }
      
      // Se ficou apenas '/', manter assim
      if (cleanUrl === '' || cleanUrl === '/') {
        cleanUrl = '/';
      }

      console.log(`🔄 Proxy via WebSocket: ${req.method} ${req.url} -> ${cleanUrl}`); // Debug

      const requestData = {
        method: req.method,
        url: cleanUrl,
        headers: req.headers,
        body: null
      };

      // Se há body na requisição (POST, PUT, etc.)
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        requestData.body = await this.getRequestBody(req);
      }

      // Criar uma Promise que será resolvida quando a resposta chegar
      const responsePromise = new Promise((resolve, reject) => {
        const requestId = Date.now() + Math.random();
        
        // Timeout de 30 segundos
        const timeout = setTimeout(() => {
          reject(new Error('Timeout na requisição'));
        }, 30000);

        // Listener para a resposta
        const responseHandler = (data) => {
          if (data.requestId === requestId) {
            clearTimeout(timeout);
            clientSocket.off('tunnel-response', responseHandler);
            resolve(data);
          }
        };

        clientSocket.on('tunnel-response', responseHandler);

        // Enviar requisição para o cliente
        clientSocket.emit('tunnel-request', {
          requestId,
          ...requestData
        });
      });

      // Aguardar resposta do cliente
      const response = await responsePromise;

      // Definir headers da resposta
      if (response.headers) {
        Object.entries(response.headers).forEach(([key, value]) => {
          res.set(key, value);
        });
      }

      // Enviar resposta
      res.status(response.statusCode || 200);
      
      if (response.body) {
        if (typeof response.body === 'string') {
          res.send(response.body);
        } else {
          res.json(response.body);
        }
      } else {
        res.end();
      }

    } catch (error) {
      console.error(`Erro no proxy WebSocket para ${slug}:`, error.message);
      
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Erro no túnel',
          message: error.message || 'Não foi possível processar a requisição'
        });
      }
    }
  }

  findSocketByTunnel(tunnelId) {
    // Procurar o socket conectado para este túnel
    for (const [socketId, socket] of this.io.of('/').sockets) {
      if (socket.tunnelId === tunnelId) {
        return socket;
      }
    }
    return null;
  }

  async getRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          // Tentar fazer parse como JSON, se falhar retornar como string
          resolve(body ? JSON.parse(body) : null);
        } catch {
          resolve(body);
        }
      });
      req.on('error', reject);
    });
  }

  generateSlug() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  isValidSlug(slug) {
    // Validar slug customizado
    // Deve conter apenas letras, números e hífens
    // Deve ter entre 3 e 20 caracteres
    // Não pode começar ou terminar com hífen
    const regex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
    
    return (
      typeof slug === 'string' &&
      slug.length >= 3 &&
      slug.length <= 20 &&
      regex.test(slug) &&
      !slug.startsWith('-') &&
      !slug.endsWith('-')
    );
  }

  async start() {
    // Aguardar inicialização do banco de dados
    await this.initializeDatabase();
    
    this.server.listen(this.port, () => {
      console.log(`🚀 Servidor de Túnel rodando na porta ${this.port}`);
      console.log(`📡 Acesse http://localhost:${this.port}/login para fazer login`);
      console.log(`📊 Dashboard: http://localhost:${this.port}/dashboard`);
    });
  }
}

// Inicializar o servidor
const server = new TunnelServer(process.env.PORT || 3000);
server.start().catch(console.error);

module.exports = TunnelServer;
