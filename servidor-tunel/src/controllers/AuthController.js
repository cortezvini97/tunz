const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const EmailService = require('../services/EmailService');

class AuthController {
  async login(req, res) {
    try {
      const { email, password, twoFAToken, backupCode } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Dados incompletos',
          message: 'Email e senha são obrigatórios'
        });
      }

      // Buscar usuário
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        return res.status(401).json({
          error: 'Credenciais inválidas',
          message: 'Email ou senha incorretos'
        });
      }

      // Verificar se a conta está ativa
      if (user.isActive === null) {
        return res.status(403).json({
          error: 'Conta pendente',
          message: 'Sua conta está aguardando aprovação do administrador'
        });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          error: 'Conta desativada',
          message: 'Sua conta foi desativada. Entre em contato com o administrador'
        });
      }

      // Verificar senha
      const isValidPassword = await user.validatePassword(password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Credenciais inválidas',
          message: 'Email ou senha incorretos'
        });
      }

      // Verificar 2FA se habilitado
      if (user.twoFAEnabled) {
        if (!twoFAToken && !backupCode) {
          return res.status(202).json({
            requiresTwoFA: true,
            message: 'Autenticação de dois fatores necessária'
          });
        }

        let twoFAValid = false;

        if (backupCode) {
          twoFAValid = user.verifyBackupCode(backupCode);
          if (twoFAValid) {
            await user.save(); // Salvar para remover o código usado
          }
        } else if (twoFAToken) {
          twoFAValid = user.verify2FAToken(twoFAToken);
        }

        if (!twoFAValid) {
          return res.status(401).json({
            error: 'Token 2FA inválido',
            message: 'Código de autenticação inválido'
          });
        }
      }

      // Atualizar último login
      await user.update({ lastLogin: new Date() });

      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        token,
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao processar login'
      });
    }
  }

  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          error: 'Dados incompletos',
          message: 'Email, senha e nome são obrigatórios'
        });
      }

      // Verificar se usuário já existe
      const existingUser = await User.findOne({ where: { email } });
      
      if (existingUser) {
        return res.status(409).json({
          error: 'Usuário já existe',
          message: 'Este email já está cadastrado'
        });
      }

      // Criar usuário
      const user = await User.create({
        email,
        password,
        name,
        role: 'user',
        isActive: null // Pendente de aprovação
      });

      // Enviar email de boas-vindas
      try {
        await EmailService.sendWelcomeEmail(email, name);
      } catch (emailError) {
        console.error('Erro ao enviar email de boas-vindas:', emailError);
        // Não falhar o registro se o email não for enviado
      }

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao criar usuário'
      });
    }
  }

  async profile(req, res) {
    try {
      res.json({
        success: true,
        user: req.user.toJSON()
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao buscar perfil'
      });
    }
  }

  async verify(req, res) {
    try {
      res.json({
        success: true,
        message: 'Token válido',
        user: req.user.toJSON()
      });
    } catch (error) {
      console.error('Erro na verificação:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao verificar token'
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email obrigatório',
          message: 'Por favor, informe seu email'
        });
      }

      const user = await User.findOne({ where: { email } });

      if (!user) {
        // Por segurança, não revelamos se o email existe
        return res.json({
          success: true,
          message: 'Se o email existe, um link de recuperação foi enviado'
        });
      }

      // Gerar token de recuperação
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      await user.update({
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      });

      // Enviar email de recuperação
      try {
        const emailResult = await EmailService.sendResetPasswordEmail(email, resetToken, user.name);
        
        if (emailResult.success) {
          console.log(`📧 Email de recuperação enviado para ${email}`);
        } else {
          console.error('Erro ao enviar email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de recuperação:', emailError);
      }

      res.json({
        success: true,
        message: 'Link de recuperação enviado para seu email',
        // Em desenvolvimento, mostrar o link
        ...(process.env.NODE_ENV === 'development' && {
          resetLink: `http://localhost:${process.env.PORT || 3000}/reset-password?token=${resetToken}`
        })
      });

    } catch (error) {
      console.error('Erro ao solicitar recuperação:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao processar solicitação'
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: 'Dados incompletos',
          message: 'Token e nova senha são obrigatórios'
        });
      }

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [require('sequelize').Op.gt]: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Token inválido',
          message: 'Token de recuperação inválido ou expirado'
        });
      }

      // Atualizar senha e limpar token
      await user.update({
        password: newPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      res.json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });

    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao redefinir senha'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { name, email, currentPassword, newPassword, twoFAToken, backupCode } = req.body;
      const user = req.user;

      // Se o usuário tem 2FA habilitado, verificar código 2FA
      if (user.twoFAEnabled) {
        if (!twoFAToken && !backupCode) {
          return res.status(202).json({
            requiresTwoFA: true,
            message: 'Código de autenticação necessário para alterar dados do perfil'
          });
        }

        let twoFAValid = false;

        if (backupCode) {
          twoFAValid = user.verifyBackupCode(backupCode);
          if (twoFAValid) {
            await user.save(); // Salvar para remover o código usado
          }
        } else if (twoFAToken) {
          twoFAValid = user.verify2FAToken(twoFAToken);
        }

        if (!twoFAValid) {
          return res.status(401).json({
            error: 'Token 2FA inválido',
            message: 'Código de autenticação inválido'
          });
        }
      }

      // Se está alterando senha, verificar senha atual
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            error: 'Senha atual obrigatória',
            message: 'Para alterar a senha, informe a senha atual'
          });
        }

        const isValidPassword = await user.validatePassword(currentPassword);
        if (!isValidPassword) {
          return res.status(401).json({
            error: 'Senha incorreta',
            message: 'Senha atual incorreta'
          });
        }
      }

      // Verificar se o email já está em uso por outro usuário
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(409).json({
            error: 'Email já cadastrado',
            message: 'Este email já está sendo usado por outro usuário'
          });
        }
      }

      // Atualizar dados
      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (newPassword) updateData.password = newPassword;

      await user.update(updateData);

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao atualizar perfil'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, twoFAToken, backupCode } = req.body;
      const user = req.user;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Dados incompletos',
          message: 'Senha atual e nova senha são obrigatórias'
        });
      }

      // Verificar senha atual primeiro
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Senha incorreta',
          message: 'Senha atual incorreta'
        });
      }

      // Se o usuário tem 2FA habilitado, verificar código 2FA
      if (user.twoFAEnabled) {
        if (!twoFAToken && !backupCode) {
          return res.status(202).json({
            requiresTwoFA: true,
            message: 'Código de autenticação necessário para alterar a senha'
          });
        }

        let twoFAValid = false;

        if (backupCode) {
          twoFAValid = user.verifyBackupCode(backupCode);
          if (twoFAValid) {
            await user.save(); // Salvar para remover o código usado
          }
        } else if (twoFAToken) {
          twoFAValid = user.verify2FAToken(twoFAToken);
        }

        if (!twoFAValid) {
          return res.status(401).json({
            error: 'Token 2FA inválido',
            message: 'Código de autenticação inválido'
          });
        }
      }

      // Atualizar senha
      await user.update({ password: newPassword });

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao alterar senha'
      });
    }
  }

  // Métodos administrativos
  async listUsers(req, res) {
    try {
      const users = await User.findAll({
        order: [['createdAt', 'DESC']]
      });

      res.json(users.map(user => user.toJSON()));

    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao listar usuários'
      });
    }
  }

  async toggleUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Usuário não existe'
        });
      }

      // Não permitir desativar o próprio usuário
      if (user.id === req.user.id) {
        return res.status(400).json({
          error: 'Ação não permitida',
          message: 'Você não pode alterar o status da sua própria conta'
        });
      }

      await user.update({ isActive });

      res.json({
        success: true,
        message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`,
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao alterar status do usuário'
      });
    }
  }
}

module.exports = new AuthController();
