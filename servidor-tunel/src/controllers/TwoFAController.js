const User = require('../models/User');
const QRCode = require('qrcode');

class TwoFAController {
  // GET /api/2fa/setup - Gerar QR code para configurar 2FA
  static async setup(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (user.twoFAEnabled) {
        return res.status(400).json({ error: '2FA já está habilitado' });
      }

      // Gerar novo secret
      const { secret, qrCode } = user.generate2FASecret();
      
      // Gerar códigos de backup
      const backupCodes = user.generateBackupCodes();

      // Gerar QR code como imagem
      const qrCodeImage = await QRCode.toDataURL(qrCode);

      res.json({
        secret,
        qrCode: qrCodeImage,
        backupCodes,
        manualEntryKey: secret
      });
    } catch (error) {
      console.error('Erro ao configurar 2FA:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // POST /api/2fa/enable - Habilitar 2FA após verificar token
  static async enable(req, res) {
    try {
      const { secret, token, backupCodes } = req.body;

      if (!secret || !token) {
        return res.status(400).json({ error: 'Secret e token são obrigatórios' });
      }

      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (user.twoFAEnabled) {
        return res.status(400).json({ error: '2FA já está habilitado' });
      }

      // Temporariamente definir o secret para verificar o token
      user.twoFASecret = secret;
      
      // Verificar se o token está correto
      if (!user.verify2FAToken(token)) {
        return res.status(400).json({ error: 'Token inválido' });
      }

      // Salvar as configurações 2FA
      user.twoFAEnabled = true;
      user.twoFABackupCodes = JSON.stringify(backupCodes || []);
      await user.save();

      res.json({ 
        message: '2FA habilitado com sucesso',
        backupCodes: backupCodes || []
      });
    } catch (error) {
      console.error('Erro ao habilitar 2FA:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // POST /api/2fa/disable - Desabilitar 2FA
  static async disable(req, res) {
    try {
      const { token, password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Senha é obrigatória' });
      }

      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (!user.twoFAEnabled) {
        return res.status(400).json({ error: '2FA não está habilitado' });
      }

      // Verificar senha
      if (!(await user.validatePassword(password))) {
        return res.status(400).json({ error: 'Senha incorreta' });
      }

      // Se 2FA está habilitado, verificar token
      if (user.twoFAEnabled && (!token || !user.verify2FAToken(token))) {
        return res.status(400).json({ error: 'Token 2FA inválido' });
      }

      // Desabilitar 2FA
      user.twoFAEnabled = false;
      user.twoFASecret = null;
      user.twoFABackupCodes = null;
      await user.save();

      res.json({ message: '2FA desabilitado com sucesso' });
    } catch (error) {
      console.error('Erro ao desabilitar 2FA:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // POST /api/2fa/verify - Verificar token 2FA
  static async verify(req, res) {
    try {
      const { token, backupCode } = req.body;

      if (!token && !backupCode) {
        return res.status(400).json({ error: 'Token ou código de backup é obrigatório' });
      }

      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (!user.twoFAEnabled) {
        return res.status(400).json({ error: '2FA não está habilitado' });
      }

      let valid = false;

      if (backupCode) {
        valid = user.verifyBackupCode(backupCode);
        if (valid) {
          await user.save(); // Salvar para remover o código usado
        }
      } else if (token) {
        valid = user.verify2FAToken(token);
      }

      if (!valid) {
        return res.status(400).json({ error: 'Token ou código de backup inválido' });
      }

      res.json({ message: 'Token verificado com sucesso', valid: true });
    } catch (error) {
      console.error('Erro ao verificar token 2FA:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // GET /api/2fa/status - Status do 2FA do usuário
  static async status(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      let backupCodesCount = 0;
      if (user.twoFABackupCodes) {
        try {
          const codes = JSON.parse(user.twoFABackupCodes);
          backupCodesCount = codes.length;
        } catch (e) {
          backupCodesCount = 0;
        }
      }

      res.json({
        enabled: user.twoFAEnabled,
        backupCodesCount
      });
    } catch (error) {
      console.error('Erro ao verificar status 2FA:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // POST /api/2fa/regenerate-backup-codes - Regenerar códigos de backup
  static async regenerateBackupCodes(req, res) {
    try {
      const { password, token } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Senha é obrigatória' });
      }

      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (!user.twoFAEnabled) {
        return res.status(400).json({ error: '2FA não está habilitado' });
      }

      // Verificar senha
      if (!(await user.validatePassword(password))) {
        return res.status(400).json({ error: 'Senha incorreta' });
      }

      // Verificar token 2FA se fornecido
      if (token && !user.verify2FAToken(token)) {
        return res.status(400).json({ error: 'Token 2FA inválido' });
      }

      // Gerar novos códigos de backup
      const backupCodes = user.generateBackupCodes();
      user.twoFABackupCodes = JSON.stringify(backupCodes);
      await user.save();

      res.json({ 
        message: 'Códigos de backup regenerados com sucesso',
        backupCodes 
      });
    } catch (error) {
      console.error('Erro ao regenerar códigos de backup:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = TwoFAController;
