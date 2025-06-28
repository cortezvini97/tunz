#!/usr/bin/env node

const { program } = require('commander');
const TunzClient = require('./client');
const chalk = require('chalk');

program
  .name('tunz')
  .description('Cliente Tunz - Crie túneis para suas aplicações locais\n\nUso: tunz <protocolo> <url_do_computador_do_usuario>\n\nExemplos:\n  tunz http http://localhost:3000\n  tunz https https://127.0.0.1:8080\n  tunz http http://localhost:8000 --slug meuapp')
  .version('1.0.0');

program
  .argument('<protocolo>', 'Protocolo da aplicação local (http ou https)')
  .argument('<url_do_computador_do_usuario>', 'URL completa da aplicação no seu computador (ex: http://localhost:3000, https://127.0.0.1:8080)')
  .option('-s, --server <server>', 'Servidor do túnel', 'http://<YOUR_SERVER_URL>') //AQUI DEFINIMOS A URL DO SERVIDOR
  .option('-l, --slug <slug>', 'Slug customizado (3-20 caracteres)')
  .option('-v, --verbose', 'Modo verboso')
  .action(async (protocolo, url_do_computador_do_usuario, options) => {
    try {
      console.log(chalk.blue('🚀 Iniciando Tunz Client...'));
      console.log(chalk.blue(options.server));
      console.log(chalk.gray(`📡 Protocolo: ${protocolo}`));
      console.log(chalk.gray(`🖥️  URL local: ${url_do_computador_do_usuario}`));
      
      // Validação adicional de segurança para URLs locais
      try {
        const url = new URL(url_do_computador_do_usuario);
        const hostname = url.hostname.toLowerCase();
        
        if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) && 
            !hostname.match(/^192\.168\./) && 
            !hostname.match(/^10\./) && 
            !hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
          console.log(chalk.yellow('⚠️  AVISO: Você está usando uma URL que não parece ser local.'));
          console.log(chalk.yellow('   Para aplicações locais, use: http://localhost:PORTA ou http://127.0.0.1:PORTA'));
          console.log(chalk.yellow('   O túnel sempre conectará na máquina onde este cliente está rodando.'));
          console.log('');
        }
      } catch (urlError) {
        // Ignorar erros de parsing da URL, o client.js vai tratar
      }
      
      const client = new TunzClient({
        serverUrl: options.server,
        verbose: options.verbose
      });

      await client.createTunnel(protocolo, url_do_computador_do_usuario, options.slug);
    } catch (error) {
      console.error(chalk.red('❌ Erro:'), error.message || error.toString() || 'Erro desconhecido');
      if (options.verbose) {
        console.error(chalk.gray('Detalhes do erro:'), error);
      }
      process.exit(1);
    }
  });

program
  .command('list')
  .description('Listar túneis ativos')
  .option('-s, --server <server>', 'Servidor do túnel', 'http://<YOUR_SERVER_URL>') //AQUI DEFINIMOS A URL DO SERVIDOR
  .action(async (options) => {
    try {
      const client = new TunzClient({
        serverUrl: options.server
      });

      await client.listTunnels();
    } catch (error) {
      console.error(chalk.red('❌ Erro:'), error.message);
      process.exit(1);
    }
  });

program
  .command('login')
  .description('Fazer login no servidor Tunz')
  .option('-s, --server <server>', 'Servidor do túnel', 'http://<YOUR_SERVER_URL>') //AQUI DEFINIMOS A URL DO SERVIDOR
  .option('-e, --email <email>', 'Email do usuário')
  .option('-p, --password <password>', 'Senha do usuário')
  .action(async (options) => {
    try {
      const client = new TunzClient({
        serverUrl: options.server
      });

      await client.login(options.email, options.password);
    } catch (error) {
      console.error(chalk.red('❌ Erro:'), error.message);
      process.exit(1);
    }
  });

program
  .command('get-tunels')
  .description('Exibir todos os túneis do usuário atual')
  .option('-s, --server <server>', 'Servidor do túnel', 'http://<YOUR_SERVER_URL>') //AQUI DEFINIMOS A URL DO SERVIDOR
  .option('-v, --verbose', 'Modo verboso')
  .action(async (options) => {
    try {
      const client = new TunzClient({
        serverUrl: options.server,
        verbose: options.verbose
      });

      await client.getUserTunnels();
    } catch (error) {
      console.error(chalk.red('❌ Erro:'), error.message);
      process.exit(1);
    }
  });

program
  .command('connect')
  .description('Conectar em um túnel específico do usuário')
  .argument('<tunnel_id>', 'ID do túnel para conectar')
  .option('-s, --server <server>', 'Servidor do túnel', 'http://<YOUR_SERVER_URL>') //AQUI DEFINIMOS A URL DO SERVIDOR
  .option('-v, --verbose', 'Modo verboso')
  .action(async (tunnel_id, options) => {
    try {
      const client = new TunzClient({
        serverUrl: options.server,
        verbose: options.verbose
      });

      await client.connectToExistingTunnel(tunnel_id);
    } catch (error) {
      console.error(chalk.red('❌ Erro:'), error.message);
      process.exit(1);
    }
  });

program.parse();
