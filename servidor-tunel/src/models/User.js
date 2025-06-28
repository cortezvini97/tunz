const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const crypto = require('crypto');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: null, // null = pendente, true = ativo, false = inativo
    allowNull: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  twoFASecret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  twoFAEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  twoFABackupCodes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// Método para verificar senha
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Método para gerar secret 2FA
User.prototype.generate2FASecret = function() {
  const secret = speakeasy.generateSecret({
    name: `Tunnel System (${this.email})`,
    issuer: 'Tunnel System',
    length: 32
  });
  
  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url
  };
};

// Método para verificar token 2FA
User.prototype.verify2FAToken = function(token) {
  if (!this.twoFASecret) {
    return false;
  }
  
  return speakeasy.totp.verify({
    secret: this.twoFASecret,
    encoding: 'base32',
    token: token,
    window: 2 // Permite tokens de 2 períodos antes/depois
  });
};

// Método para gerar códigos de backup
User.prototype.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
};

// Método para verificar código de backup
User.prototype.verifyBackupCode = function(code) {
  if (!this.twoFABackupCodes) {
    return false;
  }
  
  const codes = JSON.parse(this.twoFABackupCodes);
  const codeIndex = codes.indexOf(code.toUpperCase());
  
  if (codeIndex !== -1) {
    // Remove o código usado
    codes.splice(codeIndex, 1);
    this.twoFABackupCodes = JSON.stringify(codes);
    return true;
  }
  
  return false;
};

// Método para converter para JSON (sem senha e secret 2FA)
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.twoFASecret;
  delete values.twoFABackupCodes;
  return values;
};

module.exports = User;
