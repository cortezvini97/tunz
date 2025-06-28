const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    // Configuração para desenvolvimento (usando Ethereal Email para teste)
    if (process.env.NODE_ENV === 'development') {
      this.setupEtherealForDevelopment();
    } else {
      this.setupProductionEmail();
    }
  }

  async setupEtherealForDevelopment() {
    try {
      // Criar conta de teste automaticamente
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('📧 Email configurado para desenvolvimento (Ethereal)');
      console.log(`   User: ${testAccount.user}`);
      console.log(`   Pass: ${testAccount.pass}`);

    } catch (error) {
      console.error('Erro ao configurar email de desenvolvimento:', error);
      this.transporter = null;
    }
  }

  setupProductionEmail() {
    // Configuração para produção usando variáveis de ambiente
    const config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (!config.host || !config.auth.user || !config.auth.pass) {
      console.warn('⚠️  Configurações de email não encontradas. Email desabilitado.');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport(config);
    console.log('📧 Email configurado para produção');
  }

  async sendResetPasswordEmail(email, resetToken, userName) {
    if (!this.transporter) {
      console.log('📧 Simulando envio de email (transporter não configurado)');
      console.log(`   Para: ${email}`);
      console.log(`   Token: ${resetToken}`);
      console.log(`   Link: http://localhost:${process.env.PORT || 3000}/reset-password?token=${resetToken}`);
      return { success: true, messageId: 'simulated' };
    }

    const resetUrl = `http://localhost:${process.env.PORT || 3000}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Tunz - Sistema de Túneis" <${process.env.SMTP_USER || 'noreply@tunz.local'}>`,
      to: email,
      subject: 'Redefinição de Senha - Tunz',
      html: this.getResetPasswordTemplate(userName, resetUrl, resetToken)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      // Em desenvolvimento, mostrar preview do email
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email enviado:', info.messageId);
        console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return { success: false, error: error.message };
    }
  }

  getResetPasswordTemplate(userName, resetUrl, resetToken) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinição de Senha - Tunz</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
                margin: 0;
                padding: 20px;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 2.5rem;
            }
            .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-size: 1.1rem;
            }
            .content {
                padding: 40px 30px;
            }
            .content h2 {
                color: #333;
                margin-bottom: 20px;
                font-size: 1.5rem;
            }
            .content p {
                line-height: 1.6;
                margin-bottom: 20px;
                color: #555;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 1rem;
                margin: 20px 0;
            }
            .button:hover {
                background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
            }
            .warning {
                background: #fff3cd;
                color: #856404;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #ffc107;
                margin: 20px 0;
            }
            .footer {
                background: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 0.9rem;
                border-top: 1px solid #e9ecef;
            }
            .token-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                color: #333;
                margin: 20px 0;
                word-break: break-all;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀</h1>
                <h2>Tunz</h2>
                <p>Sistema de Túneis</p>
            </div>
            
            <div class="content">
                <h2>Olá, ${userName}!</h2>
                
                <p>Você solicitou a redefinição da sua senha no Tunz. Para continuar, clique no botão abaixo:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">🔐 Redefinir Minha Senha</a>
                </div>
                
                <div class="warning">
                    <strong>⏰ Importante:</strong> Este link é válido por apenas <strong>10 minutos</strong> por motivos de segurança.
                </div>
                
                <p>Se você não conseguir clicar no botão, copie e cole o link abaixo no seu navegador:</p>
                
                <div class="token-info">
                    ${resetUrl}
                </div>
                
                <p><strong>Se você não solicitou esta redefinição</strong>, ignore este email. Sua senha atual permanecerá inalterada.</p>
                
                <p>Em caso de dúvidas, entre em contato com nosso suporte.</p>
            </div>
            
            <div class="footer">
                <p>Este é um email automático, não responda.</p>
                <p>© ${new Date().getFullYear()} Tunz - Sistema de Túneis</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async sendWelcomeEmail(email, userName) {
    if (!this.transporter) {
      console.log('📧 Simulando envio de email de boas-vindas');
      console.log(`   Para: ${email}`);
      return { success: true, messageId: 'simulated' };
    }

    const mailOptions = {
      from: `"Tunz - Sistema de Túneis" <${process.env.SMTP_USER || 'noreply@tunz.local'}>`,
      to: email,
      subject: 'Bem-vindo ao Tunz!',
      html: this.getWelcomeTemplate(userName)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email de boas-vindas enviado:', info.messageId);
        console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      return { success: false, error: error.message };
    }
  }

  getWelcomeTemplate(userName) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Tunz!</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
                margin: 0;
                padding: 20px;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 2.5rem;
            }
            .content {
                padding: 40px 30px;
            }
            .content h2 {
                color: #333;
                margin-bottom: 20px;
            }
            .content p {
                line-height: 1.6;
                margin-bottom: 20px;
                color: #555;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 1rem;
                margin: 10px 5px;
            }
            .footer {
                background: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 0.9rem;
                border-top: 1px solid #e9ecef;
            }
            .info-box {
                background: #e7f3ff;
                border-left: 4px solid #007bff;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀</h1>
                <h2>Bem-vindo ao Tunz!</h2>
            </div>
            
            <div class="content">
                <h2>Olá, ${userName}!</h2>
                
                <p>Obrigado por se cadastrar no Tunz! Sua conta foi criada com sucesso.</p>
                
                <div class="info-box">
                    <strong>📋 Status da Conta:</strong> Sua conta está <strong>pendente de aprovação</strong> pelo administrador. 
                    Você receberá um email quando sua conta for ativada.
                </div>
                
                <p>Enquanto isso, você pode:</p>
                <ul>
                    <li>📚 Explorar nossa documentação</li>
                    <li>💻 Baixar o cliente Tunz</li>
                    <li>🎯 Conhecer os recursos disponíveis</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:${process.env.PORT || 3000}/dashboard" class="button">🏠 Acessar Dashboard</a>
                    <a href="http://localhost:${process.env.PORT || 3000}/login" class="button">🔐 Fazer Login</a>
                </div>
                
                <p>Se você tiver alguma dúvida, não hesite em entrar em contato conosco.</p>
                
                <p>Bem-vindo à família Tunz! 🎉</p>
            </div>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} Tunz - Sistema de Túneis</p>
                <p>Este é um email automático, não responda.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();
