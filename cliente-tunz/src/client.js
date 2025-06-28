const axios = require('axios');
const { io } = require('socket.io-client');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

class TunzClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:7070';
    this.verbose = options.verbose || false;
    this.socket = null;
    this.tunnel = null;
  }

  async createTunnel(protocol, localUrl, customSlug = null) {
    const spinner = ora('Criando túnel...').start();

    try {
      // Validar protocolo
      if (!['http', 'https'].includes(protocol.toLowerCase())) {
        throw new Error('Protocolo deve ser "http" ou "https"');
      }

      // Validar URL local
      if (!this.isValidUrl(localUrl)) {
        throw new Error('URL local inválida');
      }

      // IMPORTANTE: Validar que a URL é realmente LOCAL (não do servidor VPS)
      if (!this.isLocalUrl(localUrl)) {
        throw new Error('A URL deve ser local (localhost, 127.0.0.1, ou IP local da rede). Não use URLs de servidores externos.');
      }

      // Testar se a aplicação local está rodando
      spinner.text = 'Testando conectividade com aplicação local...';
      const isRunning = await this.testLocalConnection(localUrl);
      if (!isRunning) {
        throw new Error(`Aplicação local não está rodando em ${localUrl}. Inicie sua aplicação primeiro.`);
      }

      const requestData = {
        protocol: protocol.toLowerCase(),
        localUrl
      };

      // Adicionar slug customizado se fornecido
      if (customSlug) {
        requestData.customSlug = customSlug;
        spinner.text = `Criando túnel com slug '${customSlug}'...`;
      }

      // Criar túnel no servidor
      if (this.verbose) {
        console.log(chalk.gray(`🔗 Fazendo requisição para: ${this.serverUrl}/api/tunnel`));
        console.log(chalk.gray(`📦 Dados:`, JSON.stringify(requestData, null, 2)));
      }
      
      // Carregar token de autenticação
      const token = this.loadToken();
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Execute "tunz login" primeiro.');
      }

      // Configurar headers com autenticação
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      if (this.verbose) {
        console.log(chalk.gray(`🔑 Usando token de autenticação`));
      }
      
      const response = await axios.post(`${this.serverUrl}/api/tunnel`, requestData, config);

      const { tunnelId, publicUrl, slug, isCustomSlug } = response.data;
      this.tunnel = { tunnelId, publicUrl, slug, localUrl, isCustomSlug };

      if (isCustomSlug) {
        spinner.text = 'Conectando ao servidor com slug customizado...';
      } else {
        spinner.text = 'Conectando ao servidor...';
      }

      // Conectar via WebSocket
      await this.connectToServer(tunnelId);

      if (isCustomSlug) {
        spinner.succeed('Túnel criado com slug customizado!');
      } else {
        spinner.succeed('Túnel criado com sucesso!');
      }

      this.displayTunnelInfo();
      this.startHeartbeat();

      // Manter o processo ativo
      process.on('SIGINT', () => {
        this.cleanup();
      });

      process.on('SIGTERM', () => {
        this.cleanup();
      });

    } catch (error) {
      spinner.fail('Falha ao criar túnel');
      
      if (this.verbose) {
        console.log(chalk.gray('🔍 Analisando erro...'));
        console.log(chalk.gray('Tipo do erro:', typeof error));
        console.log(chalk.gray('Error.name:', error.name));
        console.log(chalk.gray('Error.message:', error.message));
        console.log(chalk.gray('Error.code:', error.code));
        if (error.response) {
          console.log(chalk.gray('Response status:', error.response.status));
          console.log(chalk.gray('Response data:', error.response.data));
        }
      }
      
      // Tratar erros específicos da API
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || error.response.data.error || `Erro HTTP ${error.response.status}`);
      }
      
      // Tratar erros de conexão
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Não foi possível conectar ao servidor ${this.serverUrl}. Verifique se o servidor está rodando.`);
      }
      
      if (error.code === 'ENOTFOUND') {
        throw new Error(`Servidor não encontrado: ${this.serverUrl}`);
      }
      
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Timeout ao conectar com o servidor ${this.serverUrl}`);
      }
      
      throw new Error(error.message || error.toString() || 'Erro desconhecido ao criar túnel');
    }
  }

  async connectToServer(tunnelId) {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl);

      this.socket.on('connect', () => {
        if (this.verbose) {
          console.log(chalk.gray('📡 Conectado ao servidor'));
        }

        this.socket.emit('register-tunnel', { tunnelId });
      });

      this.socket.on('tunnel-registered', (data) => {
        if (data.success) {
          resolve();
        } else {
          reject(new Error(data.error || 'Falha ao registrar túnel'));
        }
      });

      this.socket.on('disconnect', () => {
        if (this.verbose) {
          console.log(chalk.yellow('⚠️  Desconectado do servidor'));
        }
      });

      this.socket.on('reconnect', () => {
        if (this.verbose) {
          console.log(chalk.green('🔄 Reconectado ao servidor'));
        }
        this.socket.emit('register-tunnel', { tunnelId });
      });

      this.socket.on('connect_error', (error) => {
        reject(new Error(`Erro de conexão: ${error.message}`));
      });

      // Handler para requisições do túnel - GARANTE que sempre conecta no localhost do USUÁRIO
      this.socket.on('tunnel-request', async (data) => {
        try {
          if (this.verbose) {
            console.log(chalk.gray(`🔄 Redirecionando: ${data.method} ${data.url} -> ${this.tunnel.localUrl}`));
            console.log(chalk.gray(`📍 URL construída: ${localUrl}`));
          }

          // ===================================================================
          // SEGURANÇA CRÍTICA: SEMPRE usar this.tunnel.localUrl 
          // Esta URL é da máquina do USUÁRIO (ex: http://localhost:4000)
          // NUNCA fazer requisições para IPs/domínios do servidor VPS
          // ===================================================================
          const requestPath = data.url || '/';
          const localUrl = this.tunnel.localUrl.replace(/\/$/, '') + requestPath;
          
          // Validação adicional de segurança
          if (!this.isLocalUrl(this.tunnel.localUrl)) {
            throw new Error('ERRO DE SEGURANÇA: Tentativa de conexão com URL não-local detectada!');
          }
          
          // Preparar headers (remover headers específicos do servidor)
          const cleanHeaders = { ...data.headers };
          delete cleanHeaders.host; // Remover host original
          delete cleanHeaders['x-forwarded-for'];
          delete cleanHeaders['x-forwarded-proto'];
          
          const requestConfig = {
            method: data.method,
            url: localUrl,
            headers: cleanHeaders,
            timeout: 15000,
            validateStatus: () => true // Aceitar qualquer status code
          };

          // Adicionar body se existir
          if (data.body) {
            requestConfig.data = data.body;
          }

          // Fazer requisição para o localhost da máquina do USUÁRIO
          const response = await axios(requestConfig);

          // Enviar resposta de volta
          this.socket.emit('tunnel-response', {
            requestId: data.requestId,
            statusCode: response.status,
            headers: response.headers,
            body: response.data
          });

        } catch (error) {
          if (this.verbose) {
            console.log(chalk.red(`❌ Erro ao processar requisição: ${error.message}`));
          }

          // Enviar erro de volta
          this.socket.emit('tunnel-response', {
            requestId: data.requestId,
            statusCode: 502,
            headers: { 'content-type': 'application/json' },
            body: { 
              error: 'Erro do túnel', 
              message: error.message,
              localUrl: this.tunnel.localUrl
            }
          });
        }
      });

      // Timeout para conexão
      setTimeout(() => {
        if (!this.socket.connected) {
          reject(new Error('Timeout na conexão com o servidor'));
        }
      }, 10000);
    });
  }

  async listTunnels() {
    try {
      // Carregar token de autenticação
      const token = this.loadToken();
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Execute "tunz login" primeiro.');
      }

      // Configurar headers com autenticação
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await axios.get(`${this.serverUrl}/api/tunnels`, config);
      const tunnels = response.data;

      if (tunnels.length === 0) {
        console.log(chalk.yellow('📭 Nenhum túnel ativo encontrado'));
        return;
      }

      console.log(chalk.blue('\n📡 Túneis Ativos:\n'));

      tunnels.forEach((tunnel, index) => {
        console.log(`${index + 1}. ${chalk.green(tunnel.publicUrl)}`);
        console.log(`   Local: ${chalk.cyan(tunnel.localUrl)}`);
        console.log(`   Status: ${this.getStatusColor(tunnel.status)}`);
        console.log(`   Tipo: ${tunnel.isCustomSlug ? chalk.yellow('Customizado') : chalk.gray('Automático')}`);
        console.log(`   Criado: ${new Date(tunnel.createdAt).toLocaleString()}`);
        console.log('');
      });

    } catch (error) {
      throw new Error(`Erro ao listar túneis: ${error.message}`);
    }
  }

  displayTunnelInfo() {
    console.log('');
    console.log(chalk.green('✅ Túnel ativo!'));
    console.log('');
    console.log(chalk.blue('📋 Informações do Túnel:'));
    console.log(`   ${chalk.bold('URL Pública:')} ${chalk.green(this.tunnel.publicUrl)}`);
    console.log(`   ${chalk.bold('URL Local:')} ${chalk.cyan(this.tunnel.localUrl)}`);
    console.log(`   ${chalk.bold('Slug:')} ${chalk.magenta(this.tunnel.slug)}`);
    
    if (this.tunnel.isCustomSlug) {
      console.log(`   ${chalk.bold('Tipo:')} ${chalk.yellow('Slug Customizado')}`);
    } else {
      console.log(`   ${chalk.bold('Tipo:')} ${chalk.gray('Slug Automático')}`);
    }
    
    console.log('');
    console.log(chalk.blue('🔗 Funcionamento:'));
    console.log(`   ${chalk.gray('Todas as requisições para')} ${chalk.green(this.tunnel.publicUrl)}`);
    console.log(`   ${chalk.gray('serão redirecionadas para')} ${chalk.cyan(this.tunnel.localUrl)} ${chalk.gray('(sua máquina)')}`);
    console.log('');
    console.log(chalk.gray('💡 Pressione Ctrl+C para encerrar o túnel'));
    console.log('');
  }

  startHeartbeat() {
    // Verificar se a aplicação local está respondendo
    setInterval(async () => {
      try {
        await axios.get(this.tunnel.localUrl, { timeout: 5000 });
      } catch (error) {
        if (this.verbose) {
          console.log(chalk.yellow(`⚠️  Aplicação local não está respondendo: ${error.message}`));
        }
      }
    }, 30000); // Verificar a cada 30 segundos
  }

  cleanup() {
    console.log(chalk.yellow('\n🔄 Encerrando túnel...'));
    
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log(chalk.green('✅ Túnel encerrado com sucesso'));
    process.exit(0);
  }

  isValidUrl(string) {
    try {
      const url = new URL(string);
      // Verificar protocolo
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }
      // Verificar se tem hostname
      if (!url.hostname) {
        return false;
      }
      return true;
    } catch (error) {
      console.error(`❌ URL inválida: ${string}`);
      console.error(`💡 Use o formato correto: http://localhost:PORTA`);
      console.error(`📝 Exemplo: http://localhost:3000`);
      return false;
    }
  }

  // IMPORTANTE: Função que garante que a URL é LOCAL (da máquina do usuário)
  isLocalUrl(urlString) {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname.toLowerCase();
      
      // Lista de hostnames que são considerados locais
      const localHostnames = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1', // IPv6 localhost
        '[::1]' // IPv6 localhost com brackets
      ];
      
      // Verificar se é localhost ou 127.0.0.1
      if (localHostnames.includes(hostname)) {
        return true;
      }
      
      // Verificar se é um IP privado (redes locais)
      if (this.isPrivateIP(hostname)) {
        return true;
      }
      
      // Se chegou até aqui, não é uma URL local
      return false;
    } catch (error) {
      return false;
    }
  }

  // Função auxiliar para verificar IPs privados
  isPrivateIP(ip) {
    // Regex para IPs privados
    const privateIPRegex = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^169\.254\./               // 169.254.0.0/16 (link-local)
    ];
    
    return privateIPRegex.some(regex => regex.test(ip));
  }

  getStatusColor(status) {
    switch (status) {
      case 'connected':
        return chalk.green('🟢 Conectado');
      case 'disconnected':
        return chalk.red('🔴 Desconectado');
      case 'waiting':
        return chalk.yellow('🟡 Aguardando');
      default:
        return chalk.gray('⚪ Desconhecido');
    }
  }

  // Métodos para gerenciar configuração
  getConfigPath() {
    const userHome = os.homedir();
    const tunzDir = path.join(userHome, '.tunz');
    return {
      dir: tunzDir,
      file: path.join(tunzDir, 'auth.cfg')
    };
  }

  ensureConfigDir() {
    const { dir } = this.getConfigPath();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  saveToken(token) {
    try {
      this.ensureConfigDir();
      const { file } = this.getConfigPath();
      const config = {
        token: token,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(file, JSON.stringify(config, null, 2));
      if (this.verbose) {
        console.log(chalk.gray(`📁 Token salvo em: ${file}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Erro ao salvar token:'), error.message);
    }
  }

  loadToken() {
    try {
      const { file } = this.getConfigPath();
      if (fs.existsSync(file)) {
        const config = JSON.parse(fs.readFileSync(file, 'utf8'));
        return config.token;
      }
    } catch (error) {
      if (this.verbose) {
        console.log(chalk.gray('⚠️ Erro ao carregar token:', error.message));
      }
    }
    return null;
  }

  createReadlineInterface() {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  askQuestion(question) {
    const rl = this.createReadlineInterface();
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  askPassword(question) {
    const rl = this.createReadlineInterface();
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
      // Ocultar entrada de senha (funciona apenas em alguns terminais)
      if (rl.input.isTTY) {
        rl._writeToOutput = function _writeToOutput(stringToWrite) {
          if (stringToWrite.charCodeAt(0) === 13) {
            rl.output.write(stringToWrite);
          } else {
            rl.output.write('*');
          }
        };
      }
    });
  }

  async login(email, password) {
    const spinner = ora('Fazendo login...').start();

    try {
      // Se email ou senha não foram fornecidos, solicitar via prompt
      if (!email) {
        spinner.stop();
        email = await this.askQuestion(chalk.blue('📧 Email: '));
        spinner.start('Fazendo login...');
      }

      if (!password) {
        spinner.stop();
        password = await this.askPassword(chalk.blue('🔒 Senha: '));
        spinner.start('Fazendo login...');
      }

      // Dados do login
      const loginData = { email, password };

      // Primeira tentativa de login
      let response = await axios.post(`${this.serverUrl}/api/auth/login`, loginData);
      
      // Verificar se precisa de 2FA
      if (response.status === 202 && response.data?.requiresTwoFA) {
        // Solicitar código 2FA
        spinner.stop();
        console.log(chalk.yellow('🔐 Autenticação de dois fatores necessária'));
        
        const choice = await this.askQuestion(chalk.blue('Usar (1) App de autenticação ou (2) Código de backup? [1/2]: '));
        
        if (choice === '2') {
          const backupCode = await this.askQuestion(chalk.blue('🛡️ Código de backup: '));
          loginData.backupCode = backupCode;
        } else {
          const twoFAToken = await this.askQuestion(chalk.blue('📱 Código do app (6 dígitos): '));
          loginData.twoFAToken = twoFAToken;
        }

        spinner.start('Validando código 2FA...');
        response = await axios.post(`${this.serverUrl}/api/auth/login`, loginData);
      }
      
      // Verificar se o login foi bem-sucedido
      if (response.data.success && response.data.token) {
        this.saveToken(response.data.token);
        spinner.succeed(chalk.green('✅ Login realizado com sucesso!'));
        
        const user = response.data.user;
        console.log(chalk.blue(`👋 Bem-vindo, ${user.name}!`));
        console.log(chalk.gray(`📧 Email: ${user.email}`));
        console.log(chalk.gray(`👤 Tipo: ${user.role === 'admin' ? 'Administrador' : 'Usuário'}`));
        
        if (user.twoFAEnabled) {
          console.log(chalk.green('🔐 2FA ativado'));
        }
        
        console.log(chalk.blue('\n💡 Agora você pode usar os comandos do Tunz autenticado!'));
      } else {
        throw new Error('Resposta de login inválida');
      }

    } catch (error) {
      spinner.fail(chalk.red('❌ Falha no login'));
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error(error.message || 'Erro desconhecido');
      }
    }
  }

  // Novo método: Listar túneis do usuário atual
  async getUserTunnels() {
    const spinner = ora('Carregando túneis do usuário...').start();

    try {
      // Carregar token de autenticação
      const token = this.loadToken();
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Execute "tunz login" primeiro.');
      }

      // Configurar headers com autenticação
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await axios.get(`${this.serverUrl}/api/tunnels`, config);
      const tunnels = response.data;

      spinner.succeed('Túneis carregados com sucesso!');

      if (tunnels.length === 0) {
        console.log(chalk.yellow('📭 Você não possui túneis criados'));
        console.log(chalk.blue('💡 Use "tunz http http://localhost:8000" para criar um túnel'));
        return;
      }

      console.log(chalk.blue(`\n📡 Seus Túneis (${tunnels.length}):\n`));

      tunnels.forEach((tunnel, index) => {
        console.log(`${index + 1}. ${chalk.green(tunnel.publicUrl)}`);
        console.log(`   ${chalk.bold('ID:')} ${chalk.cyan(tunnel.id)}`);
        console.log(`   ${chalk.bold('Local:')} ${chalk.cyan(tunnel.localUrl)}`);
        console.log(`   ${chalk.bold('Status:')} ${this.getStatusColor(tunnel.status)}`);
        console.log(`   ${chalk.bold('Tipo:')} ${tunnel.isCustomSlug ? chalk.yellow('Customizado') : chalk.gray('Automático')}`);
        console.log(`   ${chalk.bold('Criado:')} ${chalk.gray(new Date(tunnel.createdAt).toLocaleString())}`);
        
        if (tunnel.status === 'waiting') {
          console.log(`   ${chalk.blue('💡 Para conectar:')} tunz connect ${tunnel.id}`);
        }
        
        console.log('');
      });

      console.log(chalk.blue('💡 Comandos úteis:'));
      console.log(chalk.gray('   tunz connect <tunnel_id>    # Conectar em um túnel específico'));
      console.log(chalk.gray('   tunz get-tunels             # Listar seus túneis'));

    } catch (error) {
      spinner.fail('Falha ao carregar túneis');
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error(error.message || 'Erro desconhecido');
      }
    }
  }

  // Novo método: Conectar em um túnel existente do usuário
  async connectToExistingTunnel(tunnelId) {
    const spinner = ora('Verificando túnel...').start();

    try {
      // Carregar token de autenticação
      const token = this.loadToken();
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Execute "tunz login" primeiro.');
      }

      // Configurar headers com autenticação
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // Buscar túneis do usuário para verificar se o tunnel_id existe e pertence ao usuário
      spinner.text = 'Verificando se o túnel pertence ao usuário...';
      const tunnelsResponse = await axios.get(`${this.serverUrl}/api/tunnels`, config);
      const userTunnels = tunnelsResponse.data;

      // Verificar se o túnel existe e pertence ao usuário
      const tunnel = userTunnels.find(t => t.id === tunnelId);
      
      if (!tunnel) {
        throw new Error(`Túnel "${tunnelId}" não encontrado ou não pertence ao usuário atual.`);
      }

      if (tunnel.status === 'connected') {
        throw new Error(`Túnel "${tunnelId}" já está conectado.`);
      }

      // IMPORTANTE: Validar que a URL do túnel é local (segurança adicional)
      if (!this.isLocalUrl(tunnel.localUrl)) {
        throw new Error(`ERRO DE SEGURANÇA: O túnel "${tunnelId}" não possui uma URL local válida. URL: ${tunnel.localUrl}`);
      }

      spinner.text = `Conectando ao túnel ${tunnel.slug}...`;

      // Configurar informações do túnel no cliente
      this.tunnel = {
        tunnelId: tunnel.id,
        publicUrl: tunnel.publicUrl,
        slug: tunnel.slug,
        localUrl: tunnel.localUrl,
        isCustomSlug: tunnel.isCustomSlug
      };

      // Conectar via WebSocket
      await this.connectToServer(tunnelId);

      if (tunnel.isCustomSlug) {
        spinner.succeed('Conectado ao túnel com slug customizado!');
      } else {
        spinner.succeed('Conectado ao túnel com sucesso!');
      }

      this.displayTunnelInfo();
      this.startHeartbeat();

      // Manter o processo ativo
      process.on('SIGINT', () => {
        this.cleanup();
      });

      process.on('SIGTERM', () => {
        this.cleanup();
      });

    } catch (error) {
      spinner.fail('Falha ao conectar no túnel');
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error(error.message || 'Erro desconhecido');
      }
    }
  }

  // Testar se a aplicação local está rodando
  async testLocalConnection(localUrl) {
    try {
      const axios = require('axios');
      const response = await axios.get(localUrl, { 
        timeout: 5000,
        validateStatus: () => true // Aceitar qualquer status HTTP
      });
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error(`❌ Nenhuma aplicação rodando em ${localUrl}`);
        console.error(`💡 Inicie sua aplicação local primeiro`);
        return false;
      }
      // Outros erros podem indicar que há algo rodando (ex: 404, 500, etc)
      return true;
    }
  }
}

module.exports = TunzClient;
